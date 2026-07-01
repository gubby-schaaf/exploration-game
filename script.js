(() => {
  const LEADERBOARD_KEY = "exploration_leaderboard_v3";

  const playerNameInput = document.getElementById("playerNameInput");
  const openLanBtn = document.getElementById("openLanBtn");
  const refreshLanBtn = document.getElementById("refreshLanBtn");
  const lanStatus = document.getElementById("lanStatus");
  const lanGamesList = document.getElementById("lanGamesList");
  const leaderboardList = document.getElementById("leaderboardList");

  const socket = window.io ? window.io() : null;

  let board = loadBoard();
  let currentRoom = null;

  function setStatus(text) {
    if (lanStatus) lanStatus.textContent = text;
  }

  function loadBoard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveBoard() {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
  }

  function getPlayerName() {
    const val = (playerNameInput?.value || localStorage.getItem("playerName") || "Player").trim();
    return val || "Player";
  }

  function normalizeEntry(e) {
    return {
      name: String(e?.name || "Player").trim() || "Player",
      score: Number(e?.score ?? e?.kills ?? 0),
      hp: Number(e?.hp ?? 0),
      over: Boolean(e?.over),
      updatedAt: e?.updatedAt || new Date().toISOString()
    };
  }

  function upsertScore(entry) {
    const n = normalizeEntry(entry);
    const idx = board.findIndex((x) => x.name.toLowerCase() === n.name.toLowerCase());

    if (idx === -1) {
      board.push(n);
    } else if (
      n.score > board[idx].score ||
      (n.score === board[idx].score && Number(!n.over) > Number(!board[idx].over))
    ) {
      board[idx] = n;
    } else {
      board[idx].hp = n.hp;
      board[idx].over = n.over;
      board[idx].updatedAt = n.updatedAt;
    }

    board.sort((a, b) => b.score - a.score || Number(a.over) - Number(b.over));
    board = board.slice(0, 25);

    saveBoard();
    renderBoard();
  }

  function renderBoard() {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = "";

    if (!board.length) {
      const li = document.createElement("li");
      li.textContent = "No scores yet.";
      leaderboardList.appendChild(li);
      return;
    }

    board.forEach((row, i) => {
      const li = document.createElement("li");
      li.textContent = `#${i + 1} ${row.over ? "💀" : "🟢"} ${row.name} — ${row.score} kills`;
      leaderboardList.appendChild(li);
    });
  }

  function renderLanGames(hosts) {
    if (!lanGamesList) return;
    lanGamesList.innerHTML = "";

    if (!hosts.length) {
      const li = document.createElement("li");
      li.textContent = "No LAN games found.";
      lanGamesList.appendChild(li);
      return;
    }

    hosts.forEach((host) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.textContent = `Join "${host.hostName}"`;
      btn.addEventListener("click", () => {
        if (!socket) return;
        socket.emit("lan:join", {
          hostId: host.hostId,
          playerName: getPlayerName()
        });
      });

      const label = document.createElement("span");
      label.textContent = `  (${host.roomName})`;

      li.appendChild(btn);
      li.appendChild(label);
      lanGamesList.appendChild(li);
    });
  }

  if (playerNameInput) {
    const saved = localStorage.getItem("playerName") || "Player";
    playerNameInput.value = saved;

    if (window.gameState?.setPlayerName) {
      window.gameState.setPlayerName(saved);
    }

    playerNameInput.addEventListener("change", () => {
      const n = getPlayerName();
      localStorage.setItem("playerName", n);
      if (window.gameState?.setPlayerName) window.gameState.setPlayerName(n);
      if (window.gameState?.forceEmitScore) window.gameState.forceEmitScore();
    });
  }

  if (openLanBtn) {
    openLanBtn.addEventListener("click", () => {
      if (!socket) return setStatus("Socket.IO not connected.");

      const hostName = getPlayerName();
      const roomName = `room-${hostName.toLowerCase().replace(/\s+/g, "-")}-${Math.floor(Math.random() * 9999)}`;

      socket.emit("lan:open", { hostName, roomName });
    });
  }

  if (refreshLanBtn) {
    refreshLanBtn.addEventListener("click", () => {
      if (!socket) return setStatus("Socket.IO not connected.");
      socket.emit("lan:list");
    });
  }

  if (socket) {
    socket.on("connect", () => {
      setStatus("Connected. Click 'Refresh LAN Games'.");
      socket.emit("lan:list");
    });

    socket.on("lan:list:result", (hosts) => {
      renderLanGames(Array.isArray(hosts) ? hosts : []);
    });

    socket.on("lan:opened", (hostInfo) => {
      currentRoom = hostInfo.roomName;
      setStatus(`LAN open as "${hostInfo.hostName}" (${hostInfo.roomName})`);
      if (window.gameState?.forceEmitScore) window.gameState.forceEmitScore();
    });

    socket.on("lan:joined", ({ roomName, hostName }) => {
      currentRoom = roomName;
      setStatus(`Joined "${hostName}" in room ${roomName}`);
      if (window.gameState?.forceEmitScore) window.gameState.forceEmitScore();
    });

    socket.on("lan:error", ({ message }) => {
      setStatus(message || "LAN error.");
    });

    socket.on("game:update", (payload) => {
      upsertScore(payload);
    });

    socket.on("lan:player-joined", ({ playerName }) => {
      setStatus(`${playerName} joined your LAN game.`);
    });
  } else {
    setStatus("Socket.IO client missing. Add /socket.io/socket.io.js.");
  }

  window.addEventListener("score:update", (e) => {
    const payload = {
      ...normalizeEntry(e.detail || {}),
      name: getPlayerName()
    };

    upsertScore(payload);

    if (socket && currentRoom) {
      socket.emit("game:update", { roomName: currentRoom, payload });
    }
  });

  renderBoard();
})();
