import { el, mount } from '../utils/dom.js';
import { api, setToken } from '../api.js';
import { getState } from '../state.js';
import { confirmDialog, toast } from '../ui/modal.js';
import { CLASS_LABELS, STAT_LABELS } from '../config.js';
import { formatNumber, formatStatValue } from '../utils/format.js';

const STAT_ORDER = ['hp', 'attack', 'defense', 'attack_speed', 'crit_chance', 'crit_dmg', 'lifesteal'];

export const profileScreen = {
  container: null,

  mount(container) {
    this.container = container;
    this.render();
  },

  unmount() {},

  render() {
    const { user, character } = getState();

    const statsPanel = el('div', { class: 'panel' }, [
      el('h2', {}, 'Характеристики'),
      ...STAT_ORDER.map((stat) =>
        el('div', { class: 'row', style: 'padding:4px 0' }, [
          el('div', { class: 'muted' }, STAT_LABELS[stat]),
          el('div', {}, formatStatValue(stat, character.effectiveStats[stat])),
        ])
      ),
    ]);

    const infoPanel = el('div', { class: 'panel' }, [
      el('div', { class: 'row' }, [el('div', { class: 'muted' }, 'Логин'), el('div', {}, user.username)]),
      el('div', { class: 'row' }, [el('div', { class: 'muted' }, 'Персонаж'), el('div', {}, character.name)]),
      el('div', { class: 'row' }, [el('div', { class: 'muted' }, 'Класс'), el('div', {}, CLASS_LABELS[character.class])]),
      el('div', { class: 'row' }, [el('div', { class: 'muted' }, 'Уровень'), el('div', {}, character.level)]),
      el('div', { class: 'row' }, [el('div', { class: 'muted' }, 'Сила'), el('div', {}, `⚡ ${formatNumber(character.power)}`)]),
      el('div', { class: 'row' }, [el('div', { class: 'muted' }, 'Золото'), el('div', {}, `💰 ${formatNumber(character.gold)}`)]),
    ]);

    const actionsPanel = el('div', { class: 'panel' }, [
      el('button', {
        class: 'btn danger',
        style: 'width:100%;margin-bottom:8px',
        onClick: async () => {
          const ok = await confirmDialog('Пересоздать персонажа? Весь прогресс будет потерян безвозвратно.');
          if (!ok) return;
          try {
            await api.post('/character/reroll');
            location.reload();
          } catch (err) {
            toast('Не удалось пересоздать персонажа.');
            void err;
          }
        },
      }, '🔁 Пересоздать персонажа'),
      el('button', {
        class: 'btn',
        style: 'width:100%',
        onClick: () => { setToken(null); location.reload(); },
      }, '🚪 Выйти'),
    ]);

    mount(this.container, el('div', { class: 'screen' }, [infoPanel, statsPanel, actionsPanel]));
  },
};
