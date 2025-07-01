import React from 'react';

export default function EndScreen({ stats, onRestart }) {
  return (
    <div className="end-screen p-8 max-w-4xl mx-auto">
      <h2 className={`text-4xl font-bold text-center mb-6 ${stats?.victory ? 'text-green-400' : 'text-red-400'}`}>
        {stats?.victory ? 'Victory!' : 'Defeat'}
      </h2>
      
      {stats?.message && (
        <div className="text-center mb-6 text-lg text-gray-300">
          {stats.message}
        </div>
      )}
      
      <div className="stats-container grid grid-cols-2 gap-4 mb-6">
        <div className="stat-item bg-gray-800 p-4 rounded">
          <span className="stat-label block text-sm text-gray-400">Waves Survived</span>
          <span className="stat-value text-2xl font-bold text-white">{stats?.waves ?? 0}</span>
        </div>
        <div className="stat-item bg-gray-800 p-4 rounded">
          <span className="stat-label block text-sm text-gray-400">Gold Mined</span>
          <span className="stat-value text-2xl font-bold text-yellow-400">{stats?.gold ?? 0}</span>
        </div>
        <div className="stat-item bg-gray-800 p-4 rounded">
          <span className="stat-label block text-sm text-gray-400">Units Hired</span>
          <span className="stat-value text-2xl font-bold text-blue-400">{stats?.units ?? 0}</span>
        </div>
        <div className="stat-item bg-gray-800 p-4 rounded">
          <span className="stat-label block text-sm text-gray-400">DPS Contribution</span>
          <span className="stat-value text-2xl font-bold text-purple-400">{stats?.dps ?? 0}</span>
        </div>
      </div>

      {/* Show all players' stats if available */}
      {stats?.playerStats && Object.keys(stats.playerStats).length > 1 && (
        <div className="all-players-stats mb-6">
          <h3 className="text-xl font-bold text-center mb-4">All Players</h3>
          <div className="grid gap-2">
            {Object.entries(stats.playerStats).map(([playerName, playerStats]) => (
              <div key={playerName} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                <span className="font-semibold">{playerName}</span>
                <div className="text-sm text-gray-300">
                  Gold: {playerStats.gold} | Units: {playerStats.totalUnitsHired} | Castle HP: {playerStats.castleHpLeft}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-center">
        <button onClick={onRestart} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded text-lg">
          New Game
        </button>
      </div>
      
      <div className="text-center mt-6">
        {stats?.victory ? (
          <div className="victory-message text-green-300 text-lg">
            Your castle stands strong! The enemy has been defeated.
          </div>
        ) : (
          <div className="defeat-message text-red-300 text-lg">
            Your castle has fallen. Gather your forces and try again!
          </div>
        )}
      </div>
    </div>
  );
}
