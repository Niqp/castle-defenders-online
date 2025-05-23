# Castle Defenders Online

A cooperative, online multiplayer clicker/idle defense game. Players join via LAN, gather resources, build defenses, and protect a central castle from waves of enemies. Built with Preact, PixiJS, Node.js, Express, and Socket.IO.

## Features
- Real-time multiplayer: Join, ready-up, and play together
- Clicker/idle mechanics: Mine, hire workers, automate
- Tactical defense: Spawn units, upgrade castle, defeat waves
- No persistent database: Ephemeral state per session

## Tech Stack
- **Frontend:** Preact, Vite, PixiJS
- **Backend:** Node.js, Express, Socket.IO

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)

### Setup
1. Install dependencies:
   ```sh
   npm install
   cd client && npm install
   cd ../server && npm install
   ```
2. Start the server:
   ```sh
   cd ../server
   npm run dev
   ```
3. Start the client:
   ```sh
   cd ../client
   npm run dev
   ```
4. Open your browser to [http://localhost:5173](http://localhost:5173)

### Project Structure
- `/client` - Preact + Vite + PixiJS frontend
- `/server` - Node.js + Express + Socket.IO backend
- `/shared` - Shared types/constants (if needed)

## License
MIT
