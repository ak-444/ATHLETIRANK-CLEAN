import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCrown, FaChartBar, FaEye, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import CustomBracket from "../../components/CustomBracket";
import DoubleEliminationBracket from "../../components/DoubleEliminationBracket";
import TournamentScheduleList from "../../components/TournamentScheduleList";
import RoundRobinBracketDisplay from "../../components/RoundRobin";
import RoundRobinKnockoutBracket from '../../components/RoundRobinKnockoutBracket';
import "../../style/Staff_Events.css";

const StaffEvents = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [activeTab, setActiveTab] = useState("events");
  const [contentTab, setContentTab] = useState("matches");
  const [matches, setMatches] = useState([]);
  const [bracketMatches, setBracketMatches] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [bracketViewType, setBracketViewType] = useState("bracket"); // Default to "bracket" for staff
const [standings, setStandings] = useState([]);
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Events pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Add state for expanded events
  const [expandedEvents, setExpandedEvents] = useState({});
  const [pendingScrollPosition, setPendingScrollPosition] = useState(null);

  const getScrollPosition = () => {
    if (typeof window === "undefined") return 0;
    return window.scrollY || document.documentElement.scrollTop || 0;
  };

  // Toggle function for expanding events
  const toggleEventExpansion = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // Format round display based on bracket type and round number
  const formatRoundDisplay = (match) => {
    const roundNum = match.round_number;
    
    if (roundNum === 200) return 'Grand Final';
    if (roundNum === 201) return 'Bracket Reset';
    if (match.bracket_type === 'championship') {
      return `Championship Round ${roundNum - 199}`;
    }
    
    if (match.bracket_type === 'loser' || (roundNum >= 101 && roundNum < 200)) {
      return `LB Round ${roundNum - 100}`;
    }
    
    if (match.bracket_type === 'winner' || roundNum < 100) {
      return `Round ${roundNum}`;
    }
    
    return `Round ${roundNum}`;
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  // Fetch events with brackets
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://localhost:5000/api/events");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      // Fetch brackets for each event
      const eventsWithBrackets = await Promise.all(
        data.map(async (event) => {
          try {
            const bracketsRes = await fetch(`http://localhost:5000/api/events/${event.id}/brackets`);
            const brackets = await bracketsRes.json();
            return { ...event, brackets: brackets || [] };
          } catch (err) {
            console.error(`Error fetching brackets for event ${event.id}:`, err);
            return { ...event, brackets: [] };
          }
        })
      );
      
      setEvents(eventsWithBrackets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

// Restore context when returning from Stats page or Dashboard
    useEffect(() => {
      const storedContext = sessionStorage.getItem('staffEventsContext');
      
      if (storedContext) {
        try {
            const { 
              selectedEvent: savedEvent, 
              selectedBracket: savedBracket,
              bracketViewType: savedViewType,
              activeTab: savedTab,
              scrollPosition: savedScroll
            } = JSON.parse(storedContext);
            
            if (savedEvent && events.length > 0) {
              const event = events.find(e => e.id === savedEvent.id);
            
            if (event) {
              // If coming from dashboard with just an event (no bracket selected)
              if (savedTab === 'events' && !savedBracket) {
                // Check if event has brackets
                if (event.brackets && event.brackets.length > 0) {
                  // Auto-select the first bracket and show its matches
                  const firstBracket = event.brackets[0];
                  handleBracketSelect(event, firstBracket);
                } else {
                  // No brackets available, just show the events list
                  setSelectedEvent(event);
                  setActiveTab('events');
                  setTimeout(() => {
                    const element = document.querySelector('.awards_standings_table_container');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }
              } else if (savedBracket) {
                // Coming from stats page with a specific bracket selected
                const bracket = event.brackets?.find(b => b.id === savedBracket.id);
                if (bracket) {
                  setSelectedEvent(event);
                  
                  if (savedViewType) {
                    setBracketViewType(savedViewType);
                  }
                  if (savedScroll !== undefined) {
                    setPendingScrollPosition(savedScroll);
                  }
                  
                  handleBracketSelect(event, bracket);
                }
              }
            }
            
            sessionStorage.removeItem('staffEventsContext');
          }
        } catch (err) {
          console.error('Error restoring context:', err);
          sessionStorage.removeItem('staffEventsContext');
        }
      }
    }, [events]);

  useEffect(() => {
    if (pendingScrollPosition !== null && !loading && !loadingDetails) {
      const target = pendingScrollPosition;
      setPendingScrollPosition(null);
      setTimeout(() => {
        window.scrollTo({ top: target, behavior: 'auto' });
      }, 50);
    }
  }, [pendingScrollPosition, loading, loadingDetails, activeTab, bracketViewType, matches.length]);

  // Filter events based on search term and status filter
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Events pagination calculations
  const totalRows = filteredEvents.length;
  const totalPages = Math.ceil(totalRows / itemsPerPage);
  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstRow, indexOfLastRow);

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Handle bracket selection
 const handleBracketSelect = async (event, bracket) => {
  setSelectedEvent(event);
  setSelectedBracket(bracket);
  setActiveTab("results");
  setContentTab("matches");
  setBracketViewType("bracket");
  setLoadingDetails(true);
  setError(null);

  try {
    // Use correct endpoint based on bracket type
    let matchesEndpoint;
    if (bracket.elimination_type === 'round_robin') {
      matchesEndpoint = `http://localhost:5000/api/round-robin/${bracket.id}/matches`;
    } else if (bracket.elimination_type === 'round_robin_knockout') {
      matchesEndpoint = `http://localhost:5000/api/round-robin-knockout/${bracket.id}/matches`;
    } else {
      matchesEndpoint = `http://localhost:5000/api/brackets/${bracket.id}/matches`;
    }
    
    const res = await fetch(matchesEndpoint);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();
    const visibleMatches = data.filter(match => match.status !== 'hidden');
    setMatches(visibleMatches);
    setBracketMatches(visibleMatches);

    if (visibleMatches.length === 0) {
      setError("No matches found for this bracket.");
    }
  } catch (err) {
    setError("Failed to load matches: " + err.message);
  } finally {
    setLoadingDetails(false);
  }
};

  // Navigate to stats input (for editing)
  const handleInputStats = (match) => {
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: selectedEvent?.id,
      bracketId: selectedBracket?.id,
      match: match
    }));
    
    // Save current context including view type
    sessionStorage.setItem('staffEventsContext', JSON.stringify({
      selectedEvent: selectedEvent,
      selectedBracket: selectedBracket,
      bracketViewType: bracketViewType,
      scrollPosition: getScrollPosition(),
      activeTab: activeTab
    }));
    
    navigate('/StaffDashboard/stats');
  };

  // Navigate to stats view (view-only mode for staff)
  const handleViewStats = (match) => {
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: selectedEvent?.id,
      bracketId: selectedBracket?.id,
      match: match,
      viewOnly: true // Flag to indicate view-only mode
    }));
    
    // Save current context including view type
    sessionStorage.setItem('staffEventsContext', JSON.stringify({
      selectedEvent: selectedEvent,
      selectedBracket: selectedBracket,
      bracketViewType: bracketViewType,
      scrollPosition: getScrollPosition(),
      activeTab: activeTab
    }));
    
    navigate('/StaffDashboard/stats');
  };

  const getStatusBadge = (status) => {
    return <span className={`match-status status-${status}`}>{status}</span>;
  };

  return (
    <div className="admin-dashboard">
      <div className={`dashboard-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-header">
          <h1>Staff Events</h1>
          <p>View events, brackets, and manage match statistics</p>
        </div>

        <div className="dashboard-main">
          <div className="bracket-content">
            {/* Tabs */}
           <div className="bracket-breadcrumb">
            <button
              className={`breadcrumb-item ${!selectedBracket ? "active" : ""}`}
              onClick={() => {
                setActiveTab("events");
                setSelectedBracket(null);
                setSelectedEvent(null);
              }}
            >
              Events & Brackets
            </button>
            {selectedBracket && (
              <>
                <span className="breadcrumb-separator">›</span>
                <span className="breadcrumb-item active">
                  {selectedBracket.name}
                </span>
              </>
            )}
          </div>

            {/* Events Selection Tab */}
            {activeTab === "events" && (
                <div className="bracket-view-section purple-background">
                
                    {/* Search Container - Matching Admin Events Design */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: '1', minWidth: '300px' }}>
    <input
      type="text"
      placeholder="Search events..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      style={{
        flex: '1',
        padding: '12px 16px',
        border: '2px solid var(--border-color)',
        borderRadius: '8px',
        fontSize: '14px',
        backgroundColor: 'var(--background-secondary)',
        color: 'var(--text-primary)',
      }}
    />
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      style={{
        padding: '12px 16px',
        border: '2px solid var(--border-color)',
        borderRadius: '8px',
        fontSize: '14px',
        backgroundColor: 'var(--background-secondary)',
        color: 'var(--text-primary)',
        minWidth: '150px',
      }}
    >
      <option value="all">All Status</option>
      <option value="ongoing">Ongoing</option>
      <option value="completed">Completed</option>
    </select>
  </div>
</div>

{/* Results Info & Items Per Page */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
    {(searchTerm || statusFilter !== "all") && (
      <>
        Showing {currentEvents.length} of {totalRows} results
        {searchTerm && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Searching: "{searchTerm}"</span>}
        {statusFilter !== "all" && <span style={{ color: 'var(--primary-color)', marginLeft: '5px' }}> • Status: {statusFilter}</span>}
      </>
    )}
    {!searchTerm && statusFilter === "all" && (
      <>Showing {indexOfFirstRow + 1}-{Math.min(indexOfLastRow, totalRows)} of {totalRows} events</>
    )}
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Show:</label>
    <select
      value={itemsPerPage}
      onChange={(e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
      }}
      style={{
        padding: '8px 12px',
        border: '2px solid var(--border-color)',
        borderRadius: '6px',
        fontSize: '14px',
        backgroundColor: 'var(--background-secondary)',
        color: 'var(--text-primary)',
        cursor: 'pointer'
      }}
    >
      <option value={5}>5</option>
      <option value={10}>10</option>
      <option value={20}>20</option>
      <option value={50}>50</option>
    </select>
    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>per page</span>
  </div>
</div>
                

                {loading ? (
                  <div className="awards_standings_loading">
                    <div className="awards_standings_spinner"></div>
                    <p>Loading events...</p>
                  </div>
                ) : totalRows === 0 ? (
                  <div className="bracket-no-brackets">
                    {events.length === 0 ? (
                      <>
                        <p>No events found.</p>
                      </>
                    ) : (
                      <>
                        <p>No events match your search criteria.</p>
                        <button 
                          className="bracket-view-btn" 
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                          }}
                        >
                          Clear Search
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* NEW GROUPED EVENTS STRUCTURE */}
                    <div className="events-list-container">
                     {currentEvents.map(event => (
                        <div key={event.id} className="event-group-container" data-event-id={event.id}>
                          {/* Event Header Row */}
                          <div className="event-group-header">
                            <div className="event-header-left">
                              <button
                                onClick={() => toggleEventExpansion(event.id)}
                                className="event-expand-button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                  padding: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  fontSize: '18px'
                                }}
                              >
                                {expandedEvents[event.id] ? '▼' : '▶'}
                              </button>
                              
                              <div className="event-header-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    Event: {event.name}
                                  </h3>
                                  <span className={`bracket-sport-badge ${event.status === "ongoing" ? "bracket-sport-basketball" : "bracket-sport-volleyball"}`} 
                                        style={{ fontSize: '11px', padding: '4px 10px' }}>
                                    {event.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            <div className="event-header-actions">
  <span style={{ 
    fontSize: '14px', 
    color: 'var(--text-muted)',
    marginRight: '16px',
    fontWeight: '600'
  }}>
    [{event.brackets?.length || 0} Bracket{event.brackets?.length !== 1 ? 's' : ''}]
  </span>
</div>
                          </div>

                          {/* Brackets Table (Expandable) */}
                          {expandedEvents[event.id] && (
                            <div className="event-brackets-table-container" style={{
                              animation: 'fadeInDown 0.3s ease-out'
                            }}>
                              {event.brackets && event.brackets.length > 0 ? (
                                <table className="awards_standings_table" style={{ marginBottom: 0 }}>
                                  <thead>
                                    <tr style={{ background: '#1a2332' }}>
                                      <th style={{ fontSize: '14px', padding: '12px 20px' }}>Bracket Name</th>
                                      <th style={{ fontSize: '14px' }}>Sport</th>
                                      <th style={{ fontSize: '14px' }}>Type</th>
                                      <th style={{ fontSize: '14px' }}>Teams</th>
                                      <th style={{ textAlign: 'center', width: '120px', fontSize: '14px' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {event.brackets.map((bracket, index) => (
                                      <tr key={bracket.id} style={{
                                        animation: `fadeInRow 0.3s ease-out ${index * 0.05}s backwards`
                                      }}>
                                        <td style={{ fontWeight: '600', fontSize: '15px', padding: '12px 20px' }}>
                                          {bracket.name}
                                        </td>
                                        <td>
                                          <span className={`bracket-sport-badge ${bracket.sport_type === 'volleyball' ? 'bracket-sport-volleyball' : 'bracket-sport-basketball'}`} 
                                                style={{ fontSize: '12px', padding: '6px 12px' }}>
                                            {bracket.sport_type?.toUpperCase() || 'N/A'}
                                          </span>
                                        </td>
                                       <td style={{ fontSize: '14px' }}>
  {bracket.elimination_type === 'double' 
    ? 'Double Elim.' 
    : bracket.elimination_type === 'round_robin'
      ? 'Round Robin'
      : bracket.elimination_type === 'round_robin_knockout'
        ? 'RR + Knockout'
        : 'Single Elim.'}
</td>
                                        <td style={{ fontSize: '14px', fontWeight: '600' }}>
                                          {bracket.team_count || 0}
                                        </td>
                                        <td>
  <div style={{ 
    display: 'flex', 
    gap: '6px', 
    justifyContent: 'center', 
    alignItems: 'center',
    flexWrap: 'nowrap'
  }}>
                                            <button
                                              onClick={() => handleBracketSelect(event, bracket)}
                                              className="bracket-view-btn"
                                              style={{ fontSize: '12px', padding: '6px 12px', minWidth: '45px' }}
                                              title="View Matches"
                                            >
                                              <FaEye />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div style={{
                                  padding: '40px',
                                  textAlign: 'center',
                                  color: 'var(--text-muted)',
                                  fontSize: '14px',
                                  background: 'rgba(0, 0, 0, 0.2)',
                                  borderRadius: '0 0 8px 8px'
                                }}>
                                  <p style={{ margin: 0 }}>No brackets created for this event yet.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Events Pagination Controls */}
                    {totalPages > 1 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '30px',
                        padding: '20px',
                        background: 'var(--background-secondary)',
                        borderRadius: '8px',
                        flexWrap: 'wrap',
                        gap: '15px'
                      }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                          Page {currentPage} of {totalPages}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <button
                            onClick={goToPrevPage}
                            disabled={currentPage === 1}
                            style={{
                              padding: '10px 16px',
                              background: currentPage === 1 ? 'var(--text-muted)' : 'var(--primary-color)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '14px',
                              opacity: currentPage === 1 ? 0.5 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <FaChevronLeft /> Previous
                          </button>

                          {/* Page Numbers */}
                          <div style={{ display: 'flex', gap: '5px' }}>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => goToPage(pageNum)}
                                  style={{
                                    padding: '10px 14px',
                                    background: currentPage === pageNum ? 'var(--primary-color)' : 'var(--background-card)',
                                    color: currentPage === pageNum ? 'white' : 'var(--text-primary)',
                                    border: currentPage === pageNum ? 'none' : '2px solid var(--border-color)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: currentPage === pageNum ? '600' : '400',
                                    minWidth: '40px',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            style={{
                              padding: '10px 16px',
                              background: currentPage === totalPages ? 'var(--text-muted)' : 'var(--primary-color)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '14px',
                              opacity: currentPage === totalPages ? 0.5 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Next <FaChevronRight />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Results Tab */}
            {activeTab === "results" && selectedEvent && selectedBracket && (
              <div className="bracket-visualization-section">
                <div className="event-details-header">
                  <h2>{selectedBracket.name}</h2>
                  <div className="event-details-info">
                    <span><strong>Event:</strong> {selectedEvent.name}</span>
                    <span><strong>Sport:</strong> {capitalize(selectedBracket.sport_type)}</span>
                    <span><strong>Type:</strong> {
  selectedBracket.elimination_type === 'double' 
    ? 'Double Elimination' 
    : selectedBracket.elimination_type === 'round_robin'
      ? 'Round Robin'
      : selectedBracket.elimination_type === 'round_robin_knockout'
        ? 'RR + Knockout'
        : 'Single Elimination'
}</span>
                    <span><strong>Teams:</strong> {selectedBracket.team_count || 0}</span>
                  </div>
                </div>

                <div className="awards_standings_tabs">
                  <button
                    className={`awards_standings_tab_button ${contentTab === "matches" ? "awards_standings_tab_active" : ""}`}
                    onClick={() => setContentTab("matches")}
                  >
                    <FaChartBar /> Live Match Scoring
                  </button>
                </div>

                {loading || loadingDetails ? (
                  <div className="awards_standings_loading">
                    <div className="awards_standings_spinner"></div>
                    <p>Loading matches...</p>
                  </div>
                ) : error ? (
                  <div className="bracket-error"><p>{error}</p></div>
                ) : (
                  <>
                    {contentTab === "matches" && (
                      <div className="awards_standings_tab_content">
                        {/* View Type Selector */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '24px',
                          flexWrap: 'wrap',
                          gap: '16px'
                        }}>
                          {/* View Toggle Buttons */}
                          <div style={{ 
                            display: 'flex', 
                            gap: '12px',
                            background: 'rgba(51, 65, 85, 0.5)',
                            padding: '6px',
                            borderRadius: '8px',
                            border: '1px solid #334155'
                          }}>
                            <button
                              onClick={() => setBracketViewType("bracket")}
                              style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                background: bracketViewType === "bracket" ? '#3b82f6' : 'transparent',
                                color: bracketViewType === "bracket" ? '#ffffff' : '#cbd5e1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <FaEye /> Bracket View
                            </button>
                            <button
                              onClick={() => setBracketViewType("list")}
                              style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                background: bracketViewType === "list" ? '#3b82f6' : 'transparent',
                                color: bracketViewType === "list" ? '#ffffff' : '#cbd5e1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <FaChartBar /> List View
                            </button>
                          </div>
                        </div>

                        {/* Conditional Rendering Based on View Type */}
                {bracketViewType === "bracket" ? (
  <>
    {selectedBracket.elimination_type === 'single' && (
      <CustomBracket 
        matches={bracketMatches} 
        eliminationType={selectedBracket.elimination_type}
        selectedEvent={selectedEvent}
        selectedBracket={selectedBracket}
        
      />
    )}
    
    {selectedBracket.elimination_type === 'double' && (
      <DoubleEliminationBracket 
        matches={bracketMatches} 
        eliminationType={selectedBracket.elimination_type}
        selectedEvent={selectedEvent}
        selectedBracket={selectedBracket}
      />
    )}
    
    {selectedBracket.elimination_type === 'round_robin' && (
      <RoundRobinBracketDisplay 
        matches={bracketMatches}
        selectedEvent={selectedEvent}
        selectedBracket={selectedBracket}
      />
    )}

    {selectedBracket.elimination_type === 'round_robin_knockout' && (
      <RoundRobinKnockoutBracket 
        matches={bracketMatches}
        standings={standings}
        selectedEvent={selectedEvent}
        selectedBracket={selectedBracket}
      />
    )}
  </>
) : (
   <TournamentScheduleList
    matches={bracketMatches}
    eventId={selectedEvent?.id}
    bracketId={selectedBracket?.id}
    onViewStats={(match) => handleViewStats(match)}
    onInputStats={(match) => handleInputStats(match)}
    onRefresh={async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/brackets/${selectedBracket.id}/matches`);
        if (res.ok) {
          const data = await res.json();
          const visibleMatches = data.filter(match => match.status !== 'hidden');
          setMatches(visibleMatches);
          setBracketMatches(visibleMatches);
        }
      } catch (err) {
        console.error('Error refreshing matches:', err);
      }
    }}
    isStaffView={true}
  />
)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffEvents;
