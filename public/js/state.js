const listeners = new Set();

const state = {
  user: null,
  character: null,
  screen: 'game', // 'game' | 'upgrades' | 'inventory' | 'friends' | 'profile'
};

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn(state);
}

export function setUser(user) {
  state.user = user;
  notify();
}

export function setCharacter(character) {
  state.character = character;
  notify();
}

export function setScreen(screen) {
  state.screen = screen;
  notify();
}
