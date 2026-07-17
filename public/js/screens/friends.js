import { el, mount } from '../utils/dom.js';
import { api, ApiError } from '../api.js';
import { toast } from '../ui/modal.js';
import { CLASS_LABELS } from '../config.js';
import { formatNumber } from '../utils/format.js';

export const friendsScreen = {
  container: null,
  destroyed: false,

  async mount(container) {
    this.container = container;
    this.destroyed = false;
    mount(container, el('div', { class: 'screen' }, 'Загрузка...'));
    await this.reload();
  },

  unmount() {
    this.destroyed = true;
  },

  async reload() {
    try {
      const [{ friends }, requests] = await Promise.all([api.get('/friends'), api.get('/friends/requests')]);
      if (this.destroyed) return;
      this.render(friends, requests);
    } catch (err) {
      if (this.destroyed) return;
      mount(this.container, el('div', { class: 'screen' }, 'Не удалось загрузить друзей.'));
      void err;
    }
  },

  render(friends, requests) {
    const usernameInput = el('input', { type: 'text', placeholder: 'Логин игрока' });
    const addPanel = el('div', { class: 'panel' }, [
      el('h2', {}, 'Добавить друга'),
      el('div', { class: 'row' }, [
        usernameInput,
        el('button', {
          class: 'btn primary small',
          onClick: async () => {
            const username = usernameInput.value.trim();
            if (!username) return;
            try {
              await api.post('/friends/requests', { username });
              usernameInput.value = '';
              toast('Заявка отправлена');
              await this.reload();
            } catch (err) {
              toast(err instanceof ApiError ? requestErrorText(err.message) : 'Не удалось отправить заявку.');
            }
          },
        }, 'Добавить'),
      ]),
    ]);

    const incomingPanel = el('div', { class: 'panel' }, [
      el('h2', {}, `Входящие заявки (${requests.incoming.length})`),
      ...(requests.incoming.length === 0 ? [el('div', { class: 'muted' }, 'Нет заявок.')] : requests.incoming.map((r) =>
        el('div', { class: 'friend-row' }, [
          el('div', { class: 'avatar' }, '👤'),
          el('div', { class: 'info' }, [el('div', { class: 'name' }, r.username)]),
          el('button', { class: 'btn small primary', onClick: async () => { await api.post(`/friends/requests/${r.id}/accept`); await this.reload(); } }, 'Принять'),
          el('button', { class: 'btn small', onClick: async () => { await api.post(`/friends/requests/${r.id}/decline`); await this.reload(); } }, 'Отклонить'),
        ])
      )),
    ]);

    const outgoingPanel = requests.outgoing.length > 0 ? el('div', { class: 'panel' }, [
      el('h2', {}, 'Исходящие заявки'),
      ...requests.outgoing.map((r) => el('div', { class: 'friend-row' }, [
        el('div', { class: 'avatar' }, '👤'),
        el('div', { class: 'info' }, [el('div', { class: 'name' }, r.username), el('div', { class: 'meta' }, 'Ожидание...')]),
      ])),
    ]) : null;

    const friendsPanel = el('div', { class: 'panel' }, [
      el('h2', {}, `Друзья (${friends.length})`),
      ...(friends.length === 0 ? [el('div', { class: 'muted' }, 'Пока нет друзей.')] : friends.map((f) =>
        el('div', { class: 'friend-row' }, [
          el('div', { class: 'avatar' }, '👤'),
          el('div', { class: 'info' }, [
            el('div', { class: 'name' }, f.username),
            el('div', { class: 'meta' }, f.character
              ? `${CLASS_LABELS[f.character.class]} · Ур.${f.character.level} · ⚡${formatNumber(f.character.power)}`
              : 'Без персонажа'),
          ]),
          el('button', {
            class: 'btn small danger',
            onClick: async () => {
              await api.del(`/friends/${f.userId}`);
              await this.reload();
            },
          }, 'Удалить'),
        ])
      )),
    ]);

    mount(this.container, el('div', { class: 'screen' }, [addPanel, incomingPanel, outgoingPanel, friendsPanel].filter(Boolean)));
  },
};

function requestErrorText(code) {
  const map = {
    user_not_found: 'Игрок с таким логином не найден.',
    cannot_friend_self: 'Нельзя добавить самого себя.',
    friendship_exists: 'Заявка уже отправлена или вы уже друзья.',
  };
  return map[code] || 'Не удалось отправить заявку.';
}
