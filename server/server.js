"use strict";

const http = require("http");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const MAX_NAME_LEN = 20;

/**
 * Strip non-printable ASCII characters, trim whitespace, and truncate.
 * Falls back to "Player" when the result is empty.
 */
function sanitizeName(raw) {
  if (typeof raw !== "string") return "Player";
  const cleaned = raw.replace(/[^\x20-\x7E]/g, "").trim().slice(0, MAX_NAME_LEN);
  return cleaned || "Player";
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the game files from the repository root
app.use(express.static(ROOT));

// In-memory player state: socket.id -> { id, name, x, y, kills, hp }
const players = new Map();

function buildLeaderboard() {
  return Array.from(players.values())
    .sort((a, b) => b.kills - a.kills)
    .map(({ id, name, kills }) => ({ id, name, kills }));
}

io.on("connection", (socket) => {
  console.log(`[+] ${socket.id} connected`);

  socket.on("player:join", ({ name } = {}) => {
    const safeName = sanitizeName(name);

    players.set(socket.id, {
      id: socket.id,
      name: safeName,
      x: 0,
      y: 0,
      kills: 0,
      hp: 100
    });

    // Send the joining player their confirmed name and current peer list
    socket.emit("player:welcome", {
      id: socket.id,
      name: safeName,
      players: Array.from(players.values())
    });

    // Notify all other clients
    socket.broadcast.emit("player:joined", {
      id: socket.id,
      name: safeName,
      x: 0,
      y: 0,
      kills: 0,
      hp: 100
    });

    io.emit("leaderboard:update", buildLeaderboard());
    console.log(`[join] ${safeName} (${socket.id})`);
  });

  socket.on("player:update", ({ x, y, kills, hp } = {}) => {
    const p = players.get(socket.id);
    if (!p) return;

    if (typeof x !== "number" || typeof y !== "number") return;
    if (typeof kills !== "number" || kills < 0 || kills > 1e6) return;
    if (typeof hp !== "number") return;

    const prevKills = p.kills;
    p.x = x;
    p.y = y;
    p.kills = Math.floor(kills);
    p.hp = Math.max(0, Math.min(100, hp));

    // Relay position + kills to every other client
    socket.broadcast.emit("player:state", {
      id: socket.id,
      x: p.x,
      y: p.y,
      kills: p.kills,
      hp: p.hp
    });

    // Only push a leaderboard refresh when kills actually change
    if (p.kills !== prevKills) {
      io.emit("leaderboard:update", buildLeaderboard());
    }
  });

  socket.on("disconnect", () => {
    const p = players.get(socket.id);
    if (!p) return;
    console.log(`[-] ${p.name} (${socket.id}) disconnected`);
    players.delete(socket.id);
    io.emit("player:left", { id: socket.id });
    io.emit("leaderboard:update", buildLeaderboard());
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Exploration Game server listening on http://0.0.0.0:${PORT}`);
  console.log(`LAN: open http://<your-local-ip>:${PORT} on other devices`);
});
