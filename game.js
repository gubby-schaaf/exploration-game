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
    r: 52,
    hp: 1400,
    maxHp: 1400,
    speed: 0.8,
    touchDps: 0.35,
    shootCd: 0,
    hitFlash: 0,
    attackFlash: 0
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

  // Determine attack direction
  let dx = player.dirX;
  let dy = player.dirY;
  if (dx === 0 && dy === 0) dy = 1;
  const angle = Math.atan2(dy, dx);

  // Spawn melee slash animation
  game.meleeSlashes.push({
    x: player.x,
    y: player.y,
    angle,
    life: 18,
    maxLife: 18,
    r: 58
  });

  for (const e of game.enemies) {
    if (Math.hypot(e.x - player.x, e.y - player.y) < 58) {
      e.hp -= 18;
      e.hitFlash = 10;
    }
  }

  if (game.boss && Math.hypot(game.boss.x - player.x, game.boss.y - player.y) < 72) {
    game.boss.hp -= 16;
    game.boss.hitFlash = 10;
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

function createMeteor(x, hitY, delay = 0) {
  return {
    x,
    y: -120,
    vx: rand(-0.6, 0.6),
    vy: rand(8.8, 10.8),
    r: rand(36, 50),
    rot: rand(0, Math.PI * 2),
    rotSpeed: rand(-0.06, 0.06),
    hitY,
    delay
  };
}

function meteorStrike() {
  if (game.over || player.meteorCd > 0 || game.meteors.length > 0) return;

  player.meteorCd = 60 * 60; // 1 minute at 60fps

  const centerX = rand(240, canvas.width - 240);
  const centerHitY = rand(canvas.height * 0.4, canvas.height * 0.7);
  const spacing = 170;

  game.meteors.push(
    createMeteor(Math.max(70, centerX - spacing), centerHitY + rand(-40, 20), 0),
    createMeteor(centerX, centerHitY + rand(-10, 10), 12),
    createMeteor(Math.min(canvas.width - 70, centerX + spacing), centerHitY + rand(-20, 40), 24)
  );
}

function applyMeteorImpact(mx, my) {
  for (const e of game.enemies) {
    if (e.hp > 0) {
      const half = Math.ceil(e.maxHp * 0.5 );
      e.hp = Math.min(e.hp, half);
    }
  }

  for (let i = 0; i < 90; i++) {
    const a = rand(0, Math.PI * 2);
    const speed = rand(1.2, 6.2);
    game.impactDust.push({
      x: mx + Math.cos(a) * rand(0, 14),
      y: my + Math.sin(a) * rand(0, 8),
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - rand(0.2, 1.8),
      life: rand(20, 42),
      maxLife: 42,
      size: rand(1.8, 5.2),
      color: Math.random() < 0.55 ? "#c49a6c" : "#8a6a4f"
    });
  }

  game.screenShake = 18;
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
  if (player.meteorCd > 0) player.meteorCd--;

  if (player.reload > 0) {
    player.reload--;
    if (player.reload === 0) player.ammo = 3;
  }

  // Update melee slashes
  for (const slash of game.meleeSlashes) {
    slash.life--;
  }
  game.meleeSlashes = game.meleeSlashes.filter(s => s.life > 0);

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

  for (const meteor of game.meteors) {
    if (meteor.delay > 0) {
      meteor.delay--;
      continue;
    }

    meteor.x += meteor.vx;
    meteor.y += meteor.vy;
    meteor.rot += meteor.rotSpeed;

    for (let i = 0; i < 4; i++) {
      game.meteorDust.push({
        x: meteor.x + rand(-8, 8),
        y: meteor.y + rand(-8, 8),
        vx: rand(-0.9, 0.9),
        vy: rand(0.8, 2.4),
        life: rand(14, 26),
        maxLife: 26,
        size: rand(1.4, 3.4)
      });
    }
  }

  const remainingMeteors = [];
  for (const meteor of game.meteors) {
    if (meteor.delay > 0) {
      remainingMeteors.push(meteor);
    } else if (meteor.y >= meteor.hitY) {
      applyMeteorImpact(meteor.x, meteor.y);
    } else {
      remainingMeteors.push(meteor);
    }
  }
  game.meteors = remainingMeteors;

  if (game.meteors.length === 0) {
    game.meteorDust.length = 0;
  }

  for (const d of game.meteorDust) {
    d.x += d.vx;
    d.y += d.vy;
    d.life--;
  }
  game.meteorDust = game.meteorDust.filter(d => d.life > 0);

  for (const p of game.impactDust) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.07;
    p.vx *= 0.985;
    p.life--;
  }
  game.impactDust = game.impactDust.filter(p => p.life > 0);

  for (const e of game.enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed;
    e.y += (dy / d) * e.speed;

    if (e.hitFlash > 0) e.hitFlash--;

    if (d < e.r + player.r) {
      player.hp -= e.touchDps;
      player.lastHitTime = performance.now();
      e.attackFlash = 8;
      if (player.hp <= 0) { player.hp = 0; game.over = true; }
    } else {
      if (e.attackFlash > 0) e.attackFlash--;
    }
  }

  if (game.boss) {
    const b = game.boss;
    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const d = Math.hypot(dx, dy) || 1;

    b.x += (dx / d) * b.speed;
    b.y += (dy / d) * b.speed;

    if (b.hitFlash > 0) b.hitFlash--;

    if (d < b.r + player.r) {
      player.hp -= b.touchDps;
      player.lastHitTime = performance.now();
      b.attackFlash = 8;
      if (player.hp <= 0) { player.hp = 0; game.over = true; }
    } else {
      if (b.attackFlash > 0) b.attackFlash--;
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

  if (game.screenShake > 0) game.screenShake--;

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

  if (meteorEl) {
    if (player.meteorCd > 0) {
      meteorEl.textContent = Math.ceil(player.meteorCd / 60) + "s";
      meteorEl.style.color = "#ffcc66";
    } else {
      meteorEl.textContent = "READY";
      meteorEl.style.color = "#66ff99";
    }
  }

  if (game.boss) {
    bossBar.style.width = `${Math.max(0, (game.boss.hp / game.boss.maxHp) * 100)}%`;
  }

  net.emitState();
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

function drawMeteorRock(m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.rot);

  ctx.fillStyle = "#8b6f54";
  ctx.beginPath();
  ctx.arc(0, 0, m.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6f5642";
  ctx.beginPath();
  ctx.arc(-m.r * 0.28, -m.r * 0.15, m.r * 0.24, 0, Math.PI * 2);
  ctx.arc(m.r * 0.24, m.r * 0.2, m.r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Draw the melee slash arc
function drawMeleeSlash(slash) {
  const t = slash.life / slash.maxLife; // 1 -> 0 as it fades
  const alpha = t * 0.9;
  const arcSpan = Math.PI * 0.85;
  const startAngle = slash.angle - arcSpan / 2;
  const endAngle = slash.angle + arcSpan / 2;

  ctx.save();

  // Outer glow arc
  ctx.beginPath();
  ctx.arc(slash.x, slash.y, slash.r, startAngle, endAngle);
  ctx.strokeStyle = `rgba(255, 255, 200, ${alpha * 0.35})`;
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.stroke();

  // Main slash arc
  ctx.beginPath();
  ctx.arc(slash.x, slash.y, slash.r, startAngle, endAngle);
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.stroke();

  // Inner bright core
  ctx.beginPath();
  ctx.arc(slash.x, slash.y, slash.r * 0.75, startAngle + 0.1, endAngle - 0.1);
  ctx.strokeStyle = `rgba(220, 240, 255, ${alpha * 0.6})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function draw() {
  const shakeX = game.screenShake > 0 ? rand(-game.screenShake * 0.5, game.screenShake * 0.5) : 0;
  const shakeY = game.screenShake > 0 ? rand(-game.screenShake * 0.5, game.screenShake * 0.5) : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

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

  // Draw melee slashes (behind enemies)
  for (const slash of game.meleeSlashes) {
    drawMeleeSlash(slash);
  }

  for (const d of game.meteorDust) {
    const a = d.life / d.maxLife;
    ctx.fillStyle = `rgba(190, 160, 120, ${0.65 * a})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const meteor of game.meteors) {
    if (meteor.delay <= 0) {
      drawMeteorRock(meteor);
    }
  }

  for (const p of game.impactDust) {
    const a = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
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
    // Attack flash: red glow ring when damaging player
    if (e.attackFlash > 0) {
      const af = e.attackFlash / 8;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 0, ${0.55 * af})`;
      ctx.fill();
    }

    // Hit flash: white halo behind the enemy body
    if (e.hitFlash > 0) {
      const hf = e.hitFlash / 10;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * hf})`;
      ctx.fill();
    }

    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();

    // White overlay on body when hit
    if (e.hitFlash > 0) {
      const hf = e.hitFlash / 10;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * hf})`;
      ctx.fill();
    }

    drawFace(e.x, e.y, e.type === "orange" ? 1.0 : 0.9, e.faceColor);

    ctx.fillStyle = "#f00";
    ctx.fillRect(e.x - 14, e.y - 20, 28, 4);
    ctx.fillStyle = "#0f0";
    ctx.fillRect(e.x - 14, e.y - 20, 28 * Math.max(0, e.hp / e.maxHp), 4);
  }

  if (game.boss) {
    const b = game.boss;

    // Boss attack flash
    if (b.attackFlash > 0) {
      const af = b.attackFlash / 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 40, 0, ${0.5 * af})`;
      ctx.fill();
    }

    // Boss hit flash
    if (b.hitFlash > 0) {
      const hf = b.hitFlash / 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * hf})`;
      ctx.fill();
    }

    ctx.fillStyle = "#a64dff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();

    if (b.hitFlash > 0) {
      const hf = b.hitFlash / 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * hf})`;
      ctx.fill();
    }

    drawFace(b.x, b.y, 2.5, "#2a003d");
  }

  net.drawRemotePlayers();

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

  ctx.restore();
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
  game.meteors = [];
  game.meteorDust = [];
  game.impactDust = [];
  game.screenShake = 0;
  game.meleeSlashes = [];
  bossUi.style.display = "none";

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.hp = 100;
  player.ammo = 3;
  player.shootCd = 0;
  player.reload = 0;
  player.meleeCd = 0;
  player.shockCd = 0;
  player.meteorCd = 0;
  player.lastHitTime = performance.now();
}

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) e.preventDefault();

  if (key === " " && !game.over) shoot();
  if (key === "x" && !game.over) shockwave();
  if (key === "m" && !game.over) meteorStrike();
  if (key === "r" && game.over) restart();
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("click", melee);

