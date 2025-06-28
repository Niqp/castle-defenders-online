import React, { useState, useRef, useEffect } from 'react';

export default function WelcomeScreen({ onJoin }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const nameInputRef = useRef(null);
  const roomInputRef = useRef(null);

  // Focus the name field on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedRoom = room.trim().toUpperCase();
    if (!trimmedName || trimmedRoom.length !== 4) return;
    onJoin(trimmedName, trimmedRoom);
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
                  id="player-name"
                  ref={nameInputRef}
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onInput={(e) => setName(e.target.value)}
                  maxLength={16}
                  className="grow placeholder:text-base-content/50 bg-transparent focus:outline-none focus:ring-0 border-none"
                  autoComplete="off"
                />
              </label>
            </div>
            <div className="form-control">
              <label className="input input-bordered input-secondary w-full flex items-center gap-2">
                <span className="text-base-content-secondary font-semibold tracking-wide text-sm sm:text-base">Room&nbsp;Code</span>
                <input
                  id="room-code"
                  ref={roomInputRef}
                  type="text"
                  placeholder="ABCD"
                  value={room}
                  onInput={(e) => setRoom(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                  maxLength={4}
                  className="grow placeholder:text-base-content/50 bg-transparent uppercase tracking-widest focus:outline-none focus:ring-0 border-none"
                  autoComplete="off"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!name.trim() || room.length !== 4}
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
