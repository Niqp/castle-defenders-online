export const EVENTS = {
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  LIST_ROOMS: 'listRooms',
  ROOMS_LIST: 'roomsList',

  LOBBY_UPDATE: 'lobbyUpdate',
  SET_READY: 'setReady',
  MINE: 'mine',
  HIRE_WORKER: 'hireWorker',
  SPAWN_UNIT: 'spawnUnit',

  RESOURCE_UPDATE: 'resourceUpdate',
  UNIT_UPDATE: 'unitUpdate',
  GAME_START: 'gameStart',
  SPAWN_ENEMIES: 'spawnEnemies',
  SPAWN_UNITS: 'spawnUnits',
  STATE_UPDATE: 'stateUpdate',
  GAME_OVER: 'gameOver',

  // Client persistence events (should mirror server names)
  SHOW_WELCOME: 'showWelcome',
  RESTORE_LOBBY: 'restoreLobby',
  RESTORE_GAME: 'restoreGame'
};
