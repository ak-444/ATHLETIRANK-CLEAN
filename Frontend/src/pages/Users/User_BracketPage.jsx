import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CustomBracket from "../../components/CustomBracket";
import DoubleEliminationBracket from "../../components/DoubleEliminationBracket"; // Import the double elimination component
import "../../style/User_BracketPage.css";
import { RiTrophyFill } from "react-icons/ri";

const User_BracketPage = ({ sidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectAppliedRef = useRef(false);
  const [activeTab, setActiveTab] = useState("view");
  const [brackets, setBrackets] = useState([]);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [bracketMatches, setBracketMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const preselectBracketId = location.state?.preselectBracketId;
  const preselectEventId = location.state?.preselectEventId;

  // Handle back to homepage
  const handleBackToHome = () => {
    navigate("/");
  };

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/events");
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error("Error fetching events:", err);
      }
    };
    fetchEvents();
  }, []);

  // Fetch brackets
  const fetchAllBrackets = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/brackets");
      const data = await res.json();
      setBrackets(data);
    } catch (err) {
      console.error("Error fetching brackets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBrackets();
  }, []);

  // Fetch matches for a bracket
  const fetchBracketMatches = async (bracketId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/brackets/${bracketId}/matches`);
      const data = await res.json();
      setBracketMatches(data);
    } catch (err) {
      console.error("Error fetching matches:", err);
      setBracketMatches([]);
    }
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const handleViewBracket = async (bracket) => {
    setSelectedBracket(bracket);
    await fetchBracketMatches(bracket.id);
    setActiveTab("bracket");
  };

  const handleBackToBrackets = () => {
    navigate("/schedules");
  };

  useEffect(() => {
    if (preselectAppliedRef.current) return;
    if (!brackets.length || !preselectBracketId) return;

    const targetBracket = brackets.find(
      b => b.id === Number(preselectBracketId) || b.id === preselectBracketId
    );

    if (!targetBracket) return;

    const applyPreselect = async () => {
      preselectAppliedRef.current = true;
      if (preselectEventId) {
        setFilterEvent(String(preselectEventId));
      }
      await handleViewBracket(targetBracket);
    };

    applyPreselect();
  }, [brackets, preselectBracketId, preselectEventId]);

  // Filter brackets based on search and filters
  const filteredBrackets = brackets.filter(bracket => {
    const eventName = events.find(e => e.id === bracket.event_id)?.name || "";
    const matchesSearch = bracket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eventName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = !filterSport || bracket.sport_type === filterSport;
    const matchesEvent = !filterEvent || bracket.event_id.toString() === filterEvent;
    
    return matchesSearch && matchesSport && matchesEvent;
  });

  // Get unique sports from brackets
  const availableSports = [...new Set(brackets.map(b => b.sport_type))];

  // Function to render the appropriate bracket component based on elimination type
  const renderBracketVisualization = () => {
    if (!selectedBracket || !bracketMatches) return null;

    // Check if it's double elimination
    if (selectedBracket.elimination_type === 'double') {
      return (
        <DoubleEliminationBracket 
          matches={bracketMatches} 
          eliminationType="double" 
        />
      );
    } else {
      // Single elimination - use your existing CustomBracket component
      return (
        <CustomBracket 
          matches={bracketMatches} 
          eliminationType="single"
        />
      );
    }
  };

  return (
    <div className="user_bracket_page_admin_dashboard">
      {/* Header with Back Button */}
      <div className="user_bracket_page_brackets_header">
        <div className="user_bracket_page_header_content">
          <div className="user_bracket_page_header_top">
            <button className="user_bracket_page_back_btn" onClick={handleBackToHome}>
              <span className="user_bracket_page_back_arrow">←</span>
              Back to Home
            </button>
          </div>
          
          <div className="user_bracket_page_header_center">
            <h1><RiTrophyFill className="user_bracket_page_header_icon"/>Tournament Brackets</h1>
            <p>View live tournament brackets and match results</p>
          </div>
        </div>
      </div>

      <div className={`user_bracket_page_dashboard_content ${sidebarOpen ? "user_bracket_page_sidebar_open" : ""}`}>
        <div className="user_bracket_page_dashboard_main">
          <div className="user_bracket_page_bracket_content">
            {/* View Brackets */}
            {activeTab === "view" && (
              <div className="user_bracket_page_bracket_view_section">
                <div className="user_bracket_page_bracket_filters">
                  <h2>Tournament Brackets</h2>
                  
                  {/* Search and Filters */}
                  <div className="user_bracket_page_bracket_filter_controls">
                    <div className="user_bracket_page_bracket_search_container">
                      <input
                        type="text"
                        placeholder="Search brackets or events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="user_bracket_page_bracket_search_input"
                      />
                      <span className="user_bracket_page_search_icon">🔍</span>
                    </div>
                    
                    <div className="user_bracket_page_bracket_filter_row">
                      <select 
                        value={filterSport} 
                        onChange={(e) => setFilterSport(e.target.value)}
                        className="user_bracket_page_bracket_filter_select"
                      >
                        <option value="">All Sports</option>
                        {availableSports.map(sport => (
                          <option key={sport} value={sport}>
                            {capitalize(sport)}
                          </option>
                        ))}
                      </select>

                      <select 
                        value={filterEvent} 
                        onChange={(e) => setFilterEvent(e.target.value)}
                        className="user_bracket_page_bracket_filter_select"
                      >
                        <option value="">All Events</option>
                        {events.map(event => (
                          <option key={event.id} value={event.id}>
                            {event.name}
                          </option>
                        ))}
                      </select>

                      {(searchTerm || filterSport || filterEvent) && (
                        <button 
                          onClick={() => {
                            setSearchTerm("");
                            setFilterSport("");
                            setFilterEvent("");
                          }}
                          className="user_bracket_page_clear_filters_btn"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="user_bracket_page_bracket_loading">
                    <p>Loading brackets...</p>
                  </div>
                ) : filteredBrackets.length === 0 ? (
                  <div className="user_bracket_page_bracket_no_brackets">
                    {brackets.length === 0 ? (
                      <div className="user_bracket_page_no_brackets_content">
                        <div className="user_bracket_page_no_brackets_icon">🏆</div>
                        <h3>No Tournament Brackets Available</h3>
                        <p>Check back later when tournaments are created!</p>
                      </div>
                    ) : (
                      <div className="user_bracket_page_no_brackets_content">
                        <div className="user_bracket_page_no_brackets_icon">🔍</div>
                        <h3>No Brackets Match Your Search</h3>
                        <p>Try adjusting your search terms or filters.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="user_bracket_page_bracket_grid">
                    {filteredBrackets.map(b => {
                      const eventName = events.find(e => e.id === b.event_id)?.name || `Event ${b.event_id}`;
                      const isOngoing = b.status === 'ongoing' || b.status === 'live';
                      const isCompleted = b.status === 'completed';
                      
                      return (
                        <div key={b.id} className="user_bracket_page_bracket_card">
                          <div className="user_bracket_page_bracket_card_header">
                            <h3>{b.name}</h3>
                            <div className="user_bracket_page_bracket_badges">
                              <span className={`user_bracket_page_bracket_sport_badge user_bracket_page_bracket_sport_${b.sport_type}`}>
                                {capitalize(b.sport_type)}
                              </span>
                              {/* Add elimination type badge */}
                              <span className={`user_bracket_page_bracket_elimination_badge user_bracket_page_bracket_elimination_${b.elimination_type}`}>
                                {b.elimination_type === 'double' ? 'DOUBLE' : 'SINGLE'}
                              </span>
                              {isOngoing && (
                                <span className="user_bracket_page_bracket_status_badge user_bracket_page_bracket_status_live">
                                  LIVE
                                </span>
                              )}
                              {isCompleted && (
                                <span className="user_bracket_page_bracket_status_badge user_bracket_page_bracket_status_completed">
                                  FINISHED
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="user_bracket_page_bracket_card_info">
                            <div><strong>Event:</strong> {eventName}</div>
                            <div><strong>Format:</strong> {b.elimination_type === "single" ? "Single" : "Double"} Elimination</div>
                            <div><strong>Teams:</strong> {b.team_count || 0}</div>
                            <div><strong>Created:</strong> {new Date(b.created_at).toLocaleDateString()}</div>
                            {b.description && (
                              <div className="user_bracket_page_bracket_description">
                                <strong>Description:</strong> {b.description}
                              </div>
                            )}
                          </div>
                          
                          <div className="user_bracket_page_bracket_card_actions">
                            <button 
                              className="user_bracket_page_bracket_view_btn" 
                              onClick={() => handleViewBracket(b)}
                            >
                              {isOngoing ? "Watch Live" : "View Bracket"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Bracket Visualization */}
            {activeTab === "bracket" && selectedBracket && (
              <div className="user_bracket_page_bracket_visualization_section">
                <div className="user_bracket_page_bracket_header_controls">
                  <h2>{selectedBracket.name}</h2>
                  <button 
                    className="user_bracket_page_bracket_back_btn"
                    onClick={handleBackToBrackets}
                  >
                    Back to Match Schedule
                  </button>
                </div>
                <div className="user_bracket_page_bracket_info">
                  <p><strong>Event:</strong> {events.find(e => e.id === selectedBracket.event_id)?.name || `Event ${selectedBracket.event_id}`}</p>
                  <p><strong>Sport:</strong> {capitalize(selectedBracket.sport_type)}</p>
                  <p><strong>Format:</strong> {selectedBracket.elimination_type === "single" ? "Single" : "Double"} Elimination</p>
                  <p><strong>Teams:</strong> {selectedBracket.team_count || 0}</p>
                </div>
                
                <div className="user_bracket_page_bracket_wrapper">
                  {renderBracketVisualization()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default User_BracketPage;
