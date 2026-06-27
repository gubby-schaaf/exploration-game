---
title: "PRD: Meteor Strike Ability"
doc_type: "Product Requirements Document"
version: "0.1"
status: "Draft"
product: "Exploration Game"
repository: "gubby-schaaf/exploration-game"
branch: "main"
authors:
  - "Product"
stakeholders:
  - "Product"
  - "Engineering"
created_at: "2026-06-27"
updated_at: "2026-06-27"
tags:
  - "prd"
  - "gameplay"
  - "ability"
  - "meteor-strike"
---

# Product Requirements Document (PRD): Meteor Strike Ability

## 1. Purpose

Add a new player-triggered special ability, **Meteor Strike**, that creates a high-impact crowd-control moment by heavily damaging all active slimes on screen while preserving fairness (no player self-damage).

---

## 2. Problem / Player Value

Mid-to-late combat can become overwhelming when enemy counts spike.  
Meteor Strike gives the player a rare, satisfying “pressure release” tool with strong visual feedback and tactical timing.

Player value:
- Regain control during swarm peaks.
- Enjoy a dramatic audiovisual payoff.
- Introduce a new strategic cooldown decision alongside Shockwave.

---

## 3. Scope

### In Scope
- New ability: **Meteor Strike**
- Input binding: **`M` key**
- Cooldown: **120 seconds** (2 minutes)
- Effect: Set all **current slime enemies** to **50% of their current/max health behavior-defined target** (see FR-003)
- Visual sequence:
  - Large rough circular meteor descends onto arena
  - Dust particles trail/excrete during descent
  - On impact: screen shake
- HUD status display (`READY` / cooldown remaining)
- No damage/effect applied to player

### Out of Scope
- New enemy types tied to meteor
- Terrain deformation / persistent craters
- Damage-over-time burn zones
- Audio requirements (can be future enhancement)

---

## 4. UX Requirements

### 4.1 Controls
- Press **`M`** to trigger Meteor Strike when off cooldown.
- Pressing `M` during cooldown does nothing (optional: subtle feedback later).

### 4.2 HUD
- Add line item:
  - `Meteor: READY` when available
  - `Meteor: <Ns>` while cooling down (seconds, rounded up)

### 4.3 Visual Feedback
- Meteor should be visually distinct from projectiles and shockwave.
- Descent should be readable (player can see it coming).
- Impact should produce:
  - brief dust burst
  - short screen shake effect
- Effect resolves quickly enough to preserve gameplay clarity.

---

## 5. Functional Requirements

### FR-001: Ability Trigger & Cooldown
**Requirement:** Player can activate Meteor Strike with `M` when ability is ready.

**Behavior:**
- Bind `M` key in input handler.
- Meteor has cooldown timer of **120 seconds**.
- At 60 FPS implementation, cooldown may be tracked as **7200 frames**.
- Ability cannot be retriggered until cooldown completes.

**Acceptance Criteria:**
- Pressing `M` when ready starts meteor sequence and cooldown.
- Pressing `M` during cooldown does not retrigger.

---

### FR-002: Targeting Rules
**Requirement:** Meteor Strike affects enemies only.

**Behavior:**
- Applies to all currently active slime enemies at impact time.
- Does **not** damage or alter player state (HP, cooldowns, position unchanged).
- Boss impact behavior is optional and excluded from this version unless explicitly added.

**Acceptance Criteria:**
- Player HP is unchanged by own meteor.
- Slimes are affected consistently on each valid cast.

---

### FR-003: Health Reduction Rule
**Requirement:** Meteor Strike reduces slime health to half.

**Behavior (recommended deterministic rule):**
- For each affected slime:  
  `enemy.hp = min(enemy.hp, ceil(enemy.maxHp * 0.5))`
- This ensures:
  - high-health slimes are chunked to half max HP
  - already-weakened slimes are not healed upward
- Clamp minimum at 1 only if enemy was already alive and above 0 and design wants no instant kill from rounding.

**Acceptance Criteria:**
- Fresh full-health slimes end at ~50% max HP after impact.
- Low-health slimes do not gain HP from cast.
- Dead/removed enemies are unaffected.

---

### FR-004: Animation Lifecycle
**Requirement:** Ability includes a full animation sequence.

**Behavior:**
1. Spawn meteor visual above play area.
2. Move meteor downward over short duration.
3. Emit dust particles during descent.
4. On impact:
   - apply health reduction effect
   - trigger brief screen shake
   - spawn impact dust burst
5. Cleanup temporary animation entities.

**Acceptance Criteria:**
- Meteor is visible during descent.
- Dust particles are visible before and/or at impact.
- Screen shake occurs once per impact event.
- No persistent animation artifacts remain after completion.

---

### FR-005: Gameplay Continuity & Safety
**Requirement:** Ability integrates without breaking loop performance/state.

**Behavior:**
- Works inside existing RAF update/render loop.
- No interruption to movement/combat controls during sequence.
- State resets correctly on restart (`R`) including meteor cooldown and active VFX.

**Acceptance Criteria:**
- No JS errors during repeated use across sessions.
- Restart returns meteor ability to initial ready state (or defined initial state).
- No measurable long-frame spikes from unbounded particles.

---

## 6. Non-Functional Requirements

- Maintain smooth frame pacing in typical enemy-count scenarios.
- Particle count should be capped to avoid runaway memory/CPU usage.
- Screen shake duration/intensity should preserve readability (avoid motion sickness risk).

---

## 7. Telemetry / Debug Observability (Optional but Recommended)

- Count casts per run (`meteorCasts`).
- Track enemies affected per cast.
- Track average cooldown utilization timing (optional debug metric).

---

## 8. Dependencies / Implementation Notes

Likely touchpoints (current codebase):
- `game.js`
  - input handling for `M`
  - player ability cooldown state
  - enemy iteration and HP mutation
  - VFX entity arrays (meteor, particles, shake timer)
  - HUD text update
  - restart/reset logic
- `index.html`
  - optional HUD label placeholder if not generated in JS

---

## 9. Risks / Edge Cases

- Ambiguity in “half health” definition (current HP vs max HP).
- Potential conflict/overlap with Shockwave visuals.
- If boss should be included later, balancing impact could trivialize encounter.
- Screen shake may impact aiming if too strong/long.

---

## 10. Open Questions

1. Should Meteor affect boss in future versions?
2. Should meteor be centered on player, screen center, or global map center?
3. Should cast be instant on keypress or have a brief warning delay?
4. Should slimes at 1 HP be killable by meteor rounding behavior?

---

## 11. Initial Acceptance Test Checklist

- [ ] `M` triggers meteor when ready.
- [ ] 120s cooldown enforced.
- [ ] HUD shows `READY` and cooldown seconds.
- [ ] All live slimes reduced to half-health rule target.
- [ ] Player takes no damage/effect from meteor.
- [ ] Descent + dust + impact + shake all render correctly.
- [ ] Restart clears meteor state/cooldown/VFX.

---

## 12. Revision History

- **v0.1 (2026-06-27):** Initial draft based on new Meteor Strike concept.
