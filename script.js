(() => {
  const LEADERBOARD_KEY = "exploration_leaderboard_v2";
  const ROOM_KEY = "exploration_room_name";

  // Optional UI ids (works even if some are missing)
  const leaderboardList = document.getElementById("leaderboardList");
  const playerNameInput = document.getElementById("playerNameInput");
  const roomInput = document.getElementById("roomInput");
  const exportBtn = document.getElementById("exportLeaderboardBtn");
  const importInput = document.getElementById("importLeaderboardInput");
  const clearBtn = document.getElementById("clearLeaderboardBtn");

  let board = loadBoard();
  let roomName = localStorage.getItem(ROOM_KEY) || "default-room";
  let channel = null;

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
    const idx = board.findIndex(
      (x) => x.name.toLowerCase() === n.name.toLowerCase()
    );

    if (idx === -1) {
      board.push(n);
    } else {
      const prev = board[idx];
      // better score wins; on tie prefer still alive; then latest
      const better =
        n.score > prev.score ||
        (n.score === prev.score && Number(!n.over) > Number(!prev.over));

      if (better) {
        board[idx] = n;
      } else if (n.updatedAt > prev.updatedAt) {
        board[idx].updatedAt = n.updatedAt;
        board[idx].hp = n.hp;
        board[idx].over = n.over;
      }
    }

    board.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.over !== b.over) return Number(a.over) - Number(b.over);
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });

    board = board.slice(0, 25);
    saveBoard();
    renderBoard();
  }

  function renderBoard() {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = "";

    if (!board.length) {
      const li = document.createElement("li");
      li.textContent = "No leaderboard data yet.";
      leaderboardList.appendChild(li);
      return;
    }

    board.forEach((row, i) => {
      const li = document.createElement("li");
      const status = row.over ? "💀" : "🟢";
      li.textContent = `#${i + 1} ${status} ${row.name} — ${row.score} kills (HP ${Math.max(0, Math.round(row.hp))})`;
      leaderboardList.appendChild(li);
    });
  }

  function openRoom(name) {
    if (channel) channel.close();
    channel = new BroadcastChannel(`exploration-game:${name}`);

    channel.onmessage = (event) => {
      const msg = event.data || {};
      if (msg.type === "score" && msg.payload) {
        upsertScore(msg.payload);
      } else if (msg.type === "sync-request") {
        channel.postMessage({ type: "sync-state", payload: board });
      } else if (msg.type === "sync-state" && Array.isArray(msg.payload)) {
        for (const row of msg.payload) upsertScore(row);
      }
    };

    channel.postMessage({ type: "sync-request" });
  }

  function broadcastScore(payload) {
    if (!channel) return;
    channel.postMessage({ type: "score", payload: normalizeEntry(payload) });
  }

  // Hook score updates from game.js
  window.addEventListener("score:update", (e) => {
    const payload = e.detail || {};
    upsertScore(payload);
    broadcastScore(payload);
  });

  // Player name hookup
  if (playerNameInput) {
    const existing = localStorage.getItem("playerName") || "Player";
    playerNameInput.value = existing;
    if (window.gameState?.setPlayerName) window.gameState.setPlayerName(existing);

    playerNameInput.addEventListener("change", () => {
      const name = playerNameInput.value.trim() || "Player";
      localStorage.setItem("playerName", name);
      if (window.gameState?.setPlayerName) window.gameState.setPlayerName(name);
      if (window.gameState?.forceEmitScore) window.gameState.forceEmitScore();
    });
  }

  // Room hookup
  if (roomInput) {
    roomInput.value = roomName;
    roomInput.addEventListener("change", () => {
      roomName = roomInput.value.trim() || "default-room";
      localStorage.setItem(ROOM_KEY, roomName);
      openRoom(roomName);
      if (window.gameState?.forceEmitScore) window.gameState.forceEmitScore();
    });
  }

  // Export JSON
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(board, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "jcos.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  // Import JSON
  if (importInput) {
    importInput.addEventListener("change", async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          for (const row of parsed) upsertScore(row);
        }
      } catch (err) {
        console.error("Import failed:", err);
      } finally {
        importInput.value = "";
      }
    });
  }

  // Clear leaderboard
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      board = [];
      saveBoard();
      renderBoard();
    });
  }

  // boot
  renderBoard();
  openRoom(roomName);

  // If game already loaded, emit once
  setTimeout(() => {
    if (window.gameState?.forceEmitScore) window.gameState.forceEmitScore();
  }, 50);
})();
