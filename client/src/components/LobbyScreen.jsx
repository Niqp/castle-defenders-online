import React from 'react';

export default function LobbyScreen({ playerName, lobby, onReady, ready }) {
  const allReady =
    lobby.players.length > 1 && lobby.players.every((player) => lobby.ready[player]);

  return (
    <div data-theme="fantasy" className="w-full flex flex-col items-center justify-center p-4 md:p-6 bg-transparent">
      <div className="w-full max-w-3xl flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6 md:mb-8 text-center">
          Battle Preparation
        </h2>

        <div className="stats shadow stats-vertical md:stats-horizontal mb-6 md:mb-8 bg-base-100">
          <div className="stat">
            <div className="stat-title">Warriors Gathered</div>
            <div className="stat-value text-accent">{lobby.players.length}</div>
            <div className="stat-desc">Ready to defend the castle!</div>
          </div>
        </div>

        {allReady && (
          <div role="alert" className="alert alert-success shadow-lg mb-6 md:mb-8 max-w-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>All warriors ready! The battle will begin soon...</span>
          </div>
        )}

        <div className="card w-full max-w-md bg-base-100 shadow-xl mb-6 md:mb-8">
          <div className="card-body p-4 md:p-6">
            <h3 className="card-title text-xl md:text-2xl text-secondary mb-4">
              Warriors in Lobby
            </h3>
            <ul className="menu p-0 max-h-[40vh] md:max-h-[250px] overflow-y-auto space-y-1">
              {lobby.players.map((p) => (
                <li
                  key={p}
                  className={`flex flex-row justify-between items-center p-2 rounded-lg transition-all duration-150 ease-in-out ${p === playerName ? 'bg-primary text-primary-content font-semibold' : 'hover:bg-base-300'}`}
                >
                  <span className="truncate max-w-[60%]">{p}</span>
                  <span>
                    {lobby.ready[p] ? (
                      <div className="badge badge-success gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-3 h-3 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        Ready
                      </div>
                    ) : (
                      <div className="badge badge-ghost gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-3 h-3 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Waiting
                      </div>
                    )}
                  </span>
                </li>
              ))}
              {lobby.players.length === 0 && (
                <li className="text-center text-base-content/70 p-4">
                  No warriors have joined yet.
                </li>
              )}
            </ul>
          </div>
        </div>

        <button
          onClick={onReady}
          className={`btn ${ready ? 'btn-error' : 'btn-success'} btn-wide text-lg md:text-xl shadow-lg mb-4`}
          aria-pressed={ready}
        >
          {ready ? 'Cancel Ready' : 'Ready to Battle'}
        </button>

        <div className="status-message text-sm md:text-base text-center text-base-content/70 min-h-[2em]">
          {ready
            ? 'Waiting for other warriors to prepare...'
            : 'Click Ready when you are prepared for battle!'}
        </div>
      </div>
    </div>
  );
}