// ─── Multiplayer networking ────────────────────────────────────────────────────
// Connects to the Socket.IO server when available. If the server is not running
// the game continues in single-player mode — no errors, no blocked gameplay.
//
// net is declared as a stub before loop() starts so update() and draw() can
// call its methods safely. initNet() replaces the stubs synchronously before
// the next animation frame fires.
const net = { emitState() {}, drawRemotePlayers() {} };

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

(function initNet() {
  const SYNC_MS = 100; // minimum ms between state emissions
  const REMOTE_COLORS = ["#4ecdc4", "#45b7d1", "#f7b731", "#a55eea", "#26de81", "#fd9644"];

  // Other connected players: socket-id -> { id, name, x, y, kills, hp }
  const remotePlayers = new Map();

  const lbPanel = document.getElementById("leaderboard");
  const lbList = document.getElementById("lbList");
  const nameOverlay = document.getElementById("nameOverlay");
  const nameInput = document.getElementById("nameInput");
  const nameBtn = document.getElementById("nameBtn");

  let socket = null;
  let lastSync = 0;

  // Pick a stable color for a remote player based on their socket id
  function remoteColor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return REMOTE_COLORS[h % REMOTE_COLORS.length];
  }

  function updateLeaderboard(entries) {
    if (!lbList || !lbPanel) return;
    lbPanel.style.display = "block";
    lbList.innerHTML = "";
    for (const e of entries) {
      const li = document.createElement("li");
      li.appendChild(document.createTextNode(`${e.name}  \u2014  ${e.kills}`));
      lbList.appendChild(li);
    }
  }

  // Called once per game-loop tick from update()
  net.emitState = function emitState() {
    if (!socket || !socket.connected) return;
    const now = performance.now();
    if (now - lastSync < SYNC_MS) return;
    lastSync = now;
    socket.emit("player:update", {
      x: Math.round(player.x),
      y: Math.round(player.y),
      kills: game.killed,
      hp: Math.round(player.hp)
    });
  };

  // Called once per game-loop tick from draw(), renders all remote players
  net.drawRemotePlayers = function drawRemotePlayers() {
    for (const [id, p] of remotePlayers) {
      const col = remoteColor(id);

      // Body
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.fill();

      // Face (reuse existing helper)
      drawFace(p.x, p.y, 1, "#000");

      // Name label
      ctx.fillStyle = "#fff";
      ctx.font = "11px Arial";
      ctx.textAlign = "center";
      ctx.fillText(p.name, p.x, p.y - 18);
      ctx.textAlign = "left";
    }
  };

  function connect(name) {
    if (nameOverlay) nameOverlay.style.display = "none";

    // io() is provided by /socket.io/socket.io.js served from the game server.
    // When the server is not running the script tag fails to load, io is
    // undefined, and we silently stay in single-player mode.
    if (typeof io === "undefined") {
      console.info("[net] Server not available — single-player mode");
      return;
    }

    socket = io({ timeout: 4000, reconnectionAttempts: 3 });

    socket.on("connect", () => {
      socket.emit("player:join", { name });
    });

    socket.on("connect_error", () => {
      console.info("[net] Could not reach server — single-player mode");
    });

    socket.on("player:welcome", ({ players: all }) => {
      for (const p of all) {
        if (p.id !== socket.id) remotePlayers.set(p.id, p);
      }
    });

    socket.on("player:joined", (p) => remotePlayers.set(p.id, p));

    socket.on("player:state", (p) => {
      const existing = remotePlayers.get(p.id);
      if (existing) Object.assign(existing, p);
    });

    socket.on("player:left", ({ id }) => remotePlayers.delete(id));

    socket.on("leaderboard:update", updateLeaderboard);
  }

  // Sanitize the name client-side (server also validates)
  function startWithName(raw) {
    const name = (typeof raw === "string" ? raw : "")
      .replace(/[^\x20-\x7E]/g, "")
      .trim()
      .slice(0, 20) || "Player";
    connect(name);
  }

  if (nameBtn) {
    nameBtn.addEventListener("click", () => {
      clearTimeout(autoTimer);
      startWithName(nameInput ? nameInput.value : "");
    });
  }

  if (nameInput) {
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(autoTimer);
        startWithName(nameInput.value);
      }
    });
  }

  // Auto-dismiss after 6 s so single-player users are not blocked
  const autoTimer = setTimeout(() => {
    if (nameOverlay && nameOverlay.style.display !== "none") {
      startWithName(nameInput ? nameInput.value : "");
    }
  }, 6000);
}());
