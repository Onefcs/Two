import { el, mount, clear } from '../utils/dom.js';
import { getState, subscribe } from '../state.js';
import { renderHeader } from './header.js';
import { renderBottomNav } from './bottomNav.js';
import { gameScreen } from '../screens/game.js';
import { upgradesScreen } from '../screens/upgrades.js';
import { inventoryScreen } from '../screens/inventory.js';
import { friendsScreen } from '../screens/friends.js';
import { profileScreen } from '../screens/profile.js';

const SCREENS = {
  game: gameScreen,
  upgrades: upgradesScreen,
  inventory: inventoryScreen,
  friends: friendsScreen,
  profile: profileScreen,
};

export function mountShell(root) {
  const shellNode = el('div', { class: 'shell' });
  const headerSlot = el('div');
  const screenContainer = el('div', { class: 'screen-container' });
  const navSlot = el('div');
  shellNode.appendChild(headerSlot);
  shellNode.appendChild(screenContainer);
  shellNode.appendChild(navSlot);
  mount(root, shellNode);

  let currentScreenKey = null;
  let currentScreenModule = null;

  function renderChrome() {
    const { character, screen } = getState();
    clear(headerSlot);
    headerSlot.appendChild(renderHeader(character));
    clear(navSlot);
    navSlot.appendChild(renderBottomNav(screen));
  }

  function renderScreen() {
    const { screen } = getState();
    if (screen === currentScreenKey) return;
    if (currentScreenModule?.unmount) currentScreenModule.unmount();
    clear(screenContainer);
    currentScreenKey = screen;
    currentScreenModule = SCREENS[screen];
    currentScreenModule.mount(screenContainer);
  }

  renderChrome();
  renderScreen();

  subscribe(() => {
    renderChrome();
    renderScreen();
  });
}
