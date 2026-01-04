const express = require("express");
const router = express.Router();
const db = require("../config/database");

function normalizeStatValue(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

// Helper function to calculate basketball MVP total
// MVP Totals = (Total Points + Total Rebounds + Total Assists + Total Steals + Total Blocks) - (Total Turnovers)
function calculateBasketballMVPScore(stats) {
  const points = normalizeStatValue(stats.total_points);
  const assists = normalizeStatValue(stats.total_assists);
  const rebounds = normalizeStatValue(stats.total_rebounds);
  const steals = normalizeStatValue(stats.total_steals);
  const blocks = normalizeStatValue(stats.total_blocks);
  const turnovers = normalizeStatValue(stats.total_turnovers);

  return (points + rebounds + assists + steals + blocks) - turnovers;
}

// Helper function to calculate volleyball MVP total
// MVP Totals = (Total Ace + Total Kills + Total Assist + Total Blocks + Total Digs + Total Receives)
// – (Total Attack Errors + Total Service Errors + Total Receive Errors)
function calculateVolleyballMVPScore(stats) {
  const A = normalizeStatValue(stats.total_aces);
  const K = normalizeStatValue(stats.total_kills);
  const VA = normalizeStatValue(stats.total_assists);
  const B = normalizeStatValue(stats.total_blocks);
  const D = normalizeStatValue(stats.total_digs);
  const R = normalizeStatValue(stats.total_receptions);

  const AE = normalizeStatValue(stats.total_attack_errors);
  const SE = normalizeStatValue(stats.total_serve_errors);
  const RE = normalizeStatValue(stats.total_reception_errors);

  return (A + K + VA + B + D + R) - (AE + SE + RE);
}

// GET tournament champion and winner team
router.get("/brackets/:bracketId/champion", async (req, res) => {
  try {
    const { bracketId } = req.params;

    const [championData] = await db.pool.query(`
      SELECT 
        b.winner_team_id,
        t.name as winner_team_name,
        b.sport_type,
        b.elimination_type
      FROM brackets b
      LEFT JOIN teams t ON b.winner_team_id = t.id
      WHERE b.id = ?
    `, [bracketId]);

    if (championData.length === 0 || !championData[0].winner_team_id) {
      return res.status(404).json({ 
        message: "Tournament not yet completed or bracket not found" 
      });
    }

    res.json(championData[0]);
  } catch (err) {
    console.error("Error fetching champion:", err);
    res.status(500).json({ error: "Failed to fetch champion data" });
  }
});

// GET MVP and awards for a bracket
router.get("/brackets/:bracketId/mvp-awards", async (req, res) => {
  try {
    const { bracketId } = req.params;

    // First, get bracket info
    const [bracketInfo] = await db.pool.query(`
      SELECT 
        b.winner_team_id,
        b.sport_type,
        b.elimination_type,
        t.name as champion_team_name
      FROM brackets b
      LEFT JOIN teams t ON b.winner_team_id = t.id
      WHERE b.id = ?
    `, [bracketId]);

    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }

    // FIXED: Check if ALL matches in the bracket are completed OR bye
    const [matchesStatus] = await db.pool.query(`
      SELECT 
        COUNT(*) as total_matches,
        COUNT(CASE WHEN status = 'completed' OR status = 'bye' THEN 1 END) as completed_matches,
        COUNT(CASE WHEN status != 'completed' AND status != 'hidden' AND status != 'bye' THEN 1 END) as pending_matches
      FROM matches
      WHERE bracket_id = ?
    `, [bracketId]);

    // Only show awards if ALL matches are completed or bye (no pending matches)
    if (matchesStatus[0].total_matches === 0) {
      return res.json({ 
        awards: null, 
        message: 'No matches found for this bracket' 
      });
    }

    if (matchesStatus[0].pending_matches > 0) {
      return res.json({ 
        awards: null, 
        message: 'Tournament not yet completed. Awards will be available when all matches are finished.',
        completed_matches: matchesStatus[0].completed_matches,
        total_matches: matchesStatus[0].total_matches
      });
    }

    const sportType = bracketInfo[0].sport_type;
    const championTeamId = bracketInfo[0].winner_team_id;
    const championTeamName = bracketInfo[0].champion_team_name;

    // Get all player stats from COMPLETED matches in this bracket
    const statsQuery = sportType === 'basketball' 
      ? `
        SELECT 
          p.id as player_id,
          p.name as player_name,
          p.jersey_number,
          p.position,
          p.team_id,
          t.name as team_name,
          COUNT(DISTINCT ps.match_id) as games_played,
          SUM(ps.points) as total_points,
          SUM(ps.assists) as total_assists,
          SUM(ps.rebounds) as total_rebounds,
          SUM(ps.three_points_made) as total_three_points,
          SUM(ps.steals) as total_steals,
          SUM(ps.blocks) as total_blocks,
          SUM(ps.fouls) as total_fouls,
          SUM(ps.turnovers) as total_turnovers,
          ROUND(AVG(ps.points), 1) as ppg,
          ROUND(AVG(ps.assists), 1) as apg,
          ROUND(AVG(ps.rebounds), 1) as rpg,
          ROUND(AVG(ps.steals), 1) as spg,
          ROUND(AVG(ps.blocks), 1) as bpg,
          ROUND(AVG(ps.turnovers), 1) as tpg
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        JOIN matches m ON ps.match_id = m.id
        WHERE m.bracket_id = ? 
          AND m.status = 'completed'
        GROUP BY p.id, p.name, p.jersey_number, p.position, p.team_id, t.name
        HAVING games_played > 0
      `
      : `
        SELECT 
          p.id as player_id,
          p.name as player_name,
          p.jersey_number,
          p.position,
          p.team_id,
          t.name as team_name,
          COUNT(DISTINCT ps.match_id) as games_played,
          COALESCE((
            SELECT COUNT(*)
            FROM (
              SELECT DISTINCT m2.id, s.set_index
              FROM matches m2
              JOIN player_stats ps2 ON ps2.match_id = m2.id
              JOIN (
                SELECT 0 AS set_index UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
              ) s ON 1=1
              WHERE ps2.player_id = p.id
                AND m2.bracket_id = m.bracket_id
                AND m2.status = 'completed'
                AND (
                  JSON_EXTRACT(ps2.kills_per_set, CONCAT('$[', s.set_index, ']')) > 0 OR
                  JSON_EXTRACT(ps2.service_aces_per_set, CONCAT('$[', s.set_index, ']')) > 0 OR
                  JSON_EXTRACT(ps2.volleyball_assists_per_set, CONCAT('$[', s.set_index, ']')) > 0 OR
                  JSON_EXTRACT(ps2.digs_per_set, CONCAT('$[', s.set_index, ']')) > 0 OR
                  JSON_EXTRACT(ps2.volleyball_blocks_per_set, CONCAT('$[', s.set_index, ']')) > 0 OR
                  JSON_EXTRACT(ps2.serve_errors_per_set, CONCAT('$[', s.set_index, ']')) > 0 OR
                  JSON_EXTRACT(ps2.attack_errors_per_set, CONCAT('$[', s.set_index, ']')) > 0 OR
                  JSON_EXTRACT(ps2.reception_errors_per_set, CONCAT('$[', s.set_index, ']')) > 0 OR
                  JSON_EXTRACT(ps2.assist_errors_per_set, CONCAT('$[', s.set_index, ']')) > 0
                )
            ) set_counts
          ), 0) as total_sets_played,
          SUM(ps.service_aces) as total_aces,
          SUM(ps.kills) as total_kills,
          SUM(ps.volleyball_blocks) as total_blocks,
          SUM(ps.digs) as total_digs,
          SUM(ps.receptions) as total_receptions,
          SUM(ps.volleyball_assists) as total_assists,
          SUM(ps.serve_errors) as total_serve_errors,
          SUM(ps.attack_errors) as total_attack_errors,
          SUM(ps.reception_errors) as total_reception_errors,
          SUM(ps.assist_errors) as total_assist_errors,
          SUM(ps.blocking_errors) as total_blocking_errors,
          SUM(ps.ball_handling_errors) as total_ball_handling_errors,
          SUM(ps.attack_attempts) as total_attack_attempts,
          SUM(ps.serves) as total_serves,
          ROUND(
            (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
             SUM(ps.volleyball_assists) + SUM(ps.digs) + SUM(ps.receptions)) - 
            (SUM(ps.attack_errors) + SUM(ps.serve_errors) + SUM(ps.reception_errors) + 
             SUM(ps.assist_errors) + SUM(ps.blocking_errors) + SUM(ps.ball_handling_errors)),
            1
          ) as efficiency,
          ROUND(
            (SUM(ps.kills) + SUM(ps.volleyball_blocks) + SUM(ps.service_aces) + 
             SUM(ps.volleyball_assists) + SUM(ps.digs) + SUM(ps.receptions)) - 
            (SUM(ps.attack_errors) + SUM(ps.serve_errors) + SUM(ps.reception_errors) + 
             SUM(ps.assist_errors) + SUM(ps.blocking_errors) + SUM(ps.ball_handling_errors)),
            1
          ) as overall_score,
          CASE 
            WHEN SUM(ps.attack_attempts) > 0 
            THEN ROUND((SUM(ps.kills) - SUM(ps.attack_errors)) / SUM(ps.attack_attempts) * 100, 1)
            ELSE 0 
          END as hitting_percentage,
          CASE 
            WHEN (SUM(ps.serves) + SUM(ps.serve_errors)) > 0 
            THEN ROUND(SUM(ps.serves) / (SUM(ps.serves) + SUM(ps.serve_errors)) * 100, 1)
            ELSE 0 
          END as service_percentage,
          CASE 
            WHEN (SUM(ps.receptions) + SUM(ps.reception_errors)) > 0 
            THEN ROUND(SUM(ps.receptions) / (SUM(ps.receptions) + SUM(ps.reception_errors)) * 100, 1)
            ELSE 0 
          END as reception_percentage
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.id
        JOIN teams t ON p.team_id = t.id
        JOIN matches m ON ps.match_id = m.id
        WHERE m.bracket_id = ? 
          AND m.status = 'completed'
        GROUP BY p.id, p.name, p.jersey_number, p.position, p.team_id, t.name
        HAVING games_played > 0
      `;

    const [allPlayerStats] = await db.pool.query(statsQuery, [bracketId]);

    if (allPlayerStats.length === 0) {
      return res.status(404).json({ 
        error: "No player statistics found for this bracket" 
      });
    }

    // Calculate MVP scores and find awards
    let mvpData = null;
    let awards = {};
    let playerStatsResponse = allPlayerStats;

    if (sportType === 'basketball') {
      // Basketball: Calculate MVP totals using summed stats
      const playersWithScores = allPlayerStats.map(player => {
        const totalScore = calculateBasketballMVPScore(player);
        const roundedScore = Number(totalScore.toFixed(1));
        
        return {
          ...player,
          mvp_score: roundedScore,
          mvp_total: roundedScore
        };
      });

      // Sort by MVP total descending
      playersWithScores.sort((a, b) => b.mvp_score - a.mvp_score);

      // MVP is the top player
      mvpData = playersWithScores[0];

      // Mythical 5 are the next 5 players (positions 2-6)
      const mythicalFive = playersWithScores.slice(1, 6);

      awards = {
        mvp: mvpData,
        mythical_five: mythicalFive
      };

      playerStatsResponse = playersWithScores;

    } else {
      // VOLLEYBALL - per-set based formulas
      const playersWithScores = allPlayerStats.map(player => {
        const setsPlayed = player.total_sets_played || player.sets_played || 0;
        const perSet = (total) => setsPlayed > 0 ? Number((total / setsPlayed).toFixed(3)) : 0;

        const kps = perSet(player.total_kills || 0);        // Kill Per Set
        const sas = perSet(player.total_aces || 0);         // Service Ace Per Set
        const aps = perSet(player.total_assists || 0);      // Assist Per Set
        const rps = perSet(player.total_receptions || 0);   // Receive Success Per Set
        const dps = perSet(player.total_digs || 0);         // Dig Per Set
        const bps = perSet(player.total_blocks || 0);       // Block Per Set
        const aes = perSet(player.total_attack_errors || 0);      // Attack Error Per Set
        const ses = perSet(player.total_serve_errors || 0);       // Service Error Per Set
        const res = perSet(player.total_reception_errors || 0);   // Reception Error Per Set
        const bhs = perSet(player.total_ball_handling_errors || 0); // Ball Handling Error Per Set
        const asses = perSet(player.total_assist_errors || 0);     // Assist Error Per Set
        const bes = perSet(player.total_blocking_errors || 0);     // Blocking Error Per Set

        const totalMVPScore = calculateVolleyballMVPScore(player);
        const roundedMVPScore = Number(totalMVPScore.toFixed(1));

        return {
          ...player,
          sets_played: setsPlayed,
          kps, sas, aps, rps, dps, bps,
          aes, ses, res, bhs, asses, bes,
          mvp_score: roundedMVPScore,
          mvp_total: roundedMVPScore
        };
      });

      // Sort by MVP score (highest first)
      playersWithScores.sort((a, b) => b.mvp_score - a.mvp_score);

      // MVP is the top player (no position restriction)
      mvpData = playersWithScores[0];

      const normalizePosition = (position) => {
        if (!position) return '';
        return position.toLowerCase().trim();
      };

      const withScore = (player, score) => ({ 
        ...player, 
        position_score: Number((score || 0).toFixed(3)) 
      });

      // Best Setter: APS – (ASSES + BHS)
      const setters = playersWithScores
        .filter(p => normalizePosition(p.position) === 'setter')
        .map(p => withScore(p, p.aps - (p.asses + p.bhs)))
        .sort((a, b) => b.position_score - a.position_score);

      // Best Libero: DPS + RPS – (RES)
      const liberos = playersWithScores
        .filter(p => {
          const pos = normalizePosition(p.position);
          return pos === 'libero' || pos === 'defensive specialist';
        })
        .map(p => withScore(p, (p.dps + p.rps) - p.res))
        .sort((a, b) => b.position_score - a.position_score);

      // Best Outside Hitter: KPS + BPS + DPS – (AES + SES)
      const outsideHitters = playersWithScores
        .filter(p => normalizePosition(p.position) === 'outside hitter')
        .map(p => withScore(p, (p.kps + p.bps + p.dps) - (p.aes + p.ses)))
        .sort((a, b) => b.position_score - a.position_score);

      // Best Opposite Hitter: KPS + BPS – (AES + BES)
      const oppositeHitters = playersWithScores
        .filter(p => normalizePosition(p.position) === 'opposite hitter')
        .map(p => withScore(p, (p.kps + p.bps) - (p.aes + p.bes)))
        .sort((a, b) => b.position_score - a.position_score);

      // Best Middle Blocker: BPS – (BES)
      const middleBlockers = playersWithScores
        .filter(p => normalizePosition(p.position) === 'middle blocker')
        .map(p => withScore(p, p.bps - p.bes))
        .sort((a, b) => b.position_score - a.position_score);

      awards = {
        mvp: mvpData,
        best_setter: setters[0] || null,
        best_libero: liberos[0] || null,
        best_outside_hitter: outsideHitters[0] || null,
        best_opposite_hitter: oppositeHitters[0] || null,
        best_middle_blocker: middleBlockers[0] || null
      };

      playerStatsResponse = playersWithScores;
    }

    res.json({
      bracket_id: bracketId,
      sport_type: sportType,
      champion_team_id: championTeamId,
      champion_team_name: championTeamName,
      awards: awards,
      all_player_stats: playerStatsResponse
    });

  } catch (err) {
    console.error("Error calculating MVP and awards:", err);
    res.status(500).json({ 
      error: "Failed to calculate MVP and awards: " + err.message 
    });
  }
});

