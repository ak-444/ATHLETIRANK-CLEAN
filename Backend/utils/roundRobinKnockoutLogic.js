const db = require("../config/database");

/**
 * Handles completion logic for round robin knockout matches,
 * including seeding semifinals, advancing winners/losers,
 * and crowning champions.
 *
 * @param {object} match - Match row from DB.
 * @param {object} options - Additional data.
 * @param {number|null} options.winner_id - Winner team id.
 * @param {{team1?: number, team2?: number}} [options.scores] - Score payload.
 * @param {boolean} [options.is_draw] - True when admin flags draw result.
 * @returns {Promise<object>} Status payload for HTTP response.
 */
async function handleRoundRobinKnockoutMatchCompletion(
  match,
  { winner_id, scores, is_draw }
) {
  const loser_id =
    winner_id === match.team1_id ? match.team2_id : match.team1_id;

  let finalWinnerId = winner_id;
  if (
    match.bracket_type === "round_robin" &&
    (is_draw || (scores?.team1 === scores?.team2))
  ) {
    finalWinnerId = null;
  }

  await db.pool.query(
    `UPDATE matches 
     SET winner_id = ?, status = 'completed', 
         score_team1 = ?, score_team2 = ? 
     WHERE id = ?`,
    [finalWinnerId, scores?.team1 || 0, scores?.team2 || 0, match.id]
  );

  let message = "Match completed successfully";
  let rrComplete = false;
  let knockoutAdvanced = false;
  let tournamentComplete = false;

  if (match.bracket_type === "round_robin") {
    const [allRRMatches] = await db.pool.query(
      `SELECT m.*, 
        t1.id as team1_id, t1.name as team1_name,
        t2.id as team2_id, t2.name as team2_name
       FROM matches m
       LEFT JOIN teams t1 ON m.team1_id = t1.id
       LEFT JOIN teams t2 ON m.team2_id = t2.id
       WHERE m.bracket_id = ? AND m.bracket_type = 'round_robin'
       ORDER BY m.id`,
      [match.bracket_id]
    );

    const completedRRMatches = allRRMatches.filter(
      (m) => m.status === "completed"
    );
    rrComplete = completedRRMatches.length === allRRMatches.length;

    if (rrComplete) {
      const [teams] = await db.pool.query(
        `SELECT t.id, t.name FROM bracket_teams bt
         JOIN teams t ON bt.team_id = t.id
         WHERE bt.bracket_id = ?`,
        [match.bracket_id]
      );

      const standings = {};
      teams.forEach((team) => {
        standings[team.id] = {
          team_id: team.id,
          team_name: team.name,
          played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
        };
      });

      allRRMatches.forEach((m) => {
        if (m.status === "completed" && m.team1_id && m.team2_id) {
          const score1 = m.score_team1 || 0;
          const score2 = m.score_team2 || 0;

          standings[m.team1_id].played++;
          standings[m.team2_id].played++;
          standings[m.team1_id].goals_for += score1;
          standings[m.team1_id].goals_against += score2;
          standings[m.team2_id].goals_for += score2;
          standings[m.team2_id].goals_against += score1;

          if (m.winner_id === m.team1_id) {
            standings[m.team1_id].wins++;
            standings[m.team1_id].points += 3;
            standings[m.team2_id].losses++;
          } else if (m.winner_id === m.team2_id) {
            standings[m.team2_id].wins++;
            standings[m.team2_id].points += 3;
            standings[m.team1_id].losses++;
          } else if (!m.winner_id && score1 === score2) {
            standings[m.team1_id].draws++;
            standings[m.team1_id].points += 1;
            standings[m.team2_id].draws++;
            standings[m.team2_id].points += 1;
          }

          standings[m.team1_id].goal_difference =
            standings[m.team1_id].goals_for -
            standings[m.team1_id].goals_against;
          standings[m.team2_id].goal_difference =
            standings[m.team2_id].goals_for -
            standings[m.team2_id].goals_against;
        }
      });

      const sortedStandings = Object.values(standings).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_difference !== a.goal_difference)
          return b.goal_difference - a.goal_difference;
        if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
        return a.team_name.localeCompare(b.team_name);
      });

      const top4 = sortedStandings.slice(0, 4);

      if (top4.length < 4) {
        return {
          error: {
            status: 400,
            message: "Not enough teams completed matches for knockout stage",
          },
        };
      }

      await db.pool.query(
        `UPDATE matches 
         SET team1_id = ?, team2_id = ? 
         WHERE bracket_id = ? AND bracket_type = 'knockout_semifinal' AND match_order = 0`,
        [top4[0].team_id, top4[3].team_id, match.bracket_id]
      );

      await db.pool.query(
        `UPDATE matches 
         SET team1_id = ?, team2_id = ? 
         WHERE bracket_id = ? AND bracket_type = 'knockout_semifinal' AND match_order = 1`,
        [top4[1].team_id, top4[2].team_id, match.bracket_id]
      );

      message +=
        " - Round Robin complete! Knockout stage seeded with top 4 teams.";
    }
  } else if (match.bracket_type === "knockout_semifinal") {
    const [finalsMatch] = await db.pool.query(
      `SELECT * FROM matches 
       WHERE bracket_id = ? AND bracket_type = 'knockout_final'`,
      [match.bracket_id]
    );

    if (finalsMatch.length > 0) {
      const updateField = match.match_order === 0 ? "team1_id" : "team2_id";
      await db.pool.query(
        `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
        [winner_id, finalsMatch[0].id]
      );
    }

    const [thirdPlaceMatch] = await db.pool.query(
      `SELECT * FROM matches 
       WHERE bracket_id = ? AND bracket_type = 'knockout_third_place'`,
      [match.bracket_id]
    );

    if (thirdPlaceMatch.length > 0) {
      const updateField = match.match_order === 0 ? "team1_id" : "team2_id";
      await db.pool.query(
        `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
        [loser_id, thirdPlaceMatch[0].id]
      );
    }

    knockoutAdvanced = true;
    message += " - Teams advanced to Finals and 3rd Place Match!";
  } else if (match.bracket_type === "knockout_final") {
    await db.pool.query(
      "UPDATE brackets SET winner_team_id = ? WHERE id = ?",
      [winner_id, match.bracket_id]
    );
    tournamentComplete = true;
    message += " - Tournament Champion crowned! 🏆";
  }

  return {
    success: true,
    message,
    rrComplete,
    knockoutAdvanced,
    tournamentComplete,
    finalWinnerId,
    isDraw:
      match.bracket_type === "round_robin" &&
      finalWinnerId === null &&
      scores?.team1 === scores?.team2,
  };
}

module.exports = {
  handleRoundRobinKnockoutMatchCompletion,
};

