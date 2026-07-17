const assert = require('assert');
const { simulateBattle } = require('../services/battleEngine');
const CHARACTERS = require('../content/characters');
const SKILLS = require('../content/skills');

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function skillsFor(className, level = 10) {
  return SKILLS.filter((s) => s.class === className && s.unlock_level <= level);
}

function weakMonster() {
  return {
    id: 'test_monster',
    stats: { hp: 40, attack: 4, defense: 1, attack_speed: 0.6, crit_chance: 0.05, crit_dmg: 1.5, lifesteal: 0 },
    skills: [],
  };
}

function strongMonster() {
  return {
    id: 'test_monster_strong',
    stats: { hp: 5000, attack: 200, defense: 50, attack_speed: 1.5, crit_chance: 0.3, crit_dmg: 2, lifesteal: 0 },
    skills: [],
  };
}

// 1. mage vs a weak monster should win comfortably.
{
  const player = { id: 1, stats: CHARACTERS.mage.baseStats, skills: skillsFor('mage') };
  const result = simulateBattle(player, weakMonster(), () => seededRng(42));
  assert.strictEqual(result.outcome, 'win', 'mage should beat a weak monster');
  assert.ok(result.log.length > 0, 'battle log should not be empty');
  console.log('[test] mage vs weak monster: PASS (outcome=win, ticks=%d)', result.ticks);
}

// 2. any class vs an overwhelming monster should lose or time out, never crash.
{
  const player = { id: 2, stats: CHARACTERS.warrior.baseStats, skills: skillsFor('warrior') };
  const result = simulateBattle(player, strongMonster(), () => seededRng(7));
  assert.ok(['loss', 'timeout'].includes(result.outcome), 'warrior should not beat an overwhelming monster');
  console.log('[test] warrior vs strong monster: PASS (outcome=%s, ticks=%d)', result.outcome, result.ticks);
}

// 3. zhnec lifesteal should actually heal it back above a damage-only baseline.
{
  const player = { id: 3, stats: CHARACTERS.zhnec.baseStats, skills: skillsFor('zhnec') };
  const result = simulateBattle(player, weakMonster(), () => seededRng(99));
  const healEvents = result.log.filter((e) => e.healed > 0);
  assert.ok(healEvents.length > 0, 'zhnec should have at least one lifesteal heal event vs a weak monster');
  console.log('[test] zhnec lifesteal: PASS (%d heal events)', healEvents.length);
}

// 4. assasin should land crits given its high base crit chance.
{
  const player = { id: 4, stats: CHARACTERS.assasin.baseStats, skills: skillsFor('assasin') };
  const result = simulateBattle(player, strongMonster(), () => seededRng(1234));
  const critEvents = result.log.filter((e) => e.crit);
  assert.ok(critEvents.length > 0, 'assasin should land at least one crit over a full fight');
  console.log('[test] assasin crits: PASS (%d crit events)', critEvents.length);
}

// 5. deterministic RNG should give a deterministic outcome (no NaN/hangs, ticks bounded).
{
  const player = { id: 5, stats: CHARACTERS.archer.baseStats, skills: skillsFor('archer') };
  const r1 = simulateBattle(player, weakMonster(), () => seededRng(5));
  const r2 = simulateBattle(player, weakMonster(), () => seededRng(5));
  assert.strictEqual(r1.outcome, r2.outcome);
  assert.strictEqual(r1.ticks, r2.ticks);
  assert.ok(r1.ticks <= 300, 'battle must be capped at 300 ticks');
  console.log('[test] determinism + tick cap: PASS');
}

console.log('\nAll battleEngine tests passed.');