// GET team standings for a bracket
router.get("/brackets/:bracketId/standings", async (req, res) => {
  try {
    const { bracketId } = req.params;

    const [bracketInfo] = await db.pool.query(`
      SELECT sport_type, elimination_type
      FROM brackets
      WHERE id = ?
    `, [bracketId]);

    if (bracketInfo.length === 0) {
      return res.status(404).json({ error: "Bracket not found" });
    }

    const sportType = bracketInfo[0].sport_type;

    if (sportType === 'basketball') {
      const [standings] = await db.pool.query(`
        SELECT 
          t.id,
          t.name as team,
          COUNT(CASE WHEN m.winner_id = t.id THEN 1 END) as wins,
          COUNT(CASE 
            WHEN (m.team1_id = t.id OR m.team2_id = t.id) 
            AND m.status = 'completed' 
            AND m.winner_id != t.id 
            THEN 1 
          END) as losses,
          SUM(CASE WHEN m.team1_id = t.id THEN m.score_team1 ELSE 0 END) +
          SUM(CASE WHEN m.team2_id = t.id THEN m.score_team2 ELSE 0 END) as points_for,
          SUM(CASE WHEN m.team1_id = t.id THEN m.score_team2 ELSE 0 END) +
          SUM(CASE WHEN m.team2_id = t.id THEN m.score_team1 ELSE 0 END) as points_against
        FROM teams t
        JOIN bracket_teams bt ON t.id = bt.team_id
        LEFT JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id)
          AND m.bracket_id = ?
          AND m.status = 'completed'
        WHERE bt.bracket_id = ?
        GROUP BY t.id, t.name
        ORDER BY wins DESC, (points_for - points_against) DESC
      `, [bracketId, bracketId]);

      const rankedStandings = standings.map((team, index) => {
        const totalGames = team.wins + team.losses;
        const winPercentage = totalGames > 0 
          ? (team.wins / totalGames * 100).toFixed(1) 
          : "0.0";
        const pointDiff = team.points_for - team.points_against;

        return {
          position: index + 1,
          ...team,
          point_diff: pointDiff >= 0 ? `+${pointDiff}` : `${pointDiff}`,
          win_percentage: `${winPercentage}%`
        };
      });

      res.json({
        bracket_id: bracketId,
        sport_type: sportType,
        standings: rankedStandings
      });

    } else {
      const [standings] = await db.pool.query(`
        SELECT 
          t.id,
          t.name as team,
          COUNT(CASE WHEN m.winner_id = t.id THEN 1 END) as wins,
          COUNT(CASE 
            WHEN (m.team1_id = t.id OR m.team2_id = t.id) 
            AND m.status = 'completed' 
            AND m.winner_id != t.id 
            THEN 1 
          END) as losses
        FROM teams t
        JOIN bracket_teams bt ON t.id = bt.team_id
        LEFT JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id)
          AND m.bracket_id = ?
          AND m.status = 'completed'
        WHERE bt.bracket_id = ?
        GROUP BY t.id, t.name
        ORDER BY wins DESC, losses ASC
      `, [bracketId, bracketId]);

      const rankedStandings = standings.map((team, index) => {
        const totalGames = team.wins + team.losses;
        const winPercentage = totalGames > 0 
          ? (team.wins / totalGames * 100).toFixed(1) 
          : "0.0";

        return {
          position: index + 1,
          team: team.team,
          wins: team.wins,
          losses: team.losses,
          sets_for: team.wins * 2,
          sets_against: team.losses * 2,
          set_ratio: team.losses > 0 
            ? (team.wins / team.losses).toFixed(2) 
            : team.wins.toFixed(2),
          win_percentage: `${winPercentage}%`
        };
      });

      res.json({
        bracket_id: bracketId,
        sport_type: sportType,
        standings: rankedStandings
      });
    }
  } catch (err) {
    console.error("Error fetching standings:", err);
    res.status(500).json({ 
      error: "Failed to fetch standings: " + err.message 
    });
  }
});

