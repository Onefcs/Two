import { el } from '../utils/dom.js';

export function toast(message) {
  const node = el('div', { class: 'toast' }, message);
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2400);
}

export function confirmDialog(message) {
  return Promise.resolve(window.confirm(message)); // eslint-disable-line no-alert
}
