import { el, mount, clear } from '../utils/dom.js';
import { api, ApiError } from '../api.js';
import { getState, setCharacter } from '../state.js';
import { toast } from '../ui/modal.js';
import { RARITY_COLORS, SLOT_LABELS, STAT_LABELS } from '../config.js';
import { formatStatValue } from '../utils/format.js';
import { renderCraftingTab } from './crafting.js';

const SLOT_ORDER = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'belt', 'ring_1', 'ring_2', 'amulet', 'relic'];

export const inventoryScreen = {
  container: null,
  tab: 'equip',
  items: [],
  materials: [],
  destroyed: false,

  async mount(container) {
    this.container = container;
    this.destroyed = false;
    this.tab = 'equip';
    mount(container, el('div', { class: 'screen' }, 'Загрузка...'));
    await this.reload();
  },

  unmount() {
    this.destroyed = true;
  },

  async reload() {
    try {
      const data = await api.get('/inventory');
      if (this.destroyed) return;
      this.items = data.items;
      this.materials = data.materials;
      this.render();
    } catch (err) {
      if (this.destroyed) return;
      mount(this.container, el('div', { class: 'screen' }, 'Не удалось загрузить инвентарь.'));
      void err;
    }
  },

  render() {
    const screen = el('div', { class: 'screen' });
    const segmented = el('div', { class: 'segmented' }, [
      el('button', { class: this.tab === 'equip' ? 'active' : '', onClick: () => { this.tab = 'equip'; this.render(); } }, 'Экипировка'),
      el('button', { class: this.tab === 'craft' ? 'active' : '', onClick: () => { this.tab = 'craft'; this.render(); } }, 'Крафт'),
    ]);
    screen.appendChild(segmented);

    const body = el('div', {});
    screen.appendChild(body);
    mount(this.container, screen);

    if (this.tab === 'equip') {
      this.renderEquipTab(body);
    } else {
      const { character } = getState();
      body.appendChild(el('div', { class: 'muted' }, 'Загрузка...'));
      renderCraftingTab(character, this.materials).then((node) => {
        if (this.destroyed || this.tab !== 'craft') return;
        clear(body);
        body.appendChild(node);
      });
    }
  },

  renderEquipTab(body) {
    const { character } = getState();
    const equippedBySlot = Object.fromEntries((character.equippedItems || []).map((it) => [it.equipped_slot, it]));

    const grid = el('div', { class: 'equip-grid panel' });
    for (const slot of SLOT_ORDER) {
      const equipped = equippedBySlot[slot];
      if (equipped) {
        grid.appendChild(
          el('div', {
            class: 'equip-slot filled',
            onClick: () => this.unequip(equipped.instance_id),
          }, [
            el('div', { class: 'rarity-dot', style: `background:${RARITY_COLORS[equipped.rarity]}` }),
            el('div', {}, equipped.name),
          ])
        );
      } else {
        grid.appendChild(el('div', { class: 'equip-slot' }, SLOT_LABELS[slot]));
      }
    }
    body.appendChild(el('div', { class: 'panel' }, [el('h2', {}, 'Экипировано (тапните, чтобы снять)'), grid]));

    const bagItems = this.items.filter((it) => !it.equipped_slot);
    const bagList = el('div', { class: 'bag-list' });
    if (bagItems.length === 0) {
      bagList.appendChild(el('div', { class: 'muted' }, 'Сумка пуста. Побеждайте монстров, чтобы получить предметы.'));
    }
    for (const item of bagItems) {
      const statsText = Object.entries(item.rolled_stats)
        .map(([stat, value]) => `${STAT_LABELS[stat] || stat} +${formatStatValue(stat, value)}`)
        .join(', ');
      bagList.appendChild(
        el('div', { class: 'bag-item' }, [
          el('div', { class: 'rarity-dot', style: `background:${RARITY_COLORS[item.rarity]}` }),
          el('div', { class: 'info' }, [
            el('div', { class: 'name' }, item.name),
            el('div', { class: 'stats' }, statsText),
          ]),
          el('button', { class: 'btn small', onClick: () => this.equip(item.id) }, 'Надеть'),
          el('button', { class: 'btn small danger', onClick: () => this.sell(item.id) }, 'Продать'),
        ])
      );
    }
    body.appendChild(el('div', { class: 'panel' }, [el('h2', {}, 'Сумка'), bagList]));
  },

  async equip(itemInstanceId) {
    try {
      const character = await api.post('/inventory/equip', { itemInstanceId });
      setCharacter(character);
      await this.reload();
    } catch (err) {
      toast(err instanceof ApiError ? equipErrorText(err.message) : 'Не удалось экипировать предмет.');
    }
  },

  async unequip(itemInstanceId) {
    try {
      const character = await api.post('/inventory/unequip', { itemInstanceId });
      setCharacter(character);
      await this.reload();
    } catch (err) {
      toast('Не удалось снять предмет.');
      void err;
    }
  },

  async sell(itemInstanceId) {
    try {
      const result = await api.post(`/inventory/${itemInstanceId}/sell`);
      setCharacter(result.character);
      toast(`Продано за ${result.goldGained} золота`);
      await this.reload();
    } catch (err) {
      toast('Не удалось продать предмет.');
      void err;
    }
  },
};

function equipErrorText(code) {
  const map = {
    wrong_class: 'Этот предмет нельзя надеть — не подходит классу.',
    level_too_low: 'Слишком низкий уровень персонажа.',
  };
  return map[code] || 'Не удалось экипировать предмет.';
}