// GET all events with completed brackets for awards display
router.get("/events/completed", async (req, res) => {
  try {
    const [events] = await db.pool.query(`
      SELECT DISTINCT 
        e.id, 
        e.name, 
        e.start_date, 
        e.end_date, 
        e.status
      FROM events e
      JOIN brackets b ON e.id = b.event_id
      WHERE b.winner_team_id IS NOT NULL
      ORDER BY e.end_date DESC
    `);

    res.json(events);
  } catch (err) {
    console.error("Error fetching completed events:", err);
    res.status(500).json({ 
      error: "Failed to fetch completed events" 
    });
  }
});

// GET all events with disclosed awards (for public view)
router.get("/events/completed/public", async (req, res) => {
  try {
    const [events] = await db.pool.query(`
      SELECT DISTINCT 
        e.id, 
        e.name, 
        e.start_date, 
        e.end_date, 
        e.status
      FROM events e
      JOIN brackets b ON e.id = b.event_id
      WHERE b.winner_team_id IS NOT NULL
        AND b.awards_disclosed = TRUE
      ORDER BY e.end_date DESC
    `);

    res.json(events);
  } catch (err) {
    console.error("Error fetching completed events:", err);
    res.status(500).json({ 
      error: "Failed to fetch completed events" 
    });
  }
});

