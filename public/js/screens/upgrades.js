import { el, mount } from '../utils/dom.js';
import { api, ApiError } from '../api.js';
import { getState, setCharacter } from '../state.js';
import { toast } from '../ui/modal.js';
import { STAT_LABELS } from '../config.js';
import { formatNumber, formatStatValue } from '../utils/format.js';

const STAT_ORDER = ['attack', 'defense', 'hp', 'attack_speed', 'crit_chance', 'crit_dmg', 'lifesteal'];

export const upgradesScreen = {
  container: null,
  destroyed: false,

  mount(container) {
    this.container = container;
    this.destroyed = false;
    this.render();
  },

  unmount() {
    this.destroyed = true;
  },

  render() {
    const { character } = getState();
    const rows = el('div', { class: 'panel' });

    for (const statKey of STAT_ORDER) {
      const level = character.upgrades[statKey];
      const cost = character.upgradeCosts[statKey];
      const currentValue = character.effectiveStats[statKey];
      const canAfford = character.gold >= cost;

      rows.appendChild(
        el('div', { class: 'upgrade-row' }, [
          el('div', { class: 'info' }, [
            el('div', { class: 'stat-name' }, `${STAT_LABELS[statKey]} (ур. ${level})`),
            el('div', { class: 'stat-value' }, `Сейчас: ${formatStatValue(statKey, currentValue)}`),
          ]),
          el('button', {
            class: `btn small${canAfford ? ' primary' : ''}`,
            ...(canAfford ? {} : { disabled: 'disabled' }),
            onClick: canAfford ? () => this.purchase(statKey) : undefined,
          }, `💰 ${formatNumber(cost)}`),
        ])
      );
    }

    mount(this.container, el('div', { class: 'screen' }, [
      el('div', { class: 'panel', style: 'padding:10px 12px' }, [
        el('div', { class: 'row' }, [el('div', {}, 'Золото'), el('div', { style: 'font-weight:700;color:#ffd76a' }, `💰 ${formatNumber(character.gold)}`)]),
      ]),
      el('h2', { style: 'margin:4px 4px 8px' }, 'Улучшения характеристик'),
      rows,
    ]));
  },

  async purchase(statKey) {
    try {
      const character = await api.post('/upgrades/purchase', { statKey });
      setCharacter(character);
      if (!this.destroyed) this.render();
    } catch (err) {
      toast(err instanceof ApiError && err.message === 'not_enough_gold' ? 'Недостаточно золота.' : 'Не удалось улучшить характеристику.');
    }
  },
};
