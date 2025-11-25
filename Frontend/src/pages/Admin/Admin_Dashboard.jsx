import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTrophy,
  FaUsers,
  FaCalendarAlt,
  FaChartBar,
  FaBasketballBall,
  FaVolleyballBall,
  FaArrowRight,
  FaClock,
  FaFire,
  FaMedal
} from "react-icons/fa";
import "../../style/Admin_Dashboard.css";

const initialSeasonLeaders = {
  players: [],
  statKey: "",
  statLabel: "",
  sport: "",
  bracketName: ""
};

const AdminDashboard = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    events: [],
    teams: [],
    brackets: [],
    recentMatches: [],
    loading: true
  });
  const [seasonLeaders, setSeasonLeaders] = useState(initialSeasonLeaders);

  const fetchSeasonLeadersPreview = async (events, brackets) => {
    if (!events.length || !brackets.length) return initialSeasonLeaders;

    const prioritizedBracket =
      brackets.find(b => events.find(e => e.id === b.event_id)?.status === "ongoing") ||
      brackets[0];
    const eventId = prioritizedBracket.event_id || events[0]?.id;

    if (!eventId) return initialSeasonLeaders;

    try {
      const res = await fetch(
        `http://localhost:5000/api/stats/events/${eventId}/players-statistics?bracketId=${prioritizedBracket.id}`
      );
      const data = await res.json();

      const sportType = prioritizedBracket.sport_type?.toLowerCase();
      const statKey = sportType === "basketball" ? "ppg" : "kills";
      const statLabel = sportType === "basketball" ? "PPG" : "KILLS";

      const players = [...data]
        .map(player => ({
          ...player,
          statValue: Number(player[statKey]) || 0
        }))
        .sort((a, b) => b.statValue - a.statValue)
        .slice(0, 4);

      return {
        players,
        statKey,
        statLabel,
        sport: prioritizedBracket.sport_type,
        bracketName: prioritizedBracket.name
      };
    } catch (err) {
      console.error("Error fetching seasonal leaders:", err);
      return initialSeasonLeaders;
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [eventsRes, teamsRes, bracketsRes] = await Promise.all([
          fetch("http://localhost:5000/api/events"),
          fetch("http://localhost:5000/api/teams"),
          fetch("http://localhost:5000/api/brackets")
        ]);

        const events = await eventsRes.json();
        const teams = await teamsRes.json();
        const brackets = await bracketsRes.json();

        const recentMatchesPromises = brackets.slice(0, 3).map(bracket =>
          fetch(`http://localhost:5000/api/brackets/${bracket.id}/matches`)
            .then(res => res.json())
            .then(matches =>
              matches.map(m => ({
                ...m,
                bracket_name: bracket.name,
                sport_type: bracket.sport_type,
                bracket_id: bracket.id,
                event_id: bracket.event_id
              }))
            )
        );

        const matchesArrays = await Promise.all(recentMatchesPromises);
        const allMatches = matchesArrays.flat();
        const recentMatches = allMatches
          .filter(m => m.status === "completed")
          .sort(
            (a, b) =>
              new Date(b.updated_at || b.scheduled_at) - new Date(a.updated_at || a.scheduled_at)
          )
          .slice(0, 5);

        const leaderData = await fetchSeasonLeadersPreview(events, brackets);

        setDashboardData({
          events,
          teams,
          brackets,
          recentMatches,
          loading: false
        });
        setSeasonLeaders(leaderData);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setDashboardData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, []);

  const { events, teams, brackets, recentMatches, loading } = dashboardData;

  const ongoingEvents = events.filter(e => e.status === "ongoing").length;
  const completedEvents = events.filter(e => e.status === "completed").length;
  const basketballTeams = teams.filter(t => t.sport?.toLowerCase() === "basketball").length;
  const volleyballTeams = teams.filter(t => t.sport?.toLowerCase() === "volleyball").length;
  const totalPlayers = teams.reduce((sum, team) => sum + (team.players?.length || 0), 0);
  const activeBrackets = brackets.filter(b => {
    const event = events.find(e => e.id === b.event_id);
    return event?.status === "ongoing";
  }).length;

  const statsCards = [
    {
      title: "Total Events",
      value: events.length,
      subtitle: `${ongoingEvents} ongoing, ${completedEvents} completed`,
      icon: <FaCalendarAlt />,
      color: "var(--primary-color)"
    },
    {
      title: "Total Teams",
      value: teams.length,
      subtitle: `${basketballTeams} basketball, ${volleyballTeams} volleyball`,
      icon: <FaUsers />,
      color: "#34a853"
    },
    {
      title: "Total Brackets",
      value: brackets.length,
      subtitle: `${activeBrackets} active tournaments`,
      icon: <FaTrophy />,
      color: "#fbbc04"
    },
    {
      title: "Total Players",
      value: totalPlayers,
      subtitle: `Across ${teams.length} teams`,
      icon: <FaChartBar />,
      color: "#ea4335"
    }
  ];

  const handleMatchClick = (match) => {
    const bracket = brackets.find(b => b.id === match.bracket_id);
    const event = events.find(e => e.id === match.event_id);

    const contextData = {
      selectedEvent: event,
      selectedBracket: bracket,
      contentTab: "matches",
      bracketViewType: "list"
    };

    sessionStorage.setItem("adminEventsReturnContext", JSON.stringify(contextData));
    navigate("/AdminDashboard/events");
  };

  const handleBracketClick = (bracket) => {
    const event = events.find(e => e.id === bracket.event_id);
    const contextData = {
      selectedEvent: event,
      selectedBracket: bracket,
      contentTab: "matches",
      bracketViewType: "list",
      expandEventId: event?.id
    };

    sessionStorage.setItem("adminEventsReturnContext", JSON.stringify(contextData));
    navigate("/AdminDashboard/events");
  };

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-text">
              <h1>Admin Dashboard</h1>
              <p>Welcome to your sports management system</p>
            </div>
            <div className="header-decoration">
              <div className="decoration-circle"></div>
              <div className="decoration-circle"></div>
              <div className="decoration-circle"></div>
            </div>
          </div>
        </div>

        <div className="dashboard-main">
          {loading ? (
            <div className="dashboard-loading">
              <p>Loading dashboard data...</p>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                {statsCards.map((card, index) => (
                  <div
                    key={index}
                    className="stat-card stat-card-no-hover"
                    style={{ borderTop: `3px solid ${card.color}` }}
                  >
                    <div className="stat-icon" style={{ color: card.color }}>
                      {card.icon}
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{card.value}</div>
                      <div className="stat-title">{card.title}</div>
                      <div className="stat-subtitle">{card.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-grid dashboard-grid-three">
                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Recent Matches</h2>
                    <button
                      className="view-all-btn"
                      onClick={() => {
                        sessionStorage.setItem(
                          "adminEventsReturnContext",
                          JSON.stringify({
                            contentTab: "matches",
                            bracketViewType: "list"
                          })
                        );
                        navigate("/AdminDashboard/events");
                      }}
                    >
                      View All <FaArrowRight />
                    </button>
                  </div>
                  <div className="section-content">
                    {recentMatches.length === 0 ? (
                      <div className="empty-state">
                        <p>No completed matches yet</p>
                      </div>
                    ) : (
                      <div className="matches-list">
                        {recentMatches.map(match => (
                          <div
                            key={match.id}
                            className="match-item clickable-match"
                            onClick={() => handleMatchClick(match)}
                          >
                            <div className="match-sport-icon">
                              {match.sport_type?.toLowerCase() === "basketball" ? (
                                <FaBasketballBall style={{ color: "#ff6b35" }} />
                              ) : (
                                <FaVolleyballBall style={{ color: "#4ecdc4" }} />
                              )}
                            </div>
                            <div className="match-details">
                              <div className="match-teams">
                                {match.team1_name} vs {match.team2_name}
                              </div>
                              <div className="match-bracket">{match.bracket_name}</div>
                              <div className="match-score-small">
                                {match.score_team1} - {match.score_team2}
                              </div>
                            </div>
                            <div className="match-arrow">
                              <FaArrowRight />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Active Brackets</h2>
                    <button
                      className="view-all-btn"
                      onClick={() => navigate("/AdminDashboard/events")}
                    >
                      View All <FaArrowRight />
                    </button>
                  </div>
                  <div className="section-content">
                    {brackets.length === 0 ? (
                      <div className="empty-state">
                        <p>No brackets created yet</p>
                        <button
                          className="create-btn"
                          onClick={() => navigate("/AdminDashboard/tournament-creator")}
                        >
                          Create First Bracket
                        </button>
                      </div>
                    ) : (
                      <div className="brackets-list">
                        {brackets.slice(0, 4).map(bracket => {
                          const event = events.find(e => e.id === bracket.event_id);
                          return (
                            <div
                              key={bracket.id}
                              className="bracket-item clickable-bracket"
                              onClick={() => handleBracketClick(bracket)}
                            >
                              <div className="bracket-name">{bracket.name}</div>
                              <div className="bracket-meta">
                                {capitalize(bracket.sport_type)} -{" "}
                                {bracket.elimination_type === "single"
                                  ? "Single"
                                  : bracket.elimination_type === "double"
                                  ? "Double"
                                  : "Round Robin"}{" "}
                                Elimination
                              </div>
                              {event?.status === "ongoing" && (
                                <div className="active-badge">
                                  <FaFire /> Active
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Seasonal Leaders</h2>
                    <button
                      className="view-all-btn"
                      onClick={() => navigate("/AdminDashboard/stats")}
                    >
                      View All <FaArrowRight />
                    </button>
                  </div>
                  <div className="section-content season-leaders-content">
                    {seasonLeaders.bracketName && (
                      <div className="leaders-subtitle">
                        {capitalize(seasonLeaders.sport)} - {seasonLeaders.bracketName}
                      </div>
                    )}
                    {seasonLeaders.players.length === 0 ? (
                      <div className="empty-state">
                        <p>No seasonal leaders available yet</p>
                        <button
                          className="create-btn"
                          onClick={() => navigate("/AdminDashboard/stats")}
                        >
                          View Stats
                        </button>
                      </div>
                    ) : (
                      <div className="leader-list">
                        {seasonLeaders.players.map((leader, index) => (
                          <div className="leader-item" key={leader.id || `${leader.name}-${index}`}>
                            <div className="leader-rank">
                              <FaMedal />
                              <span className="rank-number">{index + 1}</span>
                            </div>
                            <div className="leader-info">
                              <div className="leader-name">{leader.name}</div>
                              <div className="leader-team">{leader.team_name || "Team TBA"}</div>
                            </div>
                            <div className="leader-stat">
                              <span className="leader-value">
                                {Number(leader[seasonLeaders.statKey] ?? 0).toFixed(1)}
                              </span>
                              <span className="leader-label">{seasonLeaders.statLabel}</span>
                            </div>
                            <div className="leader-sport-icon">
                              {seasonLeaders.sport?.toLowerCase() === "basketball" ? (
                                <FaBasketballBall />
                              ) : (
                                <FaVolleyballBall />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                  <button
                    className="action-btn"
                    onClick={() => navigate("/AdminDashboard/tournament-creator")}
                  >
                    <FaTrophy />
                    <span>Create Tournament</span>
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => navigate("/AdminDashboard/teams")}
                  >
                    <FaUsers />
                    <span>Manage Teams</span>
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => navigate("/AdminDashboard/events")}
                  >
                    <FaCalendarAlt />
                    <span>View All Events</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
