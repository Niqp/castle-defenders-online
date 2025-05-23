import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';

export default function WelcomeScreen({ onJoin }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  
  // Fix for input field issue - ensure focus and proper event handling
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
    <div className="welcome-screen">
      <div className="welcome-header">
        <h1>Castle Defenders Online</h1>
        <div className="welcome-subtitle">Defend your castle against waves of enemies!</div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="player-name">Your Name</label>
          <input
            id="player-name"
            ref={inputRef}
            type="text"
            placeholder="Enter your name"
            value={name}
            onInput={e => setName(e.target.value)}
            maxLength={16}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={!name.trim()}
          className="join-button"
        >
          Join Battle
        </button>
      </form>
      
      <div className="welcome-footer">
        <div className="game-version">v1.0</div>
      </div>
    </div>
  );
}
