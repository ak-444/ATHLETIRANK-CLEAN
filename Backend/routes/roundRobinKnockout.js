const express = require("express");
const router = express.Router();
const db = require("../config/database");
const fisherYatesShuffle = require("../utils/fisherYates");
const {
  handleRoundRobinKnockoutMatchCompletion,
} = require("../utils/roundRobinKnockoutLogic");

// ============================================
// ROUND ROBIN + KNOCKOUT HELPER FUNCTIONS
// ============================================

// Generate round robin matches using circle method algorithm
function generateRoundRobinMatches(teams) {
  const shuffledTeams = fisherYatesShuffle([...teams]);
  const n = shuffledTeams.length;
  const rounds = [];
  
  // If odd number of teams, add a BYE
  const teamsList = [...shuffledTeams];
  if (n % 2 === 1) {
    teamsList.push(null); // null represents BYE
  }
  
  const totalTeams = teamsList.length;
  const numRounds = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;
  
  // Circle method algorithm
  for (let round = 0; round < numRounds; round++) {
    const roundMatches = [];
    
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teamsList[match];
      const away = teamsList[totalTeams - 1 - match];
      
      // Only add match if both teams exist (skip BYE matches)
      if (home && away) {
        roundMatches.push({
          team1: home,
          team2: away,
          round: round + 1
        });
      }
    }
    
    rounds.push(roundMatches);
    
    // Rotate teams (keep first team fixed, rotate others)
    teamsList.splice(1, 0, teamsList.pop());
  }
  
  return rounds;
}

// Calculate standings for round robin
function calculateStandings(matches, teams, options = {}) {
  const placementOverrides = options.placementOverrides || null;
  const standings = {};
  
  // Initialize standings
  teams.forEach(team => {
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
      goal_difference: 0
    };
  });
  
  // Process completed matches
  matches.forEach(match => {
    if (match.status === 'completed') {
      const team1_id = match.team1_id;
      const team2_id = match.team2_id;
      
      if (team1_id && team2_id && standings[team1_id] && standings[team2_id]) {
        standings[team1_id].played++;
        standings[team2_id].played++;
        
        const score1 = match.score_team1 || 0;
        const score2 = match.score_team2 || 0;
        
        standings[team1_id].goals_for += score1;
        standings[team1_id].goals_against += score2;
        standings[team2_id].goals_for += score2;
        standings[team2_id].goals_against += score1;
        
        if (match.winner_id === team1_id) {
          standings[team1_id].wins++;
          standings[team1_id].points += 3;
          standings[team2_id].losses++;
        } else if (match.winner_id === team2_id) {
          standings[team2_id].wins++;
          standings[team2_id].points += 3;
          standings[team1_id].losses++;
        } else if (match.winner_id === null && score1 === score2) {
          // Draw
          standings[team1_id].draws++;
          standings[team1_id].points += 1;
          standings[team2_id].draws++;
          standings[team2_id].points += 1;
        }
        
        standings[team1_id].goal_difference = 
          standings[team1_id].goals_for - standings[team1_id].goals_against;
        standings[team2_id].goal_difference = 
          standings[team2_id].goals_for - standings[team2_id].goals_against;
      }
    }
  });
  
  // Convert to array and sort
  return Object.values(standings).sort((a, b) => {
    if (placementOverrides) {
      const rankA =
        placementOverrides[a.team_id] !== undefined
          ? placementOverrides[a.team_id]
          : Infinity;
      const rankB =
        placementOverrides[b.team_id] !== undefined
          ? placementOverrides[b.team_id]
          : Infinity;
      if (rankA !== rankB) return rankA - rankB;
    }
    // Sort by points first
    if (b.points !== a.points) return b.points - a.points;
    // Then by goal difference
    if (b.goal_difference !== a.goal_difference) 
      return b.goal_difference - a.goal_difference;
    // Then by goals scored
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    // Finally alphabetically by name
    return a.team_name.localeCompare(b.team_name);
  });
}

// ============================================
// ROUTES
// ============================================

