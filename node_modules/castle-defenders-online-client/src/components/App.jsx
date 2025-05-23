import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import WelcomeScreen from './WelcomeScreen.jsx';
import LobbyScreen from './LobbyScreen.jsx';
import GameScreen from './GameScreen.jsx';
import EndScreen from './EndScreen.jsx';
import io from 'socket.io-client';
import { EVENTS } from '../events.js';

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [playerName, setPlayerName] = useState('');
  const [lobby, setLobby] = useState({ players: [], ready: {} });
  const [gameState, setGameState] = useState(null);
  const [endStats, setEndStats] = useState(null);
  const [ready, setReady] = useState(false);
  const socketRef = useRef(null);
  const ROOM_ID = 'main';

  // Initialize socket once
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(); // Connects to same origin by default
    }
    const socket = socketRef.current;
    // Listen for lobby update
    socket.on(EVENTS.LOBBY_UPDATE, (lobbyState) => {
      setLobby(lobbyState);
      // Update local ready state for this player based on lobby update
      if (playerName && lobbyState.ready) {
        setReady(!!lobbyState.ready[playerName]);
      }
    });
    // Listen for game start
    socket.on(EVENTS.GAME_START, (gameState) => {
      setGameState(gameState);
      setScreen('game');
    });
    // Cleanup listeners on unmount
    return () => {
      socket.off(EVENTS.LOBBY_UPDATE);
      socket.off(EVENTS.GAME_START);
    };
  }, []);

  // Handle join
  function handleJoin(name) {
    setPlayerName(name);
    setScreen('lobby');
    setReady(false);
    if (socketRef.current) {
      socketRef.current.emit(EVENTS.CREATE_ROOM, ROOM_ID);
      socketRef.current.emit(EVENTS.JOIN_ROOM, ROOM_ID, name);
    }
  }

  // Keep ready state in sync with server lobby
  useEffect(() => {
    if (playerName && lobby.ready) {
      setReady(!!lobby.ready[playerName]);
    }
  }, [lobby, playerName]);

  // Handle ready toggle
  function handleReady() {
    const newReady = !ready;
    setReady(newReady);
    if (socketRef.current) {
      socketRef.current.emit(EVENTS.SET_READY, newReady);
    }
  }

  if (screen === 'welcome') {
    return <WelcomeScreen onJoin={handleJoin} />;
  }
  if (screen === 'lobby') {
    return <LobbyScreen playerName={playerName} lobby={lobby} onReady={handleReady} ready={ready} />;
  }
  if (screen === 'game') {
    return <GameScreen playerName={playerName} gameState={gameState} socketRef={socketRef} />;
  }
  if (screen === 'end') {
    return <EndScreen stats={endStats} onRestart={() => setScreen('welcome')} />;
  }
  return null;
}
