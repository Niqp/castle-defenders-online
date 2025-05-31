import React from 'react';

export default function EndScreen({ stats, onRestart }) {
  return (
    <div className="end-screen">
      <h2 className={stats?.victory ? 'victory' : 'defeat'}>
        {stats?.victory ? 'Victory!' : 'Defeat'}
      </h2>
      
      <div className="stats-container">
        <div className="stat-item">
          <span className="stat-label">Waves Survived</span>
          <span className="stat-value">{stats?.waves ?? 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Gold Mined</span>
          <span className="stat-value">{stats?.gold ?? 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Units Hired</span>
          <span className="stat-value">{stats?.units ?? 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">DPS Contribution</span>
          <span className="stat-value">{stats?.dps ?? 0}</span>
        </div>
      </div>
      
      <button onClick={onRestart}>
        Return to Lobby
      </button>
      
      {stats?.victory && (
        <div className="victory-message">
          Your castle stands strong! The enemy has been defeated.
        </div>
      )}
      {!stats?.victory && (
        <div className="defeat-message">
          Your castle has fallen. Gather your forces and try again!
        </div>
      )}
    </div>
  );
}
