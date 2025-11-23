import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoundRobinKnockoutBracket({ matches = [], standings = [], selectedEvent, selectedBracket }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hoveredMatchId, setHoveredMatchId] = useState(null);
  
  const isStaff = user?.role === 'sports_committee';

  const handleMatchClick = (match) => {
    if (!isStaff || !selectedEvent || !selectedBracket) return;
    
    sessionStorage.setItem('selectedMatchData', JSON.stringify({
      matchId: match.id,
      eventId: selectedEvent.id,
      bracketId: selectedBracket.id,
      match: match
    }));
    // Add viewOnly flag if viewing completed match
  if (isViewOnly || match.status === 'completed') {
    matchData.viewOnly = true;
  }
    
    sessionStorage.setItem('staffEventsContext', JSON.stringify({
      selectedEvent: selectedEvent,
      selectedBracket: selectedBracket,
      bracketViewType: 'bracket'
    }));
    
    navigate('/StaffDashboard/stats');
  };

  if (!matches || matches.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0c1445 0%, #1a237e 50%, #283593 100%)',
        padding: '24px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>No Matches Generated</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Generate matches to see the tournament structure</p>
        </div>
      </div>
    );
  }

  // Separate matches by type
  const rrMatches = matches.filter(m => m.bracket_type === 'round_robin');
  const semifinalMatches = matches.filter(m => m.bracket_type === 'knockout_semifinal');
  const finalsMatch = matches.find(m => m.bracket_type === 'knockout_final');
  const thirdPlaceMatch = matches.find(m => m.bracket_type === 'knockout_third_place');

  // Group RR matches by round
  const rrMatchesByRound = {};
  rrMatches.forEach(match => {
    const roundNum = match.round_number;
    if (!rrMatchesByRound[roundNum]) {
      rrMatchesByRound[roundNum] = [];
    }
    rrMatchesByRound[roundNum].push(match);
  });

  const rrRounds = Object.keys(rrMatchesByRound).sort((a, b) => parseInt(a) - parseInt(b));

  // Check if RR phase is complete
  const rrComplete = rrMatches.length > 0 && rrMatches.every(m => m.status === 'completed');

  // Get unique teams
  const teamsSet = new Set();
  matches.forEach(match => {
    if (match.team1_name) teamsSet.add(match.team1_name);
    if (match.team2_name) teamsSet.add(match.team2_name);
  });
  const totalTeams = teamsSet.size;

  // Render match card
  const renderMatchCard = (match, matchNumber, isKnockout = false) => {
    if (!match) return null;

    const isCompleted = match.status === 'completed';
    const isOngoing = match.status === 'ongoing';
    const team1Won = match.winner_id === match.team1_id;
    const team2Won = match.winner_id === match.team2_id;
    const isDraw = isCompleted && !match.winner_id && match.score_team1 === match.score_team2;

    // Hover state variables
    const isHovered = hoveredMatchId === match.id;
    const showScoreButton = isStaff && isHovered && (match.status === 'scheduled' || match.status === 'ongoing');
    const showViewButton = isStaff && isHovered && isCompleted;

    return (
      <div style={{
        background: isKnockout 
          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)'
          : 'rgba(15, 23, 42, 0.85)',
        border: isKnockout 
          ? '2px solid rgba(139, 92, 246, 0.4)' 
          : '2px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '20px',
        minWidth: isKnockout ? '320px' : '280px',
        flexShrink: 0,
        boxShadow: isKnockout
          ? '0 10px 30px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 10px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(8px)',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        setHoveredMatchId(match.id);
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
        e.currentTarget.style.boxShadow = isKnockout
          ? '0 20px 50px rgba(139, 92, 246, 0.4), 0 5px 15px rgba(0,0,0,0.2)'
          : '0 20px 40px rgba(0,0,0,0.35), 0 5px 15px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        setHoveredMatchId(null);
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = isKnockout
          ? '0 10px 30px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 10px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
      }}>
        {/* Match Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.9em'
          }}>
            {isKnockout ? (
              <span style={{ 
                color: '#a78bfa', 
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {match.bracket_type === 'knockout_semifinal' ? 'SEMIFINAL' :
                 match.bracket_type === 'knockout_final' ? 'FINALS' : 
                 '3RD PLACE'}
              </span>
            ) : (
              `Match #${matchNumber}`
            )}
          </span>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '8px',
            fontSize: '0.85em',
            fontWeight: '600',
            background: isCompleted 
              ? 'rgba(16, 185, 129, 0.2)' 
              : isOngoing 
                ? 'rgba(59, 130, 246, 0.2)' 
                : 'rgba(92, 107, 192, 0.2)',
            color: isCompleted 
              ? '#6ee7b7' 
              : isOngoing 
                ? '#93c5fd' 
                : '#a5b4fc',
            border: `1px solid ${isCompleted 
              ? 'rgba(16, 185, 129, 0.3)' 
              : isOngoing 
                ? 'rgba(59, 130, 246, 0.3)' 
              : 'rgba(92, 107, 192, 0.3)'}`
          }}>
            {isCompleted ? '✓' : isOngoing ? '⏱️' : '📅'}
            {isCompleted ? 'Completed' : isOngoing ? 'Live' : 'Scheduled'}
          </span>
        </div>
        
        {/* Teams */}
        <div style={{ marginBottom: '16px' }}>
          {/* Team 1 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            margin: '6px 0',
            border: team1Won ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            background: team1Won ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.5)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              {team1Won && <span style={{ fontSize: '1.2em' }}>👑</span>}
              <span style={{
                fontSize: '1em',
                color: '#ffffff',
                fontWeight: team1Won ? '700' : '600'
              }}>
                {match.team1_name || 'TBD'}
              </span>
            </div>
            {match.score_team1 !== null && match.score_team1 !== undefined && (
              <span style={{
                fontSize: '1.2em',
                fontWeight: '700',
                color: team1Won ? '#10b981' : '#e2e8f0',
                minWidth: '30px',
                textAlign: 'right'
              }}>
                {match.score_team1}
              </span>
            )}
          </div>

          {/* VS Divider */}
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 16px',
              background: isDraw ? 'rgba(251, 191, 36, 0.2)' : 
                          isKnockout ? 'rgba(139, 92, 246, 0.2)' : 
                          'rgba(99, 102, 241, 0.2)',
              color: isDraw ? '#fbbf24' : 
                     isKnockout ? '#c4b5fd' : 
                     '#818cf8',
              fontWeight: '700',
              fontSize: '0.85em',
              borderRadius: '8px',
              border: `1px solid ${isDraw ? 'rgba(251, 191, 36, 0.3)' : 
                                   isKnockout ? 'rgba(139, 92, 246, 0.3)' : 
                                   'rgba(99, 102, 241, 0.3)'}`
            }}>
              {isDraw ? 'DRAW' : 'VS'}
            </span>
          </div>

          {/* Team 2 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            margin: '6px 0',
            border: team2Won ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            background: team2Won ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.5)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              {team2Won && <span style={{ fontSize: '1.2em' }}>👑</span>}
              <span style={{
                fontSize: '1em',
                color: '#ffffff',
                fontWeight: team2Won ? '700' : '600'
              }}>
                {match.team2_name || 'TBD'}
              </span>
            </div>
            {match.score_team2 !== null && match.score_team2 !== undefined && (
              <span style={{
                fontSize: '1.2em',
                fontWeight: '700',
                color: team2Won ? '#10b981' : '#e2e8f0',
                minWidth: '30px',
                textAlign: 'right'
              }}>
                {match.score_team2}
              </span>
            )}
          </div>
        </div>

        {/* Match Result Footer */}
        {isCompleted && match.winner_name && (
          <div style={{
            background: isKnockout 
              ? 'rgba(139, 92, 246, 0.2)' 
              : 'rgba(16, 185, 129, 0.1)',
            border: isKnockout 
              ? '1px solid rgba(139, 92, 246, 0.4)' 
              : '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1em' }}>
              {match.bracket_type === 'knockout_final' ? '🏆' : '✓'}
            </span>
            <span style={{ 
              color: isKnockout ? '#c4b5fd' : '#6ee7b7', 
              fontSize: '0.9em', 
              fontWeight: '600' 
            }}>
              {match.winner_name} {match.bracket_type === 'knockout_final' ? 'is Champion!' : 'Wins!'}
            </span>
          </div>
        )}

        {isDraw && (
          <div style={{
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1em' }}>🤝</span>
            <span style={{ color: '#fbbf24', fontSize: '0.9em', fontWeight: '600' }}>
              Match Drawn
            </span>
          </div>
        )}

        {/* Score/View Scores Button - Only visible on hover for staff */}
        {isStaff && (showScoreButton || showViewButton) && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            pointerEvents: 'none',
            width: 'calc(100% - 40px)',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button
              style={{
                pointerEvents: 'all',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1em',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                animation: 'buttonFadeIn 0.2s ease-out',
                background: isCompleted 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: isCompleted 
                  ? '2px solid rgba(16, 185, 129, 0.5)'
                  : '2px solid rgba(59, 130, 246, 0.5)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                 handleMatchClick(match, isCompleted);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                e.currentTarget.style.boxShadow = isCompleted
                  ? '0 6px 20px rgba(16, 185, 129, 0.5)'
                  : '0 6px 20px rgba(59, 130, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
              }}
            >
              {isCompleted ? 'View Scores' : 'Score!'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      padding: '32px',
      background: 'linear-gradient(135deg, #0c1445 0%, #1a237e 50%, #283593 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
          Round Robin + Knockout Tournament
        </h1>
        <div style={{ 
          height: '4px', 
          width: '64px', 
          background: '#8b5cf6',
          marginBottom: '24px'
        }}></div>

        {/* Tournament Info */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Teams:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6' }}>{totalTeams}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Format:</span>
            <span style={{ fontSize: '1rem', color: '#c4b5fd' }}>Round Robin + Knockout</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>RR Rounds:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{rrRounds.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Phase:</span>
            <span style={{ 
              fontSize: '1rem', 
              fontWeight: 'bold',
              color: rrComplete ? '#8b5cf6' : '#3b82f6',
              padding: '4px 12px',
              background: rrComplete ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              border: rrComplete ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              {rrComplete ? '⚡ Knockout Stage' : '🔄 Round Robin'}
            </span>
          </div>
        </div>

        {/* Info Banner */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.85)',
          borderLeft: '4px solid #8b5cf6',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          borderRadius: '8px',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)'
        }}>
          <span style={{ fontSize: '1.25rem', color: '#8b5cf6' }}>ℹ️</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            Phase 1: Round Robin - All teams play each other. Phase 2: Top 4 teams advance to knockout semifinals and finals.
          </span>
        </div>
      </div>

      {/* PHASE 1: ROUND ROBIN */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '16px',
          padding: '24px',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '2px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)'
            }}>
              🔄
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>
                Phase 1: Round Robin
              </h2>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                All teams compete against each other
              </p>
            </div>
            {rrComplete && (
              <div style={{ 
                marginLeft: 'auto',
                padding: '8px 16px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                color: '#6ee7b7',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✓</span> Complete
              </div>
            )}
          </div>

          {/* Round Robin Matches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {rrRounds.map((roundNum, roundIndex) => {
              const roundMatches = rrMatchesByRound[roundNum];
              let matchesBeforeThisRound = 0;
              for (let i = 0; i < roundIndex; i++) {
                matchesBeforeThisRound += rrMatchesByRound[rrRounds[i]].length;
              }
              
              return (
                <div key={roundNum} style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)',
                    border: '1px solid rgba(37, 99, 235, 0.3)',
                    minWidth: '160px',
                    width: '160px',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '16px',
                    backdropFilter: 'blur(8px)'
                  }}>
                    <div style={{
                      fontSize: '1.4em',
                      fontWeight: '700',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      marginBottom: '4px'
                    }}>
                      Round {roundNum}
                    </div>
                    <div style={{
                      fontSize: '0.85em',
                      opacity: '0.9',
                      fontWeight: '600'
                    }}>
                      {roundMatches.length} {roundMatches.length === 1 ? 'Match' : 'Matches'}
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'flex',
                    gap: '20px',
                    overflowX: 'auto',
                    paddingBottom: '16px',
                    flex: 1
                  }}>
                    {roundMatches.map((match, matchIndex) => 
                      renderMatchCard(match, matchesBeforeThisRound + matchIndex + 1, false)
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Standings Table */}
          {standings && standings.length > 0 && (
            <div style={{ 
              marginTop: '32px',
              padding: '24px',
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📊 Current Standings
                {rrComplete && (
                  <span style={{ 
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#6ee7b7',
                    borderRadius: '6px',
                    fontWeight: '600'
                  }}>
                    FINAL
                  </span>
                )}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                      fontSize: '0.85rem',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Rank</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Team</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>P</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>W</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>D</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>L</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>GF</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>GA</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>GD</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700' }}>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, index) => (
                      <tr key={team.team_id} style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        background: index < 4 
                          ? 'rgba(139, 92, 246, 0.1)' 
                          : 'transparent',
                        transition: 'background 0.2s'
                      }}>
                        <td style={{ 
                          padding: '12px 16px',
                          fontWeight: '700',
                          color: index < 4 ? '#c4b5fd' : 'white'
                        }}>
                          {index + 1}
                          {index < 4 && <span style={{ marginLeft: '4px' }}>⚡</span>}
                        </td>
                        <td style={{ 
                          padding: '12px 16px',
                          fontWeight: '600',
                          color: 'white'
                        }}>
                          {team.team_name}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{team.played}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6ee7b7' }}>{team.wins}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#fbbf24' }}>{team.draws}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#f87171' }}>{team.losses}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{team.goals_for}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{team.goals_against}</td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center',
                          color: team.goal_difference > 0 ? '#6ee7b7' : 
                                 team.goal_difference < 0 ? '#f87171' : 'white',
                          fontWeight: '600'
                        }}>
                          {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center',
                          fontWeight: '700',
                          fontSize: '1.1rem',
                          color: '#8b5cf6'
                        }}>
                          {team.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rrComplete && (
                <div style={{ 
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#c4b5fd',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚡</span>
                  Top 4 teams advance to knockout stage
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PHASE 2: KNOCKOUT */}
      <div>
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '16px',
          padding: '24px',
          border: '2px solid rgba(139, 92, 246, 0.3)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '2px solid rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)'
            }}>
              ⚡
            </div>
            <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>
                Phase 2: Knockout Stage
              </h2>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                Top 4 teams compete for the championship
              </p>
            </div>
            {!rrComplete && (
              <div style={{ 
                marginLeft: 'auto',
                padding: '8px 16px',
                background: 'rgba(251, 191, 36, 0.2)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '8px',
                color: '#fbbf24',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⏳</span> Waiting for Round Robin
              </div>
            )}
          </div>

          {/* Knockout Bracket Display */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            opacity: !rrComplete ? 0.5 : 1,
            transition: 'opacity 0.3s'
          }}>
            {/* Semifinals Section */}
            <div>
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                marginBottom: '16px',
                color: '#c4b5fd',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>🥊</span> Semifinals
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {semifinalMatches.map((match, idx) => (
                  <div key={match.id}>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      {idx === 0 ? 'Rank 1 vs Rank 4' : 'Rank 2 vs Rank 3'}
                    </div>
                    {renderMatchCard(match, null, true)}
                  </div>
                ))}
              </div>
            </div>

            {/* Finals Section */}
            <div>
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                marginBottom: '16px',
                color: '#fbbf24',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>🏆</span> Championship Finals
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {finalsMatch && (
                  <div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      Winner SF1 vs Winner SF2
                    </div>
                    {renderMatchCard(finalsMatch, null, true)}
                  </div>
                )}
                
                {thirdPlaceMatch && (
                  <div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '700',
                      marginTop: '24px',
                      marginBottom: '12px',
                      color: '#fb923c',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>🥉</span> Third Place Match
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      Loser SF1 vs Loser SF2
                    </div>
                    {renderMatchCard(thirdPlaceMatch, null, true)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Knockout Info Banner */}
          {!rrComplete && (
            <div style={{ 
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
              <div>
                <div style={{ fontWeight: '600', color: '#fbbf24', marginBottom: '4px' }}>
                  Knockout Stage Locked
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Complete all Round Robin matches to unlock the knockout stage. The top 4 teams will automatically be seeded.
                </div>
              </div>
            </div>
          )}

          {rrComplete && (
            <div style={{ 
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>✨</span>
              <div>
                <div style={{ fontWeight: '600', color: '#c4b5fd', marginBottom: '4px' }}>
                  Knockout Stage Active
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  The top 4 teams from Round Robin have been seeded into the semifinals. Winners advance to the championship finals!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        @keyframes buttonFadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}