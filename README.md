# Exploration Game

## Background

Exploration Game is a browser-based JavaScript project focused on interactive discovery and movement through a game environment. The app appears to be built primarily for the web, with most of the implementation in JavaScript, supported by CSS for styling and HTML for structure.

## Controls

| Key / Input | Action |
|---|---|
| W / A / S / D or Arrow keys | Move |
| Click | Melee attack |
| Space | Shoot arrow |
| X | Shockwave |
| M | Meteor strike |
| R | Restart (after Game Over) |

## Running the game

### Single-player (no server required)

Open `index.html` directly in a browser, or serve it with any static server:

```sh
# Python
python -m http.server

# Node
npx serve
```

Then open `http://localhost:8000` (or the port shown) in your browser.

### Multiplayer / LAN

Multiple players on the **same network** can play together with a shared leaderboard using the included Node.js server.

#### 1. Install server dependencies

```sh
cd server
npm install
```

#### 2. Start the server

```sh
node server.js
# or:
npm start
```

The server starts on port **3000** by default.  
To use a different port: `PORT=8080 node server.js`

#### 3. Connect players

- The host opens **http://localhost:3000** in their browser.
- Other devices on the same network open **http://\<host-ip\>:3000**.

To find your local IP address:
- **macOS/Linux:** `ifconfig` or `ip a` — look for the `192.168.x.x` or `10.x.x.x` address.
- **Windows:** `ipconfig` — look for the IPv4 address under your active adapter.

#### 4. Enter a name and play

When the game loads, a name-entry overlay appears. Enter a display name and click **Play** (or wait 6 seconds for auto-dismiss with the default name "Player"). All connected players and their kill counts appear in the **Leaderboard** panel in the top-right corner.

#### Graceful single-player fallback

If the server is not running, the Socket.IO client script simply fails to load and the game continues in **single-player mode** — no errors, no blocked gameplay.

## Architecture

| File | Role |
|---|---|
| `index.html` | Game entry point, leaderboard panel, name-entry overlay |
| `game.js` | All game logic + `net` module for multiplayer sync |
| `style.css` | Styling for game UI and multiplayer UI elements |
| `server/server.js` | Node.js + Socket.IO server: player state, leaderboard broadcast |
| `server/package.json` | Server dependencies (Express, Socket.IO) |

### Network events

| Event | Direction | Payload |
|---|---|---|
| `player:join` | Client → Server | `{ name }` |
| `player:welcome` | Server → Client | `{ id, name, players[] }` |
| `player:joined` | Server → other clients | `{ id, name, x, y, kills, hp }` |
| `player:update` | Client → Server | `{ x, y, kills, hp }` (throttled ~10 Hz) |
| `player:state` | Server → other clients | `{ id, x, y, kills, hp }` |
| `player:left` | Server → all clients | `{ id }` |
| `leaderboard:update` | Server → all clients | `[{ id, name, kills }]` sorted desc |

## Tech Stack

- **JavaScript** — game logic and multiplayer networking
- **CSS** — styling and HUD layout
- **HTML** — entry point
- **Node.js + Express + Socket.IO** — multiplayer server (optional)

## Contributing

1. Create a branch for your change.
2. Keep changes focused and easy to review.
3. Test the game in the browser before submitting.
4. Document any new mechanics, controls, or developer setup requirements.

