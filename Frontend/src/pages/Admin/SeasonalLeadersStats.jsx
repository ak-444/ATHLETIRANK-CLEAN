import React, { useState, useEffect } from "react";
import { FaBasketballBall, FaVolleyballBall, FaTrophy } from "react-icons/fa";
import { IoStatsChart } from "react-icons/io5";
import TeamPositionStats from "./TeamPositionStats.jsx"; // Import the new component
import "../../style/SeasonalLeadersStats.css";

const SeasonalLeadersStats = ({ sidebarOpen }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [brackets, setBrackets] = useState([]);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [leaderboards, setLeaderboards] = useState({
    points: [],
    rebounds: [],
    assists: [],
    blocks: [],
    steals: [],
    kills: [],
    digs: [],
    serviceAces: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [topEfficiency, setTopEfficiency] = useState([]);

  const formatDecimal = (value, digits = 1) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(digits) : Number(0).toFixed(digits);
  };

  const safeNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  // Calculate basketball MVP efficiency score
  // Formula: MVP Score = PPG + RPG + APG + SPG + BPG - TOV
  const calculateBasketballMVPScore = (player) => {
    const ppg = safeNumber(player.ppg);
    const rpg = safeNumber(player.rpg);
    const apg = safeNumber(player.apg);
    const spg = safeNumber(player.spg);
    const bpg = safeNumber(player.bpg);
    const tpg = safeNumber(player.tpg);
    
    return ppg + rpg + apg + spg + bpg - tpg;
  };

  // Fetch all events on mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch brackets when event changes
  useEffect(() => {
    if (selectedEvent) {
      fetchBrackets();
    }
  }, [selectedEvent]);

  // Fetch leaders when bracket changes
  useEffect(() => {
    if (selectedBracket) {
      fetchSeasonalLeaders();
    }
  }, [selectedBracket]);

  const fetchEvents = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/stats/events");
      const data = await res.json();
      setEvents(data);
      if (data.length > 0) {
        setSelectedEvent(data[0]);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Failed to load events");
    }
  };

  const fetchBrackets = async () => {
    if (!selectedEvent) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/events/${selectedEvent.id}/brackets`);
      const data = await res.json();
      console.log("Fetched brackets:", data);
      setBrackets(data);
      
      // Auto-select first bracket if available
      if (data.length > 0) {
        setSelectedBracket(data[0]);
      } else {
        setSelectedBracket(null);
        setError("No brackets found for this event");
      }
    } catch (err) {
      console.error("Error fetching brackets:", err);
      setError("Failed to load brackets");
      setBrackets([]);
      setSelectedBracket(null);
    }
  };

  const fetchSeasonalLeaders = async () => {
    if (!selectedEvent || !selectedBracket) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch player statistics filtered by bracket
      const res = await fetch(
        `http://localhost:5000/api/stats/events/${selectedEvent.id}/players-statistics?bracketId=${selectedBracket.id}`
      );
      const data = await res.json();
      
      console.log("Player statistics for bracket:", data);
      
      const sportType = selectedBracket.sport_type;
      
      let efficiencyList = [];

      if (sportType === "basketball") {
        setLeaderboards({
          points: [...data].sort((a, b) => (b.ppg || 0) - (a.ppg || 0)).slice(0, 5),
          rebounds: [...data].sort((a, b) => (b.rpg || 0) - (a.rpg || 0)).slice(0, 5),
          assists: [...data].sort((a, b) => (b.apg || 0) - (a.apg || 0)).slice(0, 5),
          blocks: [...data].sort((a, b) => (b.bpg || 0) - (a.bpg || 0)).slice(0, 5),
          steals: [...data].sort((a, b) => (b.spg || 0) - (a.spg || 0)).slice(0, 5),
        });

        efficiencyList = [...data]
          .map(player => ({
            ...player,
            efficiencyScore: calculateBasketballMVPScore(player)
          }))
          .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
          .slice(0, 10);
      } else if (sportType === "volleyball") {
        setLeaderboards({
          kills: [...data].sort((a, b) => (b.kills || 0) - (a.kills || 0)).slice(0, 5),
          digs: [...data].sort((a, b) => (b.digs || 0) - (a.digs || 0)).slice(0, 5),
          assists: [...data].sort((a, b) => (b.assists || 0) - (a.assists || 0)).slice(0, 5),
          blocks: [...data].sort((a, b) => (b.blocks || 0) - (a.blocks || 0)).slice(0, 5),
          serviceAces: [...data].sort((a, b) => (b.service_aces || 0) - (a.service_aces || 0)).slice(0, 5),
        });

        efficiencyList = [];
      }

      setTopEfficiency(efficiencyList);
    } catch (err) {
      console.error("Error fetching seasonal leaders:", err);
      setError("Failed to load seasonal leaders");
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderCard = (title, leaders, statKey, icon) => {
    return (
      <div className="seasonal-leader-card">
        <div className="seasonal-leader-card-header">
          <h3 className="seasonal-leader-card-title">
            {icon && <span className="seasonal-leader-icon">{icon}</span>}
            {title}
          </h3>
        </div>
        <div className="seasonal-leader-card-body">
          {!leaders || leaders.length === 0 ? (
            <div className="seasonal-no-data">No data available</div>
          ) : (
            <ul className="seasonal-leader-list">
              {leaders.map((leader, index) => (
                <li key={leader.id} className="seasonal-leader-item">
                  <div className="seasonal-leader-rank">
                    <span className={`seasonal-rank-badge seasonal-rank-${index + 1}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="seasonal-leader-info">
                    <div className="seasonal-leader-name">{leader.name}</div>
                    <div className="seasonal-leader-team">{leader.team_name}</div>
                  </div>
                  <div className="seasonal-leader-stat">
                    {typeof leader[statKey] === 'number' 
                      ? leader[statKey].toFixed(1) 
                      : leader[statKey] || '0.0'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard seasonal-leaders-page">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>Seasonal Leaders</h1>
            <p>Top performers per tournament</p>
          </div>
        </div>

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Controls */}
            <div className="seasonal-controls">
              <div className="seasonal-control-group">
                <label className="seasonal-control-label">Select Event:</label>
                <select
                  value={selectedEvent?.id || ""}
                  onChange={(e) => {
                    const event = events.find(ev => ev.id === parseInt(e.target.value));
                    setSelectedEvent(event);
                    setSelectedBracket(null); // Reset bracket selection
                  }}
                  className="seasonal-control-select"
                >
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bracket dropdown - only show if there are available brackets */}
              {brackets.length > 0 && (
                <div className="seasonal-control-group">
                  <label className="seasonal-control-label">Select Sport:</label>
                  <select
                    value={selectedBracket?.id || ""}
                    onChange={(e) => {
                      const bracket = brackets.find(br => br.id === parseInt(e.target.value));
                      setSelectedBracket(bracket);
                    }}
                    className="seasonal-control-select"
                  >
                    {brackets.map(bracket => (
                      <option key={bracket.id} value={bracket.id}>
                        {bracket.name} ({bracket.sport_type?.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="seasonal-loading">
                <div className="seasonal-spinner"></div>
                <p>Loading seasonal leaders...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="seasonal-error">
                <p>{error}</p>
              </div>
            )}

            {/* No Brackets Available Message */}
            {!loading && !error && selectedEvent && brackets.length === 0 && (
              <div className="seasonal-error">
                <p>No brackets available for this event.</p>
              </div>
            )}

            {/* No Bracket Selected Message */}
            {!loading && !error && selectedEvent && brackets.length > 0 && !selectedBracket && (
              <div className="seasonal-error">
                <p>Please select a bracket to view statistics.</p>
              </div>
            )}

            {/* Leaderboards Grid */}
            {!loading && !error && selectedEvent && selectedBracket && (
              <>
                <div className="seasonal-leaders-grid">
                  {selectedBracket.sport_type === "basketball" ? (
                    <>
                      {renderLeaderCard("POINTS", leaderboards.points, "ppg", "🏀")}
                      {renderLeaderCard("REBOUNDS", leaderboards.rebounds, "rpg", "🏀")}
                      {renderLeaderCard("ASSISTS", leaderboards.assists, "apg", "🏀")}
                      {renderLeaderCard("BLOCKS", leaderboards.blocks, "bpg", "🛡️")}
                      {renderLeaderCard("STEALS", leaderboards.steals, "spg", "🤲")}
                    </>
                  ) : (
                    <>
                      {renderLeaderCard("KILLS", leaderboards.kills, "kills", "⚡")}
                      {renderLeaderCard("DIGS", leaderboards.digs, "digs", "🏐")}
                      {renderLeaderCard("ASSISTS", leaderboards.assists, "assists", "🤝")}
                      {renderLeaderCard("BLOCKS", leaderboards.blocks, "blocks", "🛡️")}
                      {renderLeaderCard("SERVICE ACES", leaderboards.serviceAces, "service_aces", "🎯")}
                    </>
                  )}
                </div>

                {selectedBracket.sport_type === "basketball" && topEfficiency.length > 0 && (
                  <div className="seasonal-position-stats seasonal-efficiency-section">
                    <div className="seasonal-position-header">
                      <h2 className="seasonal-position-title">Top 10 Efficiency Leaders</h2>
                      <p className="seasonal-position-subtitle">
                        Players with the highest all-around impact based on official efficiency formulas.
                      </p>
                    </div>

                    <div className="seasonal-position-table-container">
                      <table className="seasonal-position-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Team</th>
                            <th>Player</th>
                            <th className="text-center">Jersey</th>
                            <th className="text-center">Games</th>
                            {selectedBracket.sport_type === "basketball" ? (
                              <>
                                <th className="text-center">PPG</th>
                                <th className="text-center">RPG</th>
                                <th className="text-center">APG</th>
                              </>
                            ) : (
                              <>
                                <th className="text-center">Kills</th>
                                <th className="text-center">Assists</th>
                                <th className="text-center">Digs</th>
                                <th className="text-center">Blocks</th>
                              </>
                            )}
                            <th className="text-center">EFF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topEfficiency.map((player, index) => (
                            <tr key={player.id} className={index < 3 ? "top-three" : ""}>
                              <td>
                                <span className={`seasonal-rank-badge seasonal-rank-${index + 1}`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td>
                                <span className="seasonal-position-team">{player.team_name || "—"}</span>
                              </td>
                              <td>
                                <span className="seasonal-position-player">{player.name}</span>
                                <div className="seasonal-leader-team">{player.position || "—"}</div>
                              </td>
                              <td className="text-center">
                                <span className="seasonal-position-jersey">#{player.jersey_number || "--"}</span>
                              </td>
                              <td className="text-center">
                                <span className="seasonal-position-stat-value">
                                  {player.games_played || 0}
                                </span>
                              </td>
                              {selectedBracket.sport_type === "basketball" ? (
                                <>
                                  <td className="text-center">
                                    <span className="seasonal-position-stat-value">{formatDecimal(player.ppg)}</span>
                                  </td>
                                  <td className="text-center">
                                    <span className="seasonal-position-stat-value">{formatDecimal(player.rpg)}</span>
                                  </td>
                                  <td className="text-center">
                                    <span className="seasonal-position-stat-value">{formatDecimal(player.apg)}</span>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="text-center">
                                    <span className="seasonal-position-stat-value">{player.kills || 0}</span>
                                  </td>
                                  <td className="text-center">
                                    <span className="seasonal-position-stat-value">{player.assists || 0}</span>
                                  </td>
                                  <td className="text-center">
                                    <span className="seasonal-position-stat-value">{player.digs || 0}</span>
                                  </td>
                                  <td className="text-center">
                                    <span className="seasonal-position-stat-value">{player.blocks || 0}</span>
                                  </td>
                                </>
                              )}
                              <td className="text-center">
                                <span className="seasonal-position-stat-value">
                                  {formatDecimal(player.efficiencyScore)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {topEfficiency.length > 0 && (
                      <div className="seasonal-position-summary">
                        <div className="seasonal-position-summary-card">
                          <div className="seasonal-position-summary-label">🏆 Efficiency Leader</div>
                          <div className="seasonal-position-summary-value">{topEfficiency[0].name}</div>
                          <div className="seasonal-position-summary-team">{topEfficiency[0].team_name}</div>
                        </div>
                        <div className="seasonal-position-summary-card">
                          <div className="seasonal-position-summary-label">📈 Avg EFF (Top 10)</div>
                          <div className="seasonal-position-summary-value-large">
                            {formatDecimal(
                              topEfficiency.reduce(
                                (sum, player) => sum + safeNumber(player.efficiencyScore),
                                0
                              ) / topEfficiency.length
                            )}
                          </div>
                        </div>
                        <div className="seasonal-position-summary-card">
                          <div className="seasonal-position-summary-label">👥 Teams Represented</div>
                          <div className="seasonal-position-summary-value-large">
                            {new Set(topEfficiency.map(player => player.team_name)).size}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Team Position Stats - Only show for volleyball */}
                <TeamPositionStats 
                  selectedEvent={selectedEvent}
                  selectedBracket={selectedBracket}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonalLeadersStats;