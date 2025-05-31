import React from 'react';

export default function LobbyScreen({ playerName, lobby, onReady, ready }) {
  const allReady = lobby.players.length > 0 && 
    lobby.players.every(player => lobby.ready[player]);
    
  return (
    <div className="lobby-screen">
      <h2>Battle Preparation</h2>
      
      <div className="lobby-info">
        <div className="player-count">
          <span>{lobby.players.length}</span> warriors gathered
        </div>
        {allReady && lobby.players.length > 1 && (
          <div className="all-ready-message">All warriors ready! Starting soon...</div>
        )}
      </div>
      
      <div className="player-list-container">
        <h3>Warriors</h3>
        <ul className="player-list">
          {lobby.players.map((p) => (
            <li key={p} className={p === playerName ? 'current-player' : ''}>
              <span className="player-name">{p}</span>
              <span className="player-status">
                {lobby.ready[p] ? (
                  <span className="ready-indicator">Ready ✓</span>
                ) : (
                  <span className="not-ready-indicator">Not Ready</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
      
      <button 
        onClick={onReady} 
        className={`ready-btn ${ready ? 'ready' : ''}`}
      >
        {ready ? 'Cancel Ready' : 'Ready to Battle'}
      </button>
      
      <div className="status-message">
        {ready 
          ? 'Waiting for other warriors to prepare...' 
          : 'Click Ready when you are prepared for battle'}
      </div>
    </div>
  );
}
