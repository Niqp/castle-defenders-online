import React, { useState, useRef, useEffect } from 'react';

export default function WelcomeScreen({ onJoin }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  return (
    <div data-theme="night" className="w-full flex flex-col items-center justify-center p-4 font-montserrat animate-gradient-x bg-transparent">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body items-center text-center p-6 md:p-8 lg:p-10">
          <h1 className="card-title text-3xl sm:text-4xl md:text-5xl font-cinzel font-bold text-primary drop-shadow-xl mb-2 tracking-wider uppercase">
            Castle Defenders Online
          </h1>
          <p className="text-base sm:text-lg text-base-content-secondary mb-6">
            Defend your castle against waves of enemies!
          </p>
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="form-control">
              <label className="input input-bordered input-primary w-full flex items-center gap-2">
                <span className="text-base-content-secondary font-semibold tracking-wide text-sm sm:text-base">Your Name</span>
                <input
                  id="player-name" // ID is still useful for refs and accessibility
                  ref={inputRef}
                  type="text"
                  placeholder="Enter your name" // This will appear after the "Your Name" prefix
                  value={name}
                  onInput={(e) => setName(e.target.value)}
                  maxLength={16}
                  className="grow placeholder:text-base-content/50 bg-transparent focus:outline-none focus:ring-0 border-none"
                  autoComplete="off"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn btn-primary w-full text-lg font-cinzel font-bold tracking-wider uppercase"
            >
              Join Battle
            </button>
          </form>
          <div className="mt-6 text-xs text-base-content-tertiary font-mono tracking-widest select-none">
            v1.0
          </div>
        </div>
      </div>
      <div className="mt-8 text-center text-xs text-neutral-content/50 opacity-80 select-none">
        &copy; {new Date().getFullYear()} Castle Defenders Online. All rights reserved.
      </div>
    </div>
  );
}
