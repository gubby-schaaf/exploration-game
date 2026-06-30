const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const healthEl = document.getElementById("health");
const killedEl = document.getElementById("killed");
const ammoEl = document.getElementById("ammoCount");
const shockEl = document.getElementById("shockStatus");
const meteorEl = document.getElementById("meteorStatus");
const bossUi = document.getElementById("bossUi");
const bossBar = document.getElementById("bossBar");

const keys = Object.create(null);

const game = {
  over: false,
  killed: 0,
  enemies: [],
  shots: [],
  shockwaves: [],
  enemyShots: [],
  boss: null,
  bossSpawned: false,
  meteors: [],
  meteorDust: [],
  impactDust: [],
  screenShake: 0,
  meleeSlashes: []
};

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  r: 13,
  speed: 3.2,
  hp: 100,
  dirX: 0,
  dirY: 1,
  ammo: 3,
  shootCd: 0,
  reload: 0,
  meleeCd: 0,
  shockCd: 0,
  meteorCd: 0,
  regenDelay: 240,
  regenRate: 0.08,
  lastHitTime: performance.now(),
  name: localStorage.getItem("playerName") || "Player"
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x, y;

  if (side === 0) { x = rand(0, canvas.width); y = -20; }
  else if (side === 1) { x = canvas.width + 20; y = rand(0, canvas.height); }
  else if (side === 2) { x = rand(0, canvas.width); y = canvas.height + 20; }
  else { x = -20; y = rand(0, canvas.height); }

  const orangeMode = game.killed >= 100;
  if (orangeMode) {
    game.enemies.push({
      type: "orange",
      x, y,
      r: 14,
      hp: 50,
      maxHp: 50,
      speed: rand(1.0, 1.7),
      touchDps: 0.22,
      color: "#ff8c1a",
      faceColor: "#5a2a00",
      hitFlash: 0,
      attackFlash: 0
    });
  } else {
    game.enemies.push({
      type: "green",
      x, y,
      r: 12,
      hp: 25,
      maxHp: 25,
      speed: rand(0.8, 1.4),
      touchDps: 0.12,
      color: "#2cff2c",
      faceColor: "#083808",
      hitFlash: 0,
      attackFlash: 0
    });
  }
}

function spawnBoss() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = rand(120, canvas.width - 120); y = -70; }
  else if (side === 1) { x = canvas.width + 70; y = rand(120, canvas.height - 120); }
  else if (side === 2) { x = rand(120, canvas.width - 120); y = canvas.height + 70; }
  else { x = -70; y = rand(120, canvas.height - 120); }

  game.boss = {
    x, y,
    r: 38,
    hp: 1200,
    maxHp: 1200,
    speed: 0.8,
    shotCd: 0,
    touchDps: 0.38
  };
  game.bossSpawned = true;
  bossUi.style.display = "block";
  updateBossUi();
}

function spawnImpact(x, y, color, count = 16, speedMin = 0.8, speedMax = 3.2, life = 28, size = 2.2) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(speedMin, speedMax);
    game.impactDust.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life + Math.random() * 10,
      maxLife: life,
      size: rand(size * 0.7, size * 1.3),
      color
    });
  }
}

function spawnMeteorDust(x, y) {
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(0.4, 1.2);
    game.meteorDust.push({
      x: x + rand(-6, 6),
      y: y + rand(-6, 6),
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(18, 34)
    });
  }
}

function fireBullet() {
  if (player.ammo <= 0) return;
  if (player.shootCd > 0) return;

  const mag = Math.hypot(player.dirX, player.dirY) || 1;
  const dx = player.dirX / mag;
  const dy = player.dirY / mag;

  game.shots.push({
    x: player.x + dx * (player.r + 3),
    y: player.y + dy * (player.r + 3),
    vx: dx * 8.3,
    vy: dy * 8.3,
    r: 4,
    dmg: 12,
    life: 120
  });

  player.ammo -= 1;
  player.shootCd = 14;
  if (player.ammo <= 0) player.reload = 70;
}

function doMelee(mx, my) {
  if (player.meleeCd > 0) return;
  player.meleeCd = 22;

  const dx = mx - player.x;
  const dy = my - player.y;
  const mag = Math.hypot(dx, dy) || 1;
  const nx = dx / mag;
  const ny = dy / mag;

  const slash = {
    x: player.x + nx * 26,
    y: player.y + ny * 26,
    nx, ny,
    life: 8
  };
  game.meleeSlashes.push(slash);

  const range = 58;
  const width = 32;

  for (const e of game.enemies) {
    const ex = e.x - player.x;
    const ey = e.y - player.y;
    const forward = ex * nx + ey * ny;
    const side = Math.abs(ex * ny - ey * nx);

    if (forward > 0 && forward < range && side < width) {
      e.hp -= 22;
      e.hitFlash = 4;
      spawnImpact(e.x, e.y, "#ffd6a5", 10, 0.7, 2.2, 16, 2.0);
    }
  }

  if (game.boss) {
    const ex = game.boss.x - player.x;
    const ey = game.boss.y - player.y;
    const forward = ex * nx + ey * ny;
    const side = Math.abs(ex * ny - ey * nx);
    if (forward > 0 && forward < range + 16 && side < width + 18) {
      game.boss.hp -= 14;
      spawnImpact(game.boss.x, game.boss.y, "#d9b3ff", 14, 0.8, 2.6, 18, 2.2);
      updateBossUi();
    }
  }
}

function castShockwave() {
  if (player.shockCd > 0) return;
  player.shockCd = 220;
  game.shockwaves.push({
    x: player.x,
    y: player.y,
    r: 10,
    maxR: 220,
    speed: 7.5,
    hit: new Set()
  });
}

function castMeteorStrike() {
  if (player.meteorCd > 0) return;
  player.meteorCd = 380;

  for (let i = 0; i < 3; i++) {
    game.meteors.push({
      x: rand(80, canvas.width - 80),
      y: -60 - i * 40,
      vx: rand(-0.6, 0.6),
      vy: rand(6.0, 7.2),
      r: rand(14, 22),
      life: 240
    });
  }
}

function damagePlayer(dmg) {
  if (game.over) return;
  player.hp -= dmg;
  player.lastHitTime = performance.now();
  game.screenShake = Math.max(game.screenShake, 4);
  if (player.hp <= 0) {
    player.hp = 0;
    game.over = true;

    // Final emit for leaderboard
    emitScoreUpdate();
  }
}

function updateBossUi() {
  if (!game.boss) {
    bossUi.style.display = "none";
    return;
  }
  const pct = Math.max(0, game.boss.hp / game.boss.maxHp) * 100;
  bossBar.style.width = pct + "%";
}

function circleHit(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = a.r + b.r;
  return dx * dx + dy * dy <= rr * rr;
}

function clampPlayer() {
  player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));
}

function updateHud() {
  healthEl.textContent = Math.round(player.hp);
  killedEl.textContent = game.killed;
  ammoEl.textContent = player.reload > 0 ? "RELOADING" : player.ammo;

  shockEl.textContent = player.shockCd > 0 ? Math.ceil(player.shockCd / 60) + "s" : "READY";
  meteorEl.textContent = player.meteorCd > 0 ? Math.ceil(player.meteorCd / 60) + "s" : "READY";
}

// --- Leaderboard/LAN hook ---
function emitScoreUpdate() {
  window.dispatchEvent(new CustomEvent("score:update", {
    detail: {
      name: player.name || "Player",
      score: game.killed,
      hp: Math.round(player.hp),
      over: game.over
    }
  }));
}

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    fireBullet();
  } else if (e.key.toLowerCase() === "x") {
    castShockwave();
  } else if (e.key.toLowerCase() === "m") {
    castMeteorStrike();
  } else if (e.key.toLowerCase() === "r") {
    if (game.over) location.reload();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  doMelee(mx, my);
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  const dx = mx - player.x;
  const dy = my - player.y;
  const m = Math.hypot(dx, dy) || 1;
  player.dirX = dx / m;
  player.dirY = dy / m;
});

let enemySpawnTimer = 0;

function update() {
  if (game.over) return;

  // Movement
  let mvx = 0, mvy = 0;
  if (keys["w"] || keys["arrowup"]) mvy -= 1;
  if (keys["s"] || keys["arrowdown"]) mvy += 1;
  if (keys["a"] || keys["arrowleft"]) mvx -= 1;
  if (keys["d"] || keys["arrowright"]) mvx += 1;

  if (mvx || mvy) {
    const m = Math.hypot(mvx, mvy);
    mvx /= m;
    mvy /= m;
    player.x += mvx * player.speed;
    player.y += mvy * player.speed;
  }
  clampPlayer();

  // Cooldowns
  if (player.shootCd > 0) player.shootCd--;
  if (player.reload > 0) {
    player.reload--;
    if (player.reload <= 0) player.ammo = 3;
  }
  if (player.meleeCd > 0) player.meleeCd--;
  if (player.shockCd > 0) player.shockCd--;
  if (player.meteorCd > 0) player.meteorCd--;

  // Regen
  const sinceHit = performance.now() - player.lastHitTime;
  if (sinceHit > player.regenDelay && player.hp < 100) {
    player.hp = Math.min(100, player.hp + player.regenRate);
  }

  // Spawn enemies
  enemySpawnTimer--;
  const spawnRate = game.killed < 40 ? 30 : game.killed < 100 ? 22 : 16;
  if (enemySpawnTimer <= 0) {
    spawnEnemy();
    if (Math.random() < 0.08 + Math.min(0.25, game.killed * 0.002)) spawnEnemy();
    enemySpawnTimer = spawnRate;
  }

  // Spawn boss once
  if (!game.bossSpawned && game.killed >= 200) {
    spawnBoss();
  }

  // Shots update
  for (let i = game.shots.length - 1; i >= 0; i--) {
    const s = game.shots[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life--;

    let removed = false;

    // enemy hit
    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const e = game.enemies[j];
      if (circleHit(s, e)) {
        e.hp -= s.dmg;
        e.hitFlash = 3;
        spawnImpact(s.x, s.y, "#fff5b1", 8, 0.6, 2.0, 14, 1.8);
        game.shots.splice(i, 1);
        removed = true;
        break;
      }
    }
    if (removed) continue;

    // boss hit
    if (game.boss && circleHit(s, game.boss)) {
      game.boss.hp -= s.dmg * 0.8;
      spawnImpact(s.x, s.y, "#e9ccff", 10, 0.6, 2.2, 16, 2.0);
      updateBossUi();
      game.shots.splice(i, 1);
      continue;
    }

    if (
      s.life <= 0 ||
      s.x < -20 || s.x > canvas.width + 20 ||
      s.y < -20 || s.y > canvas.height + 20
    ) {
      game.shots.splice(i, 1);
    }
  }

  // Shockwaves
  for (let i = game.shockwaves.length - 1; i >= 0; i--) {
    const w = game.shockwaves[i];
    w.r += w.speed;

    for (const e of game.enemies) {
      if (w.hit.has(e)) continue;
      const dx = e.x - w.x;
      const dy = e.y - w.y;
      const d = Math.hypot(dx, dy);
      if (d <= w.r + e.r && d >= w.r - 14) {
        w.hit.add(e);
        e.hp -= 18;
        e.hitFlash = 3;
        spawnImpact(e.x, e.y, "#9ae6ff", 8, 0.8, 2.1, 14, 1.8);
      }
    }

    if (game.boss && !w.hit.has(game.boss)) {
      const dx = game.boss.x - w.x;
      const dy = game.boss.y - w.y;
      const d = Math.hypot(dx, dy);
      if (d <= w.r + game.boss.r && d >= w.r - 16) {
        w.hit.add(game.boss);
        game.boss.hp -= 10;
        spawnImpact(game.boss.x, game.boss.y, "#cfefff", 10, 0.8, 2.3, 16, 2.0);
        updateBossUi();
      }
    }

    if (w.r >= w.maxR) game.shockwaves.splice(i, 1);
  }

  // Meteors
  for (let i = game.meteors.length - 1; i >= 0; i--) {
    const m = game.meteors[i];
    m.x += m.vx;
    m.y += m.vy;
    m.life--;

    spawnMeteorDust(m.x, m.y);

    let impacted = false;
    if (m.y > canvas.height - 20 || m.life <= 0) impacted = true;

    if (impacted) {
      const R = 90;
      for (const e of game.enemies) {
        const dx = e.x - m.x;
        const dy = e.y - m.y;
        const d = Math.hypot(dx, dy);
        if (d <= R) {
          const falloff = 1 - d / R;
          e.hp -= 42 * Math.max(0.25, falloff);
          e.hitFlash = 4;
        }
      }

      if (game.boss) {
        const dx = game.boss.x - m.x;
        const dy = game.boss.y - m.y;
        const d = Math.hypot(dx, dy);
        if (d <= R + 40) {
          const falloff = 1 - d / (R + 40);
          game.boss.hp -= 30 * Math.max(0.2, falloff);
          updateBossUi();
        }
      }

      spawnImpact(m.x, Math.min(m.y, canvas.height - 8), "#ffb86b", 32, 1.2, 4.0, 26, 2.6);
      game.screenShake = Math.max(game.screenShake, 10);

      game.meteors.splice(i, 1);
    }
  }

  // Enemies move/attack
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed;
    e.y += (dy / d) * e.speed;

    if (e.hitFlash > 0) e.hitFlash--;
    if (e.attackFlash > 0) e.attackFlash--;

    if (circleHit(e, player)) {
      damagePlayer(e.touchDps);
      e.attackFlash = 2;
    }

    if (e.hp <= 0) {
      spawnImpact(e.x, e.y, e.type === "orange" ? "#ff9f43" : "#9dff9d", 14, 0.8, 2.8, 18, 2.0);
      game.enemies.splice(i, 1);
      game.killed++;
      emitScoreUpdate(); // leaderboard update on kill
    }
  }

  // Boss logic
  if (game.boss) {
    const b = game.boss;
    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const d = Math.hypot(dx, dy) || 1;

    b.x += (dx / d) * b.speed;
    b.y += (dy / d) * b.speed;

    if (circleHit(b, player)) {
      damagePlayer(b.touchDps);
    }

    // boss ranged attack
    b.shotCd--;
    if (b.shotCd <= 0) {
      b.shotCd = 65;
      const vx = (dx / d) * 3.7;
      const vy = (dy / d) * 3.7;
      game.enemyShots.push({
        x: b.x, y: b.y,
        vx, vy,
        r: 7,
        dmg: 11,
        life: 220
      });
    }

    if (b.hp <= 0) {
      spawnImpact(b.x, b.y, "#f0c8ff", 54, 1.0, 4.8, 34, 2.8);
      game.boss = null;
      bossUi.style.display = "none";
      game.killed += 50;
      emitScoreUpdate();
    }
  }

  // Enemy shots
  for (let i = game.enemyShots.length - 1; i >= 0; i--) {
    const s = game.enemyShots[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life--;

    if (circleHit(s, player)) {
      damagePlayer(s.dmg);
      spawnImpact(s.x, s.y, "#ff7a7a", 8, 0.7, 2.0, 14, 1.8);
      game.enemyShots.splice(i, 1);
      continue;
    }

    if (s.life <= 0 || s.x < -30 || s.x > canvas.width + 30 || s.y < -30 || s.y > canvas.height + 30) {
      game.enemyShots.splice(i, 1);
    }
  }

  // FX particles
  for (let i = game.meteorDust.length - 1; i >= 0; i--) {
    const p = game.meteorDust[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) game.meteorDust.splice(i, 1);
  }

  for (let i = game.impactDust.length - 1; i >= 0; i--) {
    const p = game.impactDust[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life--;
    if (p.life <= 0) game.impactDust.splice(i, 1);
  }

  for (let i = game.meleeSlashes.length - 1; i >= 0; i--) {
    const s = game.meleeSlashes[i];
    s.life--;
    if (s.life <= 0) game.meleeSlashes.splice(i, 1);
  }

  if (game.screenShake > 0) game.screenShake *= 0.82;

  updateHud();
}

function drawBackground() {
  ctx.fillStyle = "#2b241f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  const ang = Math.atan2(player.dirY, player.dirX);
  ctx.rotate(ang);

  ctx.fillStyle = "#3fa9ff";
  ctx.beginPath();
  ctx.arc(0, 0, player.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#dff3ff";
  ctx.fillRect(player.r - 2, -3, 16, 6);

  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.hitFlash > 0) {
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 10;
  }
  if (e.attackFlash > 0) {
    ctx.shadowColor = "#ff4d4d";
    ctx.shadowBlur = 12;
  }

  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.arc(0, 0, e.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = e.faceColor;
  ctx.beginPath();
  ctx.arc(-4, -3, 2.2, 0, Math.PI * 2);
  ctx.arc(4, -3, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBoss(b) {
  ctx.save();
  ctx.translate(b.x, b.y);

  ctx.shadowColor = "#b575ff";
  ctx.shadowBlur = 14;

  ctx.fillStyle = "#8a2be2";
  ctx.beginPath();
  ctx.arc(0, 0, b.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2e7ff";
  ctx.beginPath();
  ctx.arc(-10, -7, 4, 0, Math.PI * 2);
  ctx.arc(10, -7, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function draw() {
  const shake = game.screenShake;
  let ox = 0, oy = 0;
  if (shake > 0.2) {
    ox = rand(-shake, shake);
    oy = rand(-shake, shake);
  }

  ctx.save();
  ctx.translate(ox, oy);

  drawBackground();

  // Shockwaves
  for (const w of game.shockwaves) {
    ctx.strokeStyle = "rgba(120,220,255,0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Meteors
  for (const m of game.meteors) {
    ctx.fillStyle = "#ff9f43";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Meteor dust
  for (const p of game.meteorDust) {
    const a = Math.max(0, p.life / 34);
    ctx.fillStyle = `rgba(255,170,90,${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bullets
  ctx.fillStyle = "#ffd166";
  for (const s of game.shots) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemy shots
  ctx.fillStyle = "#ff5d73";
  for (const s of game.enemyShots) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemies
  for (const e of game.enemies) drawEnemy(e);

  // Boss
  if (game.boss) drawBoss(game.boss);

  // Melee slashes
  for (const s of game.meleeSlashes) {
    const alpha = s.life / 8;
    ctx.strokeStyle = `rgba(255,245,200,${alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    const px = player.x + s.nx * 20;
    const py = player.y + s.ny * 20;
    ctx.arc(px, py, 28, Math.atan2(s.ny, s.nx) - 0.75, Math.atan2(s.ny, s.nx) + 0.75);
    ctx.stroke();
  }

  // Impact dust
  for (const p of game.impactDust) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color.startsWith("#")
      ? hexToRgba(p.color, alpha)
      : p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPlayer();

  // Game over overlay
  if (game.over) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 54px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "24px Arial";
    ctx.fillText(`Killed: ${game.killed}`, canvas.width / 2, canvas.height / 2 + 24);
    ctx.font = "18px Arial";
    ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 58);
  }

  ctx.restore();
}

function hexToRgba(hex, a) {
  const m = hex.replace("#", "");
  const full = m.length === 3
    ? m.split("").map((c) => c + c).join("")
    : m;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${a})`;
}

// --- Expose minimal API for script.js ---
window.gameState = {
  getPlayer: () => ({
    name: player.name || "Player",
    hp: Math.round(player.hp),
    kills: game.killed,
    over: game.over
  }),
  setPlayerName: (name) => {
    player.name = (name || "Player").trim() || "Player";
    localStorage.setItem("playerName", player.name);
    emitScoreUpdate();
  },
  forceEmitScore: () => emitScoreUpdate()
};

function tick() {
  update();
  draw();
  requestAnimationFrame(tick);
}

// Initial sync for leaderboard
emitScoreUpdate();
tick();