// GET brackets with champions for an event
router.get("/events/:eventId/completed-brackets", async (req, res) => {
  try {
    const { eventId } = req.params;

    const [brackets] = await db.pool.query(`
      SELECT 
        b.id,
        b.name,
        b.sport_type,
        b.elimination_type,
        b.winner_team_id,
        t.name as winner_team_name,
        b.awards_disclosed,
        b.created_at
      FROM brackets b
      LEFT JOIN teams t ON b.winner_team_id = t.id
      WHERE b.event_id = ?
        AND b.winner_team_id IS NOT NULL
      ORDER BY b.created_at DESC
    `, [eventId]);

    res.json(brackets);
  } catch (err) {
    console.error("Error fetching completed brackets:", err);
    res.status(500).json({ 
      error: "Failed to fetch completed brackets" 
    });
  }
});

// GET brackets with disclosed awards for an event (for public view)
router.get("/events/:eventId/completed-brackets/public", async (req, res) => {
  try {
    const { eventId } = req.params;

    const [brackets] = await db.pool.query(`
      SELECT 
        b.id,
        b.name,
        b.sport_type,
        b.elimination_type,
        b.winner_team_id,
        t.name as winner_team_name,
        b.created_at
      FROM brackets b
      LEFT JOIN teams t ON b.winner_team_id = t.id
      WHERE b.event_id = ?
        AND b.winner_team_id IS NOT NULL
        AND b.awards_disclosed = TRUE
      ORDER BY b.created_at DESC
    `, [eventId]);

    res.json(brackets);
  } catch (err) {
    console.error("Error fetching completed brackets:", err);
    res.status(500).json({ 
      error: "Failed to fetch completed brackets" 
    });
  }
});

// PUT update awards disclosure status for a bracket
router.put("/brackets/:bracketId/awards-disclosure", async (req, res) => {
  try {
    const { bracketId } = req.params;
    const { awards_disclosed } = req.body;

    if (typeof awards_disclosed !== 'boolean') {
      return res.status(400).json({ 
        error: "awards_disclosed must be a boolean value" 
      });
    }

    await db.pool.query(`
      UPDATE brackets 
      SET awards_disclosed = ?
      WHERE id = ?
    `, [awards_disclosed, bracketId]);

    res.json({ 
      success: true, 
      message: `Awards ${awards_disclosed ? 'disclosed' : 'hidden'} successfully`,
      awards_disclosed 
    });
  } catch (err) {
    console.error("Error updating awards disclosure:", err);
    res.status(500).json({ 
      error: "Failed to update awards disclosure status" 
    });
  }
});

module.exports = router;