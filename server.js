const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname)));

const lanHosts = new Map();

io.on("connection", (socket) => {
  socket.on("lan:list", () => {
    socket.emit("lan:list:result", Array.from(lanHosts.values()));
  });

  socket.on("lan:open", ({ hostName, roomName }) => {
    const cleanHost = (hostName || "Host").toString().trim() || "Host";
    const cleanRoom = (roomName || `room-${socket.id.slice(0, 6)}`).toString().trim();

    const hostInfo = {
      hostId: socket.id,
      hostName: cleanHost,
      roomName: cleanRoom,
      createdAt: Date.now()
    };

    lanHosts.set(socket.id, hostInfo);
    socket.join(cleanRoom);

    io.emit("lan:list:result", Array.from(lanHosts.values()));
    socket.emit("lan:opened", hostInfo);
  });

  socket.on("lan:join", ({ hostId, playerName }) => {
    const host = lanHosts.get(hostId);
    if (!host) {
      socket.emit("lan:error", { message: "Host is no longer available." });
      return;
    }
    socket.join(host.roomName);
    socket.emit("lan:joined", { roomName: host.roomName, hostName: host.hostName });

    socket.to(host.roomName).emit("lan:player-joined", {
      playerId: socket.id,
      playerName: (playerName || "Player").toString().trim() || "Player"
    });
  });

  socket.on("game:update", ({ roomName, payload }) => {
    if (!roomName) return;
    socket.to(roomName).emit("game:update", payload);
  });

  socket.on("disconnect", () => {
    const wasHost = lanHosts.delete(socket.id);
    if (wasHost) {
      io.emit("lan:list:result", Array.from(lanHosts.values()));
    }
  });
});

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

server.listen(PORT, () => {
  const ip = getLocalIp();
  console.log(`Server running:`);
  console.log(`  Local: http://localhost:${PORT}`);
  console.log(`  LAN:   http://${ip}:${PORT}`);
});
