import { el } from '../utils/dom.js';
import { formatNumber } from '../utils/format.js';
import { CLASS_LABELS } from '../config.js';

const CLASS_ICON = { mage: '🔮', warrior: '🛡️', archer: '🏹', zhnec: '🗡️', assasin: '🔪' };

export function renderHeader(character) {
  if (!character) return el('div', { class: 'header' });

  const xpPct = Math.max(0, Math.min(100, (character.xp / character.xpForNextLevel) * 100));
  const hpCurrent = character.liveHp ?? character.effectiveStats.hp;
  const hpPct = Math.max(0, Math.min(100, (hpCurrent / character.effectiveStats.hp) * 100));

  return el('div', { class: 'header' }, [
    el('div', { class: 'header__avatar' }, CLASS_ICON[character.class] || '⚔️'),
    el('div', { class: 'header__main' }, [
      el('div', { class: 'header__row1' }, [
        el('div', { class: 'header__name' }, `${character.name} · Ур.${character.level} · ${CLASS_LABELS[character.class]}`),
        el('div', { class: 'header__power' }, `⚡ ${formatNumber(character.power)}`),
      ]),
      el('div', { class: 'header__bars' }, [
        el('div', { class: 'bar bar--hp' }, [
          el('div', { class: 'bar__fill', style: `width:${hpPct}%` }),
          el('div', { class: 'bar__label' }, `${formatNumber(hpCurrent)}/${formatNumber(character.effectiveStats.hp)} HP`),
        ]),
        el('div', { class: 'bar bar--xp' }, [
          el('div', { class: 'bar__fill', style: `width:${xpPct}%` }),
          el('div', { class: 'bar__label' }, `${formatNumber(character.xp)}/${formatNumber(character.xpForNextLevel)} XP`),
        ]),
      ]),
      el('div', { class: 'header__gold' }, `💰 ${formatNumber(character.gold)}`),
    ]),
  ]);
}