// POST generate round robin + knockout bracket
router.post("/:id/generate", async (req, res) => {
  const bracketId = req.params.id;

  try {
    // Clear existing matches and reset bracket winner
    await db.pool.query("DELETE FROM matches WHERE bracket_id = ?", [bracketId]);
    await db.pool.query(
      "UPDATE brackets SET winner_team_id = NULL WHERE id = ?", 
      [bracketId]
    );

    // Fetch bracket info
    const [bracketInfo] = await db.pool.query(
      "SELECT elimination_type FROM brackets WHERE id = ?",
      [bracketId]
    );
    
    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }
    
    const eliminationType = bracketInfo[0].elimination_type;
    
    // Verify it's a round robin + knockout bracket
    if (eliminationType !== "round_robin_knockout") {
      return res.status(400).json({ 
        error: "This endpoint is only for round robin + knockout brackets" 
      });
    }

    // Fetch teams in this bracket
    const [teams] = await db.pool.query(
      `SELECT t.id, t.name, t.sport
       FROM bracket_teams bt
       JOIN teams t ON bt.team_id = t.id
       WHERE bt.bracket_id = ?`,
      [bracketId]
    );

    if (teams.length < 4) {
      return res.status(400).json({ 
        error: "At least 4 teams are required for Round Robin + Knockout format" 
      });
    }

    if (teams.length > 10) {
      return res.status(400).json({ 
        error: "Maximum 10 teams supported for Round Robin + Knockout" 
      });
    }

    console.log(`Generating Round Robin + Knockout for ${teams.length} teams`);

    // ===== PHASE 1: ROUND ROBIN =====
    const rrRounds = generateRoundRobinMatches(teams);
    const allMatches = [];

    // Insert Round Robin matches
    for (let roundIndex = 0; roundIndex < rrRounds.length; roundIndex++) {
      const roundMatches = rrRounds[roundIndex];
      
      for (let matchIndex = 0; matchIndex < roundMatches.length; matchIndex++) {
        const match = roundMatches[matchIndex];
        
        const matchData = {
          bracket_id: bracketId,
          round_number: roundIndex + 1,
          bracket_type: 'round_robin',
          team1_id: match.team1.id,
          team2_id: match.team2.id,
          winner_id: null,
          status: "scheduled",
          match_order: matchIndex
        };

        const [result] = await db.pool.query(
          `INSERT INTO matches 
           (bracket_id, round_number, bracket_type, team1_id, team2_id, 
            winner_id, status, match_order) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            matchData.bracket_id, 
            matchData.round_number, 
            matchData.bracket_type,
            matchData.team1_id, 
            matchData.team2_id, 
            matchData.winner_id,
            matchData.status, 
            matchData.match_order
          ]
        );

        matchData.id = result.insertId;
        allMatches.push(matchData);
      }
    }

    // ===== PHASE 2: KNOCKOUT (SEMIFINALS + FINALS) =====
    // Create placeholders for knockout matches
    // Top 4 teams will be determined after round robin completes
    
    // Semifinal 1: Rank 1 vs Rank 4
    const [sf1Result] = await db.pool.query(
      `INSERT INTO matches 
       (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bracketId, 1, 'knockout_semifinal', null, null, null, 'scheduled', 0]
    );
    allMatches.push({
      id: sf1Result.insertId,
      bracket_id: bracketId,
      round_number: 1,
      bracket_type: 'knockout_semifinal',
      team1_id: null,
      team2_id: null,
      winner_id: null,
      status: 'scheduled',
      match_order: 0
    });

    // Semifinal 2: Rank 2 vs Rank 3
    const [sf2Result] = await db.pool.query(
      `INSERT INTO matches 
       (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bracketId, 1, 'knockout_semifinal', null, null, null, 'scheduled', 1]
    );
    allMatches.push({
      id: sf2Result.insertId,
      bracket_id: bracketId,
      round_number: 1,
      bracket_type: 'knockout_semifinal',
      team1_id: null,
      team2_id: null,
      winner_id: null,
      status: 'scheduled',
      match_order: 1
    });

    // Finals: Winner SF1 vs Winner SF2
    const [finalsResult] = await db.pool.query(
      `INSERT INTO matches 
       (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bracketId, 2, 'knockout_final', null, null, null, 'scheduled', 0]
    );
    allMatches.push({
      id: finalsResult.insertId,
      bracket_id: bracketId,
      round_number: 2,
      bracket_type: 'knockout_final',
      team1_id: null,
      team2_id: null,
      winner_id: null,
      status: 'scheduled',
      match_order: 0
    });

    // Third Place Match: Loser SF1 vs Loser SF2
    const [thirdPlaceResult] = await db.pool.query(
      `INSERT INTO matches 
       (bracket_id, round_number, bracket_type, team1_id, team2_id, winner_id, status, match_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bracketId, 2, 'knockout_third_place', null, null, null, 'scheduled', 1]
    );
    allMatches.push({
      id: thirdPlaceResult.insertId,
      bracket_id: bracketId,
      round_number: 2,
      bracket_type: 'knockout_third_place',
      team1_id: null,
      team2_id: null,
      winner_id: null,
      status: 'scheduled',
      match_order: 1
    });

    console.log(`✅ Generated ${allMatches.length} matches (${rrRounds.length} RR rounds + 4 knockout matches)`);

    res.json({
      success: true,
      message: `Generated ${allMatches.length} matches for Round Robin + Knockout (${teams.length} teams)`,
      matches: allMatches,
      elimination_type: eliminationType,
      team_count: teams.length,
      rr_round_count: rrRounds.length,
      knockout_matches: 4
    });

  } catch (err) {
    console.error("Error generating Round Robin + Knockout bracket:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// POST complete a match (handles both RR and knockout)
router.post("/matches/:id/complete", async (req, res) => {
  const matchId = req.params.id;
  const { winner_id, scores, is_draw } = req.body;

  try {
    const [matches] = await db.pool.query(
      "SELECT * FROM matches WHERE id = ?",
      [matchId]
    );

    if (matches.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }

    const match = matches[0];
    const result = await handleRoundRobinKnockoutMatchCompletion(match, {
      winner_id,
      scores,
      is_draw,
    });

    if (result?.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    res.json({
      success: true,
      message: result.message,
      rrComplete: result.rrComplete,
      knockoutAdvanced: result.knockoutAdvanced,
      tournamentComplete: result.tournamentComplete,
      is_draw: result.isDraw,
    });
  } catch (err) {
    console.error("Error completing match:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// GET standings for round robin phase
router.get("/:id/standings", async (req, res) => {
  const bracketId = req.params.id;

  try {
    const [matches] = await db.pool.query(
      `SELECT m.*, 
        t1.name as team1_name, 
        t2.name as team2_name,
        w.name as winner_name
       FROM matches m
       LEFT JOIN teams t1 ON m.team1_id = t1.id
       LEFT JOIN teams t2 ON m.team2_id = t2.id
       LEFT JOIN teams w ON m.winner_id = w.id
       WHERE m.bracket_id = ? 
         AND m.bracket_type IN ('round_robin','knockout_semifinal','knockout_final','knockout_third_place')
       ORDER BY 
         CASE m.bracket_type 
           WHEN 'round_robin' THEN 1
           WHEN 'knockout_semifinal' THEN 2
           WHEN 'knockout_final' THEN 3
           WHEN 'knockout_third_place' THEN 4
         END,
         m.round_number, 
         m.match_order`,
      [bracketId]
    );

    const [teams] = await db.pool.query(
      `SELECT t.* FROM bracket_teams bt
       JOIN teams t ON bt.team_id = t.id
       WHERE bt.bracket_id = ?`,
      [bracketId]
    );

    const placementOverrides = {};

    const finalsMatch = matches.find(
      (m) => m.bracket_type === "knockout_final"
    );
    if (finalsMatch && finalsMatch.status === "completed" && finalsMatch.winner_id) {
      placementOverrides[finalsMatch.winner_id] = 1;
      const runnerUp =
        finalsMatch.winner_id === finalsMatch.team1_id
          ? finalsMatch.team2_id
          : finalsMatch.team1_id;
      if (runnerUp) {
        placementOverrides[runnerUp] = 2;
      }
    }

    const thirdPlaceMatch = matches.find(
      (m) => m.bracket_type === "knockout_third_place"
    );
    if (
      thirdPlaceMatch &&
      thirdPlaceMatch.status === "completed" &&
      thirdPlaceMatch.winner_id
    ) {
      placementOverrides[thirdPlaceMatch.winner_id] = 3;
    }

    const standings = calculateStandings(matches, teams, {
      placementOverrides:
        Object.keys(placementOverrides).length > 0
          ? placementOverrides
          : null,
    });

    res.json({
      standings,
      total_matches: matches.length,
      completed_matches: matches.filter(m => m.status === 'completed').length,
      remaining_matches: matches.filter(m => m.status !== 'completed').length,
      included_bracket_types: ['round_robin','knockout_semifinal','knockout_final','knockout_third_place'],
      placement_overrides: placementOverrides
    });
  } catch (err) {
    console.error("Error fetching standings:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// GET all matches for bracket
router.get("/:id/matches", async (req, res) => {
  const bracketId = req.params.id;

  try {
    const [matches] = await db.pool.query(`
      SELECT m.*, 
        t1.name as team1_name, 
        t2.name as team2_name,
        t1.sport as sport,
        w.name as winner_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN teams w ON m.winner_id = w.id
      WHERE m.bracket_id = ?
      ORDER BY 
        CASE m.bracket_type 
          WHEN 'round_robin' THEN 1
          WHEN 'knockout_semifinal' THEN 2
          WHEN 'knockout_final' THEN 3
          WHEN 'knockout_third_place' THEN 4
        END,
        m.round_number, 
        m.match_order
    `, [bracketId]);

    res.json(matches);
  } catch (err) {
    console.error("Error fetching matches:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST manually seed knockout stage
router.post("/:id/seed-knockout", async (req, res) => {
  const bracketId = req.params.id;

  try {
    // Check if all RR matches are complete
    const [allRRMatches] = await db.pool.query(
      `SELECT m.*, 
        t1.id as team1_id, t1.name as team1_name,
        t2.id as team2_id, t2.name as team2_name
       FROM matches m
       LEFT JOIN teams t1 ON m.team1_id = t1.id
       LEFT JOIN teams t2 ON m.team2_id = t2.id
       WHERE m.bracket_id = ? AND m.bracket_type = 'round_robin'`,
      [bracketId]
    );
    
    const completedRRMatches = allRRMatches.filter(m => m.status === 'completed');
    
    if (completedRRMatches.length !== allRRMatches.length) {
      return res.status(400).json({ 
        error: "Not all Round Robin matches are completed",
        completed: completedRRMatches.length,
        total: allRRMatches.length
      });
    }
    
    // Get all teams
    const [teams] = await db.pool.query(
      `SELECT t.id, t.name FROM bracket_teams bt
       JOIN teams t ON bt.team_id = t.id
       WHERE bt.bracket_id = ?`,
      [bracketId]
    );
    
    // Calculate standings
    const standings = {};
    teams.forEach(team => {
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
        goal_difference: 0
      };
    });
    
    allRRMatches.forEach(m => {
      if (m.status === 'completed' && m.team1_id && m.team2_id) {
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
          standings[m.team1_id].goals_for - standings[m.team1_id].goals_against;
        standings[m.team2_id].goal_difference = 
          standings[m.team2_id].goals_for - standings[m.team2_id].goals_against;
      }
    });
    
    const sortedStandings = Object.values(standings).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      return a.team_name.localeCompare(b.team_name);
    });
    
    const top4 = sortedStandings.slice(0, 4);
    
    if (top4.length < 4) {
      return res.status(400).json({ error: "Not enough teams for knockout stage" });
    }
    
    // Update semifinals
    await db.pool.query(
      `UPDATE matches 
       SET team1_id = ?, team2_id = ? 
       WHERE bracket_id = ? AND bracket_type = 'knockout_semifinal' AND match_order = 0`,
      [top4[0].team_id, top4[3].team_id, bracketId]
    );
    
    await db.pool.query(
      `UPDATE matches 
       SET team1_id = ?, team2_id = ? 
       WHERE bracket_id = ? AND bracket_type = 'knockout_semifinal' AND match_order = 1`,
      [top4[1].team_id, top4[2].team_id, bracketId]
    );
    
    res.json({
      success: true,
      message: "Knockout stage seeded successfully!",
      standings: sortedStandings,
      semifinals: [
        { match: 1, team1: top4[0].team_name, team2: top4[3].team_name },
        { match: 2, team1: top4[1].team_name, team2: top4[2].team_name }
      ]
    });
    
  } catch (err) {
    console.error("Error seeding knockout:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// POST reset bracket
router.post("/:id/reset", async (req, res) => {
  const bracketId = req.params.id;

  try {
    await db.pool.query("DELETE FROM matches WHERE bracket_id = ?", [bracketId]);
    await db.pool.query("UPDATE brackets SET winner_team_id = NULL WHERE id = ?", [bracketId]);

    res.json({ success: true, message: "Round Robin + Knockout bracket reset successfully" });
  } catch (err) {
    console.error("Error resetting bracket:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;