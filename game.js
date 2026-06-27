const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const healthEl = document.getElementById("health");
const killedEl = document.getElementById("killed");
const ammoEl = document.getElementById("ammoCount");
const shockEl = document.getElementById("shockStatus");
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
  bossSpawned: false
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
  regenDelay: 240,
  regenRate: 0.08,
  lastHitTime: performance.now()
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
      faceColor: "#5a2a00"
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
      faceColor: "#083808"
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
    r: 52,
    hp: 1400,
    maxHp: 1400,
    speed: 0.8,
    touchDps: 0.35,
    shootCd: 0
  };
  game.bossSpawned = true;
  bossUi.style.display = "block";
}

function shoot() {
  if (game.over || player.shootCd > 0) return;

  if (player.ammo <= 0) {
    if (player.reload <= 0) player.reload = 90;
    return;
  }

  let dx = player.dirX;
  let dy = player.dirY;
  if (dx === 0 && dy === 0) dy = 1;

  const mag = Math.hypot(dx, dy) || 1;
  dx /= mag; dy /= mag;

  game.shots.push({
    x: player.x, y: player.y,
    vx: dx * 7, vy: dy * 7,
    r: 4, dmg: 13, life: 100
  });

  player.ammo--;
  player.shootCd = 10;
}

function melee() {
  if (game.over || player.meleeCd > 0) return;
  player.meleeCd = 18;

  for (const e of game.enemies) {
    if (Math.hypot(e.x - player.x, e.y - player.y) < 58) e.hp -= 18;
  }

  if (game.boss && Math.hypot(game.boss.x - player.x, game.boss.y - player.y) < 72) {
    game.boss.hp -= 16;
  }
}

function shockwave() {
  if (game.over || player.shockCd > 0) return;
  player.shockCd = 360;

  game.shockwaves.push({
    x: player.x, y: player.y, r: 10, maxR: 260, life: 26
  });

  const radius = 230;
  const baseForce = 95;

  for (const e of game.enemies) {
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d = Math.hypot(dx, dy);

    if (d > 0 && d < radius) {
      const nx = dx / d;
      const ny = dy / d;
      const falloff = 1 - (d / radius);
      const force = baseForce * (0.35 + falloff * 1.65);

      e.x += nx * force;
      e.y += ny * force;
      e.hp -= 12;
    }
  }

  if (game.boss) {
    const dx = game.boss.x - player.x;
    const dy = game.boss.y - player.y;
    const d = Math.hypot(dx, dy);

    if (d > 0 && d < radius + 40) {
      const nx = dx / d;
      const ny = dy / d;
      const force = 36;
      game.boss.x += nx * force;
      game.boss.y += ny * force;
      game.boss.hp -= 25;
    }
  }
}

function handleInput() {
  let vx = 0, vy = 0;
  if (keys["w"] || keys["arrowup"]) vy -= 1;
  if (keys["s"] || keys["arrowdown"]) vy += 1;
  if (keys["a"] || keys["arrowleft"]) vx -= 1;
  if (keys["d"] || keys["arrowright"]) vx += 1;

  if (vx !== 0 || vy !== 0) {
    const mag = Math.hypot(vx, vy);
    vx /= mag; vy /= mag;
    player.dirX = vx; player.dirY = vy;
  }

  player.x += vx * player.speed;
  player.y += vy * player.speed;

  player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));
}

function bossShoot() {
  if (!game.boss) return;
  const b = game.boss;

  const dx = player.x - b.x;
  const dy = player.y - b.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;

  game.enemyShots.push({
    x: b.x + nx * (b.r + 6),
    y: b.y + ny * (b.r + 6),
    vx: nx * 4.4,
    vy: ny * 4.4,
    r: 7,
    life: 220,
    dmg: 12
  });
}

function update() {
  if (game.over) return;

  if (game.killed >= 100 && !game.bossSpawned) spawnBoss();
  if (Math.random() < 0.02 && game.enemies.length < 24) spawnEnemy();

  handleInput();

  if (player.shootCd > 0) player.shootCd--;
  if (player.meleeCd > 0) player.meleeCd--;
  if (player.shockCd > 0) player.shockCd--;

  if (player.reload > 0) {
    player.reload--;
    if (player.reload === 0) player.ammo = 3;
  }

  for (const s of game.shots) {
    s.x += s.vx;
    s.y += s.vy;
    s.life--;
  }

  for (const w of game.shockwaves) {
    w.r += (w.maxR - w.r) * 0.22;
    w.life--;
  }
  game.shockwaves = game.shockwaves.filter(w => w.life > 0);

  for (const e of game.enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed;
    e.y += (dy / d) * e.speed;

    if (d < e.r + player.r) {
      player.hp -= e.touchDps;
      player.lastHitTime = performance.now();
      if (player.hp <= 0) { player.hp = 0; game.over = true; }
    }
  }

  if (game.boss) {
    const b = game.boss;
    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const d = Math.hypot(dx, dy) || 1;

    b.x += (dx / d) * b.speed;
    b.y += (dy / d) * b.speed;

    if (d < b.r + player.r) {
      player.hp -= b.touchDps;
      player.lastHitTime = performance.now();
      if (player.hp <= 0) { player.hp = 0; game.over = true; }
    }

    if (b.shootCd > 0) b.shootCd--;
    else {
      bossShoot();
      b.shootCd = 40;
    }
  }

  for (const bs of game.enemyShots) {
    bs.x += bs.vx;
    bs.y += bs.vy;
    bs.life--;

    if (Math.hypot(bs.x - player.x, bs.y - player.y) < bs.r + player.r) {
      player.hp -= bs.dmg;
      player.lastHitTime = performance.now();
      bs.life = 0;
      if (player.hp <= 0) { player.hp = 0; game.over = true; }
    }
  }

  for (const s of game.shots) {
    for (const e of game.enemies) {
      if (Math.hypot(s.x - e.x, s.y - e.y) < s.r + e.r) {
        e.hp -= s.dmg;
        s.life = 0;
        break;
      }
    }
  }

  if (game.boss) {
    for (const s of game.shots) {
      if (s.life > 0 && Math.hypot(s.x - game.boss.x, s.y - game.boss.y) < s.r + game.boss.r) {
        game.boss.hp -= s.dmg;
        s.life = 0;
      }
    }
  }

  const before = game.enemies.length;
  game.enemies = game.enemies.filter(e => e.hp > 0);
  game.killed += before - game.enemies.length;

  if (game.boss && game.boss.hp <= 0) {
    game.boss = null;
    bossUi.style.display = "none";
  }

  game.shots = game.shots.filter(
    s => s.life > 0 && s.x > -30 && s.x < canvas.width + 30 && s.y > -30 && s.y < canvas.height + 30
  );

  game.enemyShots = game.enemyShots.filter(
    s => s.life > 0 && s.x > -40 && s.x < canvas.width + 40 && s.y > -40 && s.y < canvas.height + 40
  );

  const now = performance.now();
  if (!game.over && now - player.lastHitTime > player.regenDelay * (1000 / 60) && player.hp < 100) {
    player.hp = Math.min(100, player.hp + player.regenRate);
  }

  healthEl.textContent = Math.ceil(player.hp);
  killedEl.textContent = game.killed;
  ammoEl.textContent = player.ammo;

  if (player.shockCd > 0) {
    shockEl.textContent = (player.shockCd / 60).toFixed(1) + "s";
    shockEl.style.color = "#ffcc66";
  } else {
    shockEl.textContent = "READY";
    shockEl.style.color = "#66ff99";
  }

  if (game.boss) {
    bossBar.style.width = `${Math.max(0, (game.boss.hp / game.boss.maxHp) * 100)}%`;
  }
}

function drawFace(x, y, scale = 1, color = "#000") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.arc(x - 4.2 * scale, y - 2.8 * scale, 1.3 * scale, 0, Math.PI * 2);
  ctx.arc(x + 4.2 * scale, y - 2.8 * scale, 1.3 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - 4.0 * scale, y + 1.8 * scale);
  ctx.quadraticCurveTo(x - 2.2 * scale, y + 4.8 * scale, x - 0.2 * scale, y + 2.6 * scale);
  ctx.moveTo(x + 0.2 * scale, y + 2.6 * scale);
  ctx.quadraticCurveTo(x + 2.2 * scale, y + 4.8 * scale, x + 4.0 * scale, y + 1.8 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 0.7 * scale, y + 2.4 * scale);
  ctx.lineTo(x, y + 3.0 * scale);
  ctx.lineTo(x + 0.7 * scale, y + 2.4 * scale);
  ctx.stroke();

  ctx.restore();
}

function draw() {
  ctx.fillStyle = "#2b241f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const w of game.shockwaves) {
    const a = w.life / 26;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(102, 217, 255, ${0.9 * a})`;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(180, 245, 255, ${0.55 * a})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.fillStyle = "#ff0";
  for (const s of game.shots) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const s of game.enemyShots) {
    ctx.fillStyle = "#ff9a1f";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of game.enemies) {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();

    drawFace(e.x, e.y, e.type === "orange" ? 1.0 : 0.9, e.faceColor);

    ctx.fillStyle = "#f00";
    ctx.fillRect(e.x - 14, e.y - 20, 28, 4);
    ctx.fillStyle = "#0f0";
    ctx.fillRect(e.x - 14, e.y - 20, 28 * Math.max(0, e.hp / e.maxHp), 4);
  }

  if (game.boss) {
    const b = game.boss;
    ctx.fillStyle = "#a64dff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    drawFace(b.x, b.y, 2.5, "#2a003d");
  }

  ctx.fillStyle = "#e6d4a8";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
  drawFace(player.x, player.y, 1, "#000");

  ctx.fillStyle = "#ff6600";
  ctx.fillRect(player.x + player.dirX * 10 - 2, player.y + player.dirY * 10 - 2, 4, 4);

  if (game.over) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 48px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "22px Arial";
    ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = "left";
  }
}

function restart() {
  game.over = false;
  game.killed = 0;
  game.enemies = [];
  game.shots = [];
  game.shockwaves = [];
  game.enemyShots = [];
  game.boss = null;
  game.bossSpawned = false;
  bossUi.style.display = "none";

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.hp = 100;
  player.ammo = 3;
  player.shootCd = 0;
  player.reload = 0;
  player.meleeCd = 0;
  player.shockCd = 0;
  player.lastHitTime = performance.now();
}

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) e.preventDefault();

  if (key === " " && !game.over) shoot();
  if (key === "x" && !game.over) shockwave();
  if (key === "r" && game.over) restart();
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("click", melee);

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
