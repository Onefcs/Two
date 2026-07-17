import { el } from '../utils/dom.js';
import { setScreen } from '../state.js';

const ITEMS = [
  { key: 'game', icon: '⚔️', label: 'Игра' },
  { key: 'upgrades', icon: '📈', label: 'Улучшения' },
  { key: 'inventory', icon: '🎒', label: 'Инвентарь' },
  { key: 'friends', icon: '👥', label: 'Друзья' },
  { key: 'profile', icon: '👤', label: 'Профиль' },
];

export function renderBottomNav(activeScreen) {
  return el(
    'div',
    { class: 'bottom-nav' },
    ITEMS.map((item) =>
      el(
        'button',
        {
          class: `bottom-nav__btn${item.key === activeScreen ? ' active' : ''}`,
          onClick: () => setScreen(item.key),
        },
        [el('span', { class: 'icon' }, item.icon), el('span', {}, item.label)]
      )
    )
  );
}
