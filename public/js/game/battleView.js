const PLAYBACK_SPEEDUP = 4;

// Replays a pre-computed battle log against the renderer in (compressed) real time.
// onMonsterDied fires the moment monster HP hits 0 (use it to stop approach animation).
// Returns a handle with cancel() to abort if the player navigates away mid-playback.
export function playBattleLog({ renderer, log, monsterMaxHp, playerMaxHp, onEvent, onMonsterDied, onPlayerAttack, onDone }) {
  let cancelled = false;
  let monsterHp = monsterMaxHp;
  let playerHp = playerMaxHp;
  let currentMonsterName = '';
  const timers = [];

  for (const event of log) {
    const playAt = event.time / PLAYBACK_SPEEDUP;
    const timer = setTimeout(() => {
      if (cancelled) return;
      applyEvent(event);
    }, playAt);
    timers.push(timer);
  }

  function applyEvent(event) {
    if (event.actorSide === 'player' && monsterHp > 0) {
      renderer.setPlayerState('attack');
      onPlayerAttack?.();
    }

    if (event.type === 'damage') {
      if (event.targetSide === 'monster') {
        monsterHp = Math.max(0, event.targetHp);
        // Don't pass x — renderer merges, so approach animation keeps ownership of x
        renderer.setMonster({ name: currentMonsterName, hpPct: monsterHp / monsterMaxHp });
        renderer.addFloatingText(`-${event.damage}${event.crit ? '!' : ''}`, event.crit ? '#ffd76a' : '#f2716c', 'monster');
        if (monsterHp === 0) {
          renderer.setPlayerState('idle');
          onMonsterDied?.();
        }
      } else {
        playerHp = Math.max(0, event.targetHp);
        renderer.setPlayerHpPct(playerHp / playerMaxHp);
        renderer.addFloatingText(`-${event.damage}${event.crit ? '!' : ''}`, event.crit ? '#ffd76a' : '#f2716c', 'player');
      }
      if (event.healed) {
        renderer.addFloatingText(`+${event.healed}`, '#3fb950', event.actorSide);
      }
    } else if (event.type === 'heal') {
      renderer.addFloatingText(`+${event.healed}`, '#3fb950', event.actorSide);
    } else if (event.type === 'dot') {
      if (event.targetSide === 'monster') {
        monsterHp = Math.max(0, event.targetHp);
        renderer.setMonster({ name: currentMonsterName, hpPct: monsterHp / monsterMaxHp });
        if (monsterHp === 0) {
          renderer.setPlayerState('idle');
          onMonsterDied?.();
        }
      } else {
        playerHp = Math.max(0, event.targetHp);
        renderer.setPlayerHpPct(playerHp / playerMaxHp);
      }
      renderer.addFloatingText(`-${event.damage}`, '#b366e0', event.targetSide);
    } else if (event.type === 'buff' || event.type === 'lifesteal_bonus') {
      renderer.addFloatingText('▲', '#4d9de0', event.actorSide);
    } else if (event.type === 'debuff') {
      renderer.addFloatingText('▼', '#f2716c', event.targetSide);
    }

    onEvent?.(event);
  }

  const totalDuration = log.length > 0 ? log[log.length - 1].time / PLAYBACK_SPEEDUP + 500 : 300;
  const finalTimer = setTimeout(() => {
    if (!cancelled) onDone?.();
  }, totalDuration);
  timers.push(finalTimer);

  return {
    setMonsterName(name) { currentMonsterName = name; },
    cancel() {
      cancelled = true;
      timers.forEach(clearTimeout);
    },
  };
}
