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
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected', 'connecting', 'disconnected'
  const reconnectTimeoutRef = useRef(null);

  // Create or read a long-lived clientId and establish a socket connection.
  useEffect(() => {
    const STORAGE_KEY = 'clientId';
    let cid = localStorage.getItem(STORAGE_KEY);
    if (!cid) {
      // Generate a UUID. Use crypto.randomUUID when available, otherwise fall back
      // to a simple polyfill (RFC4122 version-4 compliant enough for client IDs).
      const fallbackUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      cid = (crypto.randomUUID ? crypto.randomUUID() : fallbackUuid());
      localStorage.setItem(STORAGE_KEY, cid);
    }

    if (!socketRef.current) {
      try {
        socketRef.current = io('/', { 
          auth: { clientId: cid },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
          timeout: 20000,
          forceNew: false,
          autoConnect: true,
          transports: ['websocket', 'polling']
        });
      } catch (error) {
        console.error('Error creating socket connection:', error);
        setConnectionStatus('disconnected');
        return;
      }
    }
    const socket = socketRef.current;

    // Connection status handlers
    const handleConnect = () => {
      console.log('Socket connected');
      setConnectionStatus('connected');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
      
      // Don't attempt to reconnect if user manually disconnected
      if (reason === 'io client disconnect') {
        return;
      }
      
      // Attempt to reconnect after a delay
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          setConnectionStatus('connecting');
          socket.connect();
        }, 2000);
      }
    };

    const handleConnectError = (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('disconnected');
    };

    const handleReconnect = (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      setConnectionStatus('connected');
    };

    const handleReconnectAttempt = () => {
      setConnectionStatus('connecting');
    };

    const handleError = (error) => {
      console.error('Socket error:', error);
    };

    // -------------------------
    // Persistence / restore flow
    // -------------------------
    const handleShowWelcome = () => {
      navigate('/');
    };

    const handleRestoreLobby = ({ lobby: lobbyState, playerName: name }) => {
      try {
        setLobby(lobbyState);
        setPlayerName(name);
        setReady(!!lobbyState.ready?.[name]);
        navigate('/lobby');
      } catch (error) {
        console.error('Error restoring lobby:', error);
        navigate('/');
      }
    };

    const handleRestoreGame = ({ gameState: restored, playerName: name }) => {
      try {
        setGameState(restored);
        setPlayerName(name);
        navigate('/game');
      } catch (error) {
        console.error('Error restoring game:', error);
        navigate('/');
      }
    };

    const handleLobbyUpdate = (lobbyState) => {
      try {
        setLobby(lobbyState);
        if (playerName && lobbyState.ready) {
          setReady(!!lobbyState.ready[playerName]);
        }
      } catch (error) {
        console.error('Error handling lobby update:', error);
      }
    };

    const handleGameStart = (newGameState) => {
      try {
        setGameState(newGameState);
        navigate('/game');
      } catch (error) {
        console.error('Error starting game:', error);
      }
    };

    const handleGameOver = (gameOverData) => {
      try {
        console.log('Game over received:', gameOverData);
        // Format statistics for the end screen
        const formattedStats = {
          victory: gameOverData.stats?.victory || false,
          waves: gameOverData.stats?.waves || 1,
          gold: gameOverData.stats?.playerStats?.[playerName]?.gold || 0,
          units: gameOverData.stats?.playerStats?.[playerName]?.totalUnitsHired || 0,
          dps: 0, // TODO: Calculate DPS contribution if available
          message: gameOverData.message,
          playerStats: gameOverData.stats?.playerStats || {}
        };
        
        setEndStats(formattedStats);
        navigate('/end');
      } catch (error) {
        console.error('Error handling game over:', error);
      }
    };

    // Add all socket event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('error', handleError);
    
    socket.on(EVENTS.SHOW_WELCOME, handleShowWelcome);
    socket.on(EVENTS.RESTORE_LOBBY, handleRestoreLobby);
    socket.on(EVENTS.RESTORE_GAME, handleRestoreGame);
    socket.on(EVENTS.LOBBY_UPDATE, handleLobbyUpdate);
    socket.on(EVENTS.GAME_START, handleGameStart);
    socket.on(EVENTS.GAME_OVER, handleGameOver);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('error', handleError);
      
      socket.off(EVENTS.SHOW_WELCOME, handleShowWelcome);
      socket.off(EVENTS.RESTORE_LOBBY, handleRestoreLobby);
      socket.off(EVENTS.RESTORE_GAME, handleRestoreGame);
      socket.off(EVENTS.LOBBY_UPDATE, handleLobbyUpdate);
      socket.off(EVENTS.GAME_START, handleGameStart);
      socket.off(EVENTS.GAME_OVER, handleGameOver);
    };
  }, [playerName, navigate]); // Added playerName and navigate to dependency array

  function handleJoin(name, roomId) {
    try {
      const rid = roomId.toUpperCase();
      setPlayerName(name);
      setCurrentRoomId(rid);
      setReady(false); // Reset ready state on new join
      if (socketRef.current && socketRef.current.connected) {
        // Simply attempt to join; server will create the room if it does not exist.
        socketRef.current.emit(EVENTS.JOIN_ROOM, rid, name);
      } else {
        console.error('Socket not connected');
        // Try to reconnect
        socketRef.current?.connect();
      }
      navigate('/lobby');
    } catch (error) {
      console.error('Error joining room:', error);
    }
  }

  // Keep ready state in sync with server lobby
  useEffect(() => {
    if (playerName && lobby.ready) {
      setReady(!!lobby.ready[playerName]);
    }
  }, [lobby, playerName]);

  function handleReady() {
    try {
      const newReady = !ready;
      setReady(newReady);
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit(EVENTS.SET_READY, newReady);
      }
    } catch (error) {
      console.error('Error setting ready state:', error);
    }
  }

  function handleRestart() {
    try {
      // Clear all local storage to ensure fresh start
      const STORAGE_KEY = 'clientId';
      localStorage.removeItem(STORAGE_KEY);
      
      // Reset all relevant states
      setPlayerName('');
      setLobby({ players: [], ready: {} });
      setGameState(null);
      setEndStats(null);
      setReady(false);
      setCurrentRoomId('');
      setConnectionStatus('disconnected');
      
      // Disconnect the current socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      navigate('/');
      
      // Force a page reload to ensure complete state reset
      window.location.reload();
    } catch (error) {
      console.error('Error restarting:', error);
      // Force reload anyway
      window.location.reload();
    }
  }

  // This div can be styled to provide the common background
  return (
    <div className="app-container w-full h-dvh bg-base-300 text-white flex flex-col items-center justify-center relative">
      {/* Connection status indicator */}
      {connectionStatus !== 'connected' && (
        <div className="absolute top-0 left-0 right-0 z-50">
          <div className={`alert ${connectionStatus === 'connecting' ? 'alert-warning' : 'alert-error'} rounded-none`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              {connectionStatus === 'connecting' ? 'Reconnecting to server...' : 'Connection lost. Attempting to reconnect...'}
            </span>
          </div>
        </div>
      )}
      
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
