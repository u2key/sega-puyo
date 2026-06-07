/**
 * Online Puyo Puyo Battle WebSocket Server
 * Node.js + ws library
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 25565;
const STATIC_DIR = path.join(__dirname);

// ── Static file server ─────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.gif':  'image/gif',
};

const httpServer = http.createServer((req, res) => {
  let filePath = path.join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

// ── WebSocket server ────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

/**
 * Room management
 * A room holds exactly 2 players.
 * roomId -> { players: [ws, ws], seed: number }
 */
const waitingRoom = [];   // queue of single clients waiting for a match
const rooms = new Map();  // roomId -> { players, seed }
let nextRoomId = 1;

function broadcast(room, msg, except = null) {
  for (const player of room.players) {
    if (player !== except && player.readyState === 1 /* OPEN */) {
      player.send(JSON.stringify(msg));
    }
  }
}

function sendTo(ws, msg) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(msg));
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.roomId = null;
  ws.playerIndex = null;

  // Put this client into the waiting queue
  waitingRoom.push(ws);

  // Try to create a room if 2 players are waiting
  if (waitingRoom.length >= 2) {
    const p1 = waitingRoom.shift();
    const p2 = waitingRoom.shift();
    const roomId = nextRoomId++;
    const seed = Math.floor(Math.random() * 1_000_000);

    const room = { players: [p1, p2], seed };
    rooms.set(roomId, room);

    p1.roomId = roomId;
    p1.playerIndex = 0;
    p2.roomId = roomId;
    p2.playerIndex = 1;

    // Notify both players
    sendTo(p1, { type: 'matched', playerIndex: 0, seed });
    sendTo(p2, { type: 'matched', playerIndex: 1, seed });
    console.log(`Room ${roomId} created. Seed: ${seed}`);
  } else {
    sendTo(ws, { type: 'waiting' });
  }

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const room = rooms.get(ws.roomId);
    if (!room) return;

    switch (msg.type) {
      /**
       * Client sends its current board state every frame (compact format)
       * { type:'board', board: [[...], ...] }
       * We relay this to the opponent so they can display it.
       */
      case 'board':
        broadcast(room, {
          type: 'opponentBoard',
          board: msg.board,
          nextPuyos: msg.nextPuyos,
          score: msg.score,
          garbage: msg.garbage,
        }, ws);
        break;

      /**
       * Client sends damage (ojama count) to opponent
       * { type:'damage', ojama: N }
       */
      case 'damage':
        broadcast(room, {
          type: 'receiveOjama',
          ojama: msg.ojama,
        }, ws);
        break;

      /**
       * Client says game over (they lost)
       * { type:'gameOver' }
       */
      case 'gameOver':
        broadcast(room, { type: 'opponentGameOver' }, ws);
        rooms.delete(ws.roomId);
        break;

      /**
       * Client sends a chat/ready message
       */
      case 'ready':
        broadcast(room, { type: 'opponentReady' }, ws);
        break;

      default:
        break;
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Remove from waiting queue if still there
    const idx = waitingRoom.indexOf(ws);
    if (idx !== -1) waitingRoom.splice(idx, 1);

    // Notify room partner
    const room = rooms.get(ws.roomId);
    if (room) {
      broadcast(room, { type: 'opponentDisconnected' }, ws);
      rooms.delete(ws.roomId);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎮 Puyo Puyo Online server running at http://localhost:${PORT}`);
});
