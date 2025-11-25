import React, { useState, useEffect } from "react";
import "../../style/Admin_SchedulePage.css";

const Admin_Schedules = ({ sidebarOpen }) => {
  const [activeTab, setActiveTab] = useState("create");
  const [schedules, setSchedules] = useState([]);
  const [events, setEvents] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Filters for view tab
  const [filterEvent, setFilterEvent] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [formData, setFormData] = useState({
    eventId: "",
    bracketId: "",
    matchId: "",
    date: "",
    time: "",
    venue: "",
    description: ""
  });

  // Format round display based on bracket type and round number
  const formatRoundDisplay = (match) => {
    if (!match) return "Unknown Round";
    
    const roundNum = match.round_number;
    const bracketType = match.bracket_type;
    
    if (roundNum === 200) return 'Grand Final';
    if (roundNum === 201) return 'Bracket Reset';
    if (roundNum >= 200 && bracketType === 'championship') {
      return `Championship Round ${roundNum - 199}`;
    }
    
    if (bracketType === 'loser' || (roundNum >= 101 && roundNum < 200)) {
      return `LB Round ${roundNum - 100}`;
    }
    
    if (bracketType === 'winner' || roundNum < 100) {
      return `Round ${roundNum}`;
    }
    
    return `Round ${roundNum}`;
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [eventsRes, bracketsRes, matchesRes, teamsRes] = await Promise.all([
        fetch("http://localhost:5000/api/events").then(res => {
          if (!res.ok) throw new Error('Failed to fetch events');
          return res.json();
        }),
        fetch("http://localhost:5000/api/brackets").then(res => {
          if (!res.ok) throw new Error('Failed to fetch brackets');
          return res.json();
        }),
        fetch("http://localhost:5000/api/matches").then(res => {
          if (!res.ok) throw new Error('Failed to fetch matches');
          return res.json();
        }),
        fetch("http://localhost:5000/api/teams").then(res => {
          if (!res.ok) throw new Error('Failed to fetch teams');
          return res.json();
        })
      ]);

      setEvents(eventsRes);
      setBrackets(bracketsRes);
      setMatches(matchesRes);
      setTeams(teamsRes);

      try {
        const schedulesRes = await fetch("http://localhost:5000/api/schedules");
        if (schedulesRes.ok) {
          const schedulesData = await schedulesRes.json();
          setSchedules(schedulesData);
        }
      } catch (schedulesErr) {
        console.log("Schedules not available yet, continuing without them");
        setSchedules([]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "eventId") {
      setFormData(prev => ({
        ...prev,
        bracketId: "",
        matchId: ""
      }));
    }

    if (name === "bracketId") {
      setFormData(prev => ({
        ...prev,
        matchId: ""
      }));
    }
  };

  const handleClearFilters = () => {
    setFilterEvent("");
    setFilterDate("");
  };

  const normalizeTimeString = (timeStr) => timeStr ? timeStr.slice(0, 5) : "";

  const findScheduleConflict = (date, time, eventId) => {
    const normalizedTime = normalizeTimeString(time);
    if (!date || !normalizedTime) return null;

    const normalizedEventId = Number.isFinite(Number(eventId)) ? Number(eventId) : null;

    return schedules.find((schedule) => {
      const scheduleEventId = Number(schedule.eventId ?? schedule.event_id);
      const matchesEvent = normalizedEventId === null || scheduleEventId === normalizedEventId;
      if (!matchesEvent) return false;

      const scheduleTime = normalizeTimeString(schedule.time || schedule.startTime);
      if (!scheduleTime) return false;

      return schedule.date === date && scheduleTime === normalizedTime;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const scheduleData = {
        eventId: parseInt(formData.eventId),
        bracketId: parseInt(formData.bracketId),
        matchId: parseInt(formData.matchId),
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        description: formData.description
      };

      const normalizedTime = normalizeTimeString(scheduleData.time);
      const conflict = findScheduleConflict(scheduleData.date, normalizedTime, scheduleData.eventId);
      if (conflict) {
        setError("Another match is already scheduled on this date and time. Please choose a different slot.");
        return;
      }

      const payload = { ...scheduleData, time: normalizedTime };

      console.log('Submitting schedule data:', payload);

      const response = await fetch("http://localhost:5000/api/schedules", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        setSchedules(prev => [...prev, result]);
        setFormData({
          eventId: "",
          bracketId: "",
          matchId: "",
          date: "",
          time: "",
          venue: "",
          description: ""
        });
        setActiveTab("view");
        alert("Schedule created successfully!");
      } else {
        setError(result.message || "Failed to create schedule");
      }
    } catch (err) {
      console.error("Error creating schedule:", err);
      setError("Network error: Could not create schedule");
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/schedules/${schedule.id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setSchedules(prev => prev.filter(sch => sch.id !== schedule.id));
        alert("Schedule deleted successfully!");
      } else {
        const result = await response.json();
        alert(result.message || "Error deleting schedule");
      }
    } catch (err) {
      console.error("Error deleting schedule:", err);
      alert("Error deleting schedule");
    }
  };

  // Get filtered schedules for view tab
  const getFilteredSchedules = () => {
    return schedules.filter(schedule => {
      const matchesEvent = !filterEvent || schedule.event_id === parseInt(filterEvent);
      const matchesDate = !filterDate || schedule.date === filterDate;
      
      return matchesEvent && matchesDate;
    });
  };

  const filteredBrackets = formData.eventId 
    ? brackets.filter(b => b.event_id === parseInt(formData.eventId))
    : [];

  const filteredMatches = formData.bracketId 
    ? matches.filter(match => 
        match.bracket_id === parseInt(formData.bracketId) &&
        match.status !== 'hidden' &&
        match.team1_id && match.team2_id
      )
    : [];

  const getTeamNames = (match) => {
    if (!match) return "TBD vs TBD";
    const team1 = teams.find(t => t.id === match.team1_id);
    const team2 = teams.find(t => t.id === match.team2_id);
    return `${team1?.name || "TBD"} vs ${team2?.name || "TBD"}`;
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const groupMatchesByRound = (matchesList) => {
    const grouped = {};
    matchesList.forEach(match => {
      const roundKey = `${match.bracket_type}-${match.round_number}`;
      const roundDisplay = formatRoundDisplay(match);
      if (!grouped[roundKey]) {
        grouped[roundKey] = {
          roundDisplay: roundDisplay,
          matches: []
        };
      }
      grouped[roundKey].matches.push(match);
    });
    return grouped;
  };

  const formatScheduleDateTime = (date, time) => {
    if (!date || !time) return 'Date TBD';
    
    const [year, month, day] = date.split('-');
    const [hours, minutes] = time.split(':');
    
    const dateObj = new Date(year, month - 1, day, hours, minutes);
    
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const filteredSchedulesList = getFilteredSchedules();

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
          <div className="dashboard-header">
            <h1>Schedules Management</h1>
            <p>Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Schedules Management</h1>
          <p>Create and manage tournament schedules</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Tabs */}
            <div className="bracket-tabs">
              <button 
                className={`bracket-tab-button ${activeTab === "create" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("create")}
              >
                Create Schedule
              </button>
              <button 
                className={`bracket-tab-button ${activeTab === "view" ? "bracket-tab-active" : ""}`}
                onClick={() => setActiveTab("view")}
              >
                View Schedules ({schedules.length})
              </button>
            </div>

            {/* Create Schedule */}
            {activeTab === "create" && (
              <div className="bracket-create-section">
                <div className="bracket-form-container">
                  <h2>Create New Schedule</h2>
                  <form className="bracket-form" onSubmit={handleSubmit}>
                    <div className="bracket-form-group">
                      <label htmlFor="eventId">Select Event *</label>
                      <select
                        id="eventId"
                        name="eventId"
                        value={formData.eventId}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Choose an event</option>
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>
                            {ev.name} ({new Date(ev.start_date).toLocaleDateString()} - {new Date(ev.end_date).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                      {events.length === 0 && !loading && (
                        <small style={{ color: '#ef4444', marginTop: '4px' }}>
                          No events available. Please create events first.
                        </small>
                      )}
                    </div>

                    {formData.eventId && (
                      <div className="bracket-form-group">
                        <label htmlFor="bracketId">Select Bracket *</label>
                        <select
                          id="bracketId"
                          name="bracketId"
                          value={formData.bracketId}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Choose a bracket</option>
                          {filteredBrackets.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({capitalize(b.sport_type)} - {b.elimination_type === 'single' ? 'Single' : 'Double'} Elimination)
                            </option>
                          ))}
                        </select>
                        {filteredBrackets.length === 0 && formData.eventId && (
                          <small style={{ color: '#ef4444', marginTop: '4px' }}>
                            No brackets available for this event.
                          </small>
                        )}
                      </div>
                    )}

                    {formData.bracketId && (
                      <div className="bracket-form-group">
                        <label htmlFor="matchId">Select Match *</label>
                        {filteredMatches.length === 0 ? (
                          <div style={{ 
                            padding: '12px', 
                            background: '#f8f9fa', 
                            borderRadius: '4px', 
                            textAlign: 'center',
                            border: '1px dashed #ddd'
                          }}>
                            No available matches. Matches need both teams assigned and cannot be hidden.
                          </div>
                        ) : (
                          <>
                            <select
                              id="matchId"
                              name="matchId"
                              value={formData.matchId}
                              onChange={handleInputChange}
                              required
                            >
                              <option value="">Choose a match</option>
                              {Object.entries(groupMatchesByRound(filteredMatches)).map(([roundKey, roundData]) => (
                                <optgroup key={roundKey} label={roundData.roundDisplay}>
                                  {roundData.matches.map(match => (
                                    <option key={match.id} value={match.id}>
                                      {getTeamNames(match)}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                              {filteredMatches.length} match(es) available - grouped by round
                            </small>
                          </>
                        )}
                      </div>
                    )}

                    <div className="bracket-form-row">
                      <div className="bracket-form-group">
                        <label htmlFor="date">Date *</label>
                        <input 
                          type="date" 
                          id="date"
                          name="date" 
                          value={formData.date} 
                          onChange={handleInputChange} 
                          required 
                        />
                      </div>

                      <div className="bracket-form-group">
                        <label htmlFor="time">Time *</label>
                        <input 
                          type="time" 
                          id="time"
                          name="time" 
                          value={formData.time} 
                          onChange={handleInputChange} 
                          required 
                        />
                      </div>
                    </div>

                    <div className="bracket-form-group">
                      <label htmlFor="venue">Venue *</label>
                      <input 
                        type="text" 
                        id="venue"
                        name="venue" 
                        placeholder="e.g., Main Gymnasium, Court 1" 
                        value={formData.venue} 
                        onChange={handleInputChange} 
                        required 
                      />
                    </div>

                    <div className="bracket-form-group">
                      <label htmlFor="description">Additional Notes</label>
                      <textarea 
                        id="description"
                        name="description" 
                        value={formData.description} 
                        onChange={handleInputChange} 
                        placeholder="Optional: Add any special instructions or notes about this match" 
                        rows="3" 
                      />
                    </div>

                    <div className="bracket-form-actions">
                      <button 
                        type="submit" 
                        className="bracket-submit-btn"
                        disabled={!formData.eventId || !formData.bracketId || !formData.matchId || !formData.date || !formData.time || !formData.venue}
                      >
                        Save Schedule
                      </button>
                      <button 
                        type="button" 
                        className="bracket-cancel-btn"
                        onClick={() => setFormData({
                          eventId: "",
                          bracketId: "",
                          matchId: "",
                          date: "",
                          time: "",
                          venue: "",
                          description: ""
                        })}
                      >
                        Clear Form
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* View Schedules */}
            {activeTab === "view" && (
              <>
                {/* Filters Section */}
                <div className="bracket-filters-section">
                  <div className="bracket-filters">
                    <div className="filter-group">
                      <label htmlFor="filterEvent">Event:</label>
                      <select
                        id="filterEvent"
                        value={filterEvent}
                        onChange={(e) => setFilterEvent(e.target.value)}
                      >
                        <option value="">All Events</option>
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>
                            {ev.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label htmlFor="filterDate">Date:</label>
                      <input
                        type="date"
                        id="filterDate"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                      />
                    </div>

                    <button className="clear-filters-btn" onClick={handleClearFilters}>
                      Clear Filters
                    </button>
                  </div>
                </div>

                <div className="bracket-view-section">
                  <h2>All Schedules</h2>
                  {filteredSchedulesList.length === 0 ? (
                    <div className="bracket-no-brackets">
                      <p>No schedules found.</p>
                    </div>
                  ) : (
                    <div className="bracket-grid">
                      {filteredSchedulesList.map((schedule) => (
                        <div key={schedule.id} className="bracket-card schedule-card">
                          <div className="bracket-card-header">
                            <h3>
                              {schedule.team1_name && schedule.team2_name 
                                ? `${schedule.team1_name} vs ${schedule.team2_name}`
                                : "Match Details TBD"
                              }
                            </h3>
                            <span className={`bracket-sport-badge bracket-sport-${schedule.sport_type || "default"}`}>
                              {schedule.sport_type ? capitalize(schedule.sport_type) : "Unknown"}
                            </span>
                          </div>
                          <div className="bracket-card-info">
                            <div><strong>Event:</strong> {schedule.event_name || "Unknown"}</div>
                            <div><strong>Bracket:</strong> {schedule.bracket_name || "Unknown"}</div>
                            {schedule.round_number && (
                              <div><strong>Round:</strong> {formatRoundDisplay(schedule)}</div>
                            )}
                            <div><strong>Date & Time:</strong> {formatScheduleDateTime(schedule.date, schedule.time)}</div>
                            <div><strong>Venue:</strong> {schedule.venue}</div>
                            {schedule.description && (
                              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                <strong>Notes:</strong> {schedule.description}
                              </div>
                            )}
                          </div>
                          <div className="bracket-card-actions">
                            <button 
                              className="bracket-delete-btn"
                              onClick={() => handleDeleteSchedule(schedule)}
                            >
                              Delete Schedule
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin_Schedules;
