---
title: "PRD: Core Gameplay (As-Built)"
doc_type: "Product Requirements Document"
version: "1.0"
status: "Approved - As-Built Baseline"
product: "Exploration Game"
repository: "gubby-schaaf/exploration-game"
branch: "main"
last_verified_commit: "54085d78ca385be8a750c4ba6894507ad8f77269"
authors:
  - "GitHub Copilot"
stakeholders:
  - "Product"
  - "Engineering"
created_at: "2026-06-27"
updated_at: "2026-06-27"
tags:
  - "prd"
  - "as-built"
  - "core-gameplay"
---

# Product Requirements Document (PRD): Core Gameplay (As-Built)

## 1. Purpose

This document defines the **currently implemented gameplay functionality** in the Exploration Game web app.  
It is the baseline product artifact used to:
- align product and engineering on what exists today,
- anchor future PRDs for planned work before coding,
- prevent regressions in current gameplay behavior.

---

## 2. Product Summary (Current State)

Exploration Game is a single-screen, browser-based, real-time survival arena game rendered on HTML5 canvas.  
The player moves in 2D space, defeats enemies using ranged/melee/special attacks, survives incoming damage, and triggers a boss encounter after enough kills.

---

## 3. In Scope (As-Built)

- Core loop: move → attack → avoid damage → survive.
- Enemy spawning and enemy type progression.
- Boss spawn, boss attack pattern, boss health UI.
- Player health, ammo/reload, cooldowns, and passive regen.
- Game-over and restart flow.
- In-game HUD and control affordances.

## 4. Out of Scope (Not Implemented)

- Levels/maps/scenes beyond one arena.
- Inventory, quests, dialogue, exploration zones.
- Audio, save/load persistence, accounts, backend/multiplayer.
- Menus/settings/configuration screens.
- Touch/mobile-specific control model.

---

## 5. User Experience Requirements (As-Built)

### 5.1 Play Surface
- The app loads directly into gameplay on page load.
- Canvas size is fixed at `1100x700`.
- Background and entities are drawn each animation frame.

### 5.2 HUD
The UI displays:
- Health (`0-100`)
- Enemies killed counter
- Controls help text
- Ammo count (`Arrows: 0-3`)
- Shockwave status (`READY` or cooldown seconds)
- Boss panel with name (“Giga Slime”) and live health bar (only when boss exists)

### 5.3 Controls
- Movement: `W/A/S/D` or Arrow keys
- Shoot: `Space`
- Melee: mouse click on canvas
- Shockwave: `X`
- Restart after death: `R`

---

## 6. Functional Requirements (As-Built)

### FR-001: Session Initialization
**Requirement:** Game session initializes immediately at page load.

**As-built behavior:**
- Canvas and UI nodes are bound from DOM.
- Core game state object and player state object are initialized.
- Main loop starts via `requestAnimationFrame`.

**Acceptance criteria:**
- Opening `index.html` starts active gameplay without additional input.

---

### FR-002: Player Movement
**Requirement:** Player can move omnidirectionally within arena bounds.

**As-built behavior:**
- Movement vector is normalized to prevent faster diagonal speed.
- Direction vector updates on movement and sets shooting direction.
- Player position is clamped to remain fully within canvas edges.

**Acceptance criteria:**
- Player cannot move outside visible canvas.
- Last movement direction determines projectile heading.

---

### FR-003: Ranged Attack (Shoot)
**Requirement:** Player can fire projectiles with ammo and cooldown constraints.

**As-built behavior:**
- Each shot consumes 1 ammo (max magazine: 3).
- Fire cooldown is enforced (`shootCd`).
- On empty ammo, reload starts automatically (`reload = 90` frames), then ammo refills to 3.
- Projectile deals `13` damage and expires by lifespan or leaving bounds.

**Acceptance criteria:**
- Repeated shooting is gated by cooldown and ammo.
- No shooting occurs while reloading from empty.

---

### FR-004: Melee Attack
**Requirement:** Player can perform close-range attack.

**As-built behavior:**
- Triggered by canvas click.
- Cooldown enforced (`meleeCd = 18` frames).
- Damages enemies within radius `< 58` by `18`.
- Damages boss within radius `< 72` by `16`.

**Acceptance criteria:**
- Click produces AoE-like close damage only to nearby targets.

