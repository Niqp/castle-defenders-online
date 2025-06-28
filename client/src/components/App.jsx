import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import WelcomeScreen from './WelcomeScreen.jsx';
import LobbyScreen from './LobbyScreen.jsx';
import GameScreen from './GameScreen.jsx';
import EndScreen from './EndScreen.jsx';
import io from 'socket.io-client';
import { EVENTS } from '../events.js';

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [lobby, setLobby] = useState({ players: [], ready: {} });
  const [gameState, setGameState] = useState(null);
  const [endStats, setEndStats] = useState(null); // Assuming you'll set this when game ends
  const [ready, setReady] = useState(false);
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const [currentRoomId, setCurrentRoomId] = useState('');

  // Create or read a long-lived clientId and establish a socket connection.
  useEffect(() => {
    const STORAGE_KEY = 'clientId';
    let cid = localStorage.getItem(STORAGE_KEY);
    if (!cid) {
      // Generate a UUID using the browser's crypto API
      cid = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, cid);
    }

    if (!socketRef.current) {
      socketRef.current = io('/', { auth: { clientId: cid } });
    }
    const socket = socketRef.current;

    // -------------------------
    // Persistence / restore flow
    // -------------------------
    const handleShowWelcome = () => {
      navigate('/');
    };

    const handleRestoreLobby = ({ lobby: lobbyState, playerName: name }) => {
      setLobby(lobbyState);
      setPlayerName(name);
      setReady(!!lobbyState.ready?.[name]);
      navigate('/lobby');
    };

    const handleRestoreGame = ({ gameState: restored, playerName: name }) => {
      setGameState(restored);
      setPlayerName(name);
      navigate('/game');
    };

    const handleLobbyUpdate = (lobbyState) => {
      setLobby(lobbyState);
      if (playerName && lobbyState.ready) {
        setReady(!!lobbyState.ready[playerName]);
      }
    };

    const handleGameStart = (newGameState) => {
      setGameState(newGameState);
      navigate('/game');
    };

    // TODO: Add listener for game end to navigate to /end and setEndStats
    // Example: socket.on(EVENTS.GAME_END, (stats) => { setEndStats(stats); navigate('/end'); });

    socket.on(EVENTS.SHOW_WELCOME, handleShowWelcome);
    socket.on(EVENTS.RESTORE_LOBBY, handleRestoreLobby);
    socket.on(EVENTS.RESTORE_GAME, handleRestoreGame);
    socket.on(EVENTS.LOBBY_UPDATE, handleLobbyUpdate);
    socket.on(EVENTS.GAME_START, handleGameStart);

    return () => {
      socket.off(EVENTS.SHOW_WELCOME, handleShowWelcome);
      socket.off(EVENTS.RESTORE_LOBBY, handleRestoreLobby);
      socket.off(EVENTS.RESTORE_GAME, handleRestoreGame);
      socket.off(EVENTS.LOBBY_UPDATE, handleLobbyUpdate);
      socket.off(EVENTS.GAME_START, handleGameStart);
      // TODO: socket.off(EVENTS.GAME_END, ...);
    };
  }, [playerName, navigate]); // Added playerName and navigate to dependency array

  function handleJoin(name, roomId) {
    const rid = roomId.toUpperCase();
    setPlayerName(name);
    setCurrentRoomId(rid);
    setReady(false); // Reset ready state on new join
    if (socketRef.current) {
      // Simply attempt to join; server will create the room if it does not exist.
      socketRef.current.emit(EVENTS.JOIN_ROOM, rid, name);
    }
    navigate('/lobby');
  }

  // Keep ready state in sync with server lobby
  useEffect(() => {
    if (playerName && lobby.ready) {
      setReady(!!lobby.ready[playerName]);
    }
  }, [lobby, playerName]);

  function handleReady() {
    const newReady = !ready;
    setReady(newReady);
    if (socketRef.current) {
      socketRef.current.emit(EVENTS.SET_READY, newReady);
    }
  }

  function handleRestart() {
    // Reset relevant states if needed, e.g., playerName, lobby, gameState
    // setPlayerName(''); // Example: uncomment if player needs to re-enter name
    // setLobby({ players: [], ready: {} });
    // setGameState(null);
    // setEndStats(null);
    // setReady(false);
    navigate('/');
  }

  // This div can be styled to provide the common background
  return (
    <div className="app-container w-full h-screen bg-base-300 text-white flex flex-col items-center justify-center">
      {/* You can add a common header or background elements here if they are outside the routed content */}
      {/* For example: <img src="/path/to/background.jpg" className="absolute top-0 left-0 w-full h-full object-cover -z-10" /> */}
      <Routes>
        <Route path="/" element={<WelcomeScreen onJoin={handleJoin} />} />
        <Route path="/lobby" element={<LobbyScreen playerName={playerName} lobby={lobby} onReady={handleReady} ready={ready} />} />
        <Route path="/game" element={<GameScreen playerName={playerName} gameState={gameState} socketRef={socketRef} />} />
        <Route path="/end" element={<EndScreen stats={endStats} onRestart={handleRestart} />} />
        {/* Optional: Add a catch-all route for 404 Not Found */}
        {/* <Route path="*" element={<div>Page Not Found</div>} /> */}
      </Routes>
    </div>
  );
}