---

### FR-005: Shockwave Ability
**Requirement:** Player can trigger periodic crowd-control special.

**As-built behavior:**
- Triggered with `X`.
- Cooldown enforced (`shockCd = 360` frames).
- Adds visual expanding ring effect.
- Applies knockback + damage to enemies in ~230 radius.
- Applies reduced knockback + `25` damage to boss in extended range.

**Acceptance criteria:**
- Ability unavailable during cooldown.
- HUD displays cooldown seconds; shows `READY` when off cooldown.

---

### FR-006: Enemy Spawning and Behavior
**Requirement:** Enemies spawn over time and pursue player.

**As-built behavior:**
- Spawn chance each frame (`Math.random() < 0.02`) while enemy count < 24.
- Spawn at randomized off-screen edges.
- Enemies path directly toward player each update.
- Contact with player causes damage over time (`touchDps`).

**Enemy variants:**
1. **Green enemy** (default, before 100 kills)
   - HP 25, speed 0.8–1.4, touch DPS 0.12
2. **Orange enemy** (after 100 kills)
   - HP 50, speed 1.0–1.7, touch DPS 0.22

**Acceptance criteria:**
- Enemy pressure increases over time.
- Variant switch occurs based on kill threshold.

---

### FR-007: Boss Encounter
**Requirement:** Boss appears once after sufficient progression.

**As-built behavior:**
- Boss spawns exactly once when kills >= 100 and not yet spawned.
- Boss stats: HP 1400, movement speed 0.8, touch DPS 0.35.
- Boss fires projectiles at player on interval (`shootCd = 40` frames).
- Boss projectiles deal `12` damage.
- Boss UI appears on spawn; hides on boss death.

**Acceptance criteria:**
- Boss health bar updates in real time.
- Boss no longer present after HP <= 0.

---

### FR-008: Damage, Death, and Health Regen
**Requirement:** Player takes damage from threats, can die, and can passively recover when safe.

**As-built behavior:**
- Damage sources:
  - Enemy contact DPS
  - Boss contact DPS
  - Boss projectile hit damage
- Game over is set when HP <= 0.
- Passive regen starts only after no recent damage for configured delay.
- Regen capped at 100 HP.

**Acceptance criteria:**
- On death, gameplay updates cease and game-over overlay appears.

---

### FR-009: Progress Tracking
**Requirement:** Track enemy eliminations and progression gates.

**As-built behavior:**
- Kill count increments from removed dead enemies.
- Kill count controls difficulty shift and boss spawn condition.
- HUD always displays current kill count.

**Acceptance criteria:**
- Kills visibly increase during successful combat and persist until restart.

---

### FR-010: Game Over and Restart
**Requirement:** Player can restart from clean state after death.

**As-built behavior:**
- “GAME OVER” overlay shown with restart instruction.
- Pressing `R` resets:
  - game flags and collections,
  - boss state/UI,
  - player position/stats/cooldowns,
  - kill counter.

**Acceptance criteria:**
- Restart returns game to initial playable baseline.

---

## 7. Non-Functional Requirements (Observed)

- Runtime: modern browser with JavaScript and canvas support.
- Architecture: single-page, front-end only, no build step required.
- Performance model: continuous RAF loop with in-memory state arrays.
- Styling: absolute-position HUD over centered canvas.

---

## 8. Technical References (Source of Truth)

- `index.html` — canvas, HUD elements, control text, script includes.
- `game.js` — all game state, input handling, update loop, rendering, combat systems.
- `style.css` — visual styling and HUD positioning.

---

## 9. Known Gaps / Risks

- No persistence: progress resets on refresh.
- No explicit win-state after boss defeat; gameplay continues.
- README currently contains generalized/generated guidance and not strict gameplay spec.
- `docs/core-gameplay` had no existing authored content before this PRD baseline.

---

## 10. Future PRD Authoring Guidance

All future PRDs should include:
1. Problem statement and player value.
2. Explicit deltas from this as-built baseline.
3. Functional requirements + acceptance criteria.
4. Telemetry/success metrics.
5. Rollout and migration/backward compatibility considerations.

---

## 11. Revision History

- **v1.0 (2026-06-27):** Initial as-built baseline derived from live repository code.
