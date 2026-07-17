import { el, mount, clear } from '../utils/dom.js';
import { api, setToken, ApiError } from '../api.js';
import { CLASS_LABELS } from '../config.js';

const CLASS_DESCRIPTIONS = {
  mage: 'Дальний бой. Высокая атака, мало HP и защиты, средние скорость атаки и крит.',
  warrior: 'Ближний бой. Танк: низкая атака, много HP и защиты, низкая скорость атаки.',
  archer: 'Дальний бой. Высокая атака, мало HP и защиты, высокие скорость атаки и крит.',
  zhnec: 'Ближний бой. Высокая атака, среднее HP и защита, низкая скорость атаки, вампиризм.',
  assasin: 'Ближний бой. Низкая атака, мало HP и защиты, высокая скорость атаки, сильный крит.',
};
const CLASSES = ['mage', 'warrior', 'archer', 'zhnec', 'assasin'];

function spriteIdlePath(cls) {
  const files = {
    mage: 'images/Character/mage/IDLE.png',
    warrior: 'images/Character/warrior/IDLE.png',
    archer: 'images/Character/archer/IDLE.png',
    zhnec: 'images/Character/zhnec/IDLE (FLAMING SWORD).png',
    assasin: 'images/Character/assasin/IDLE.png',
  };
  return encodeURI(files[cls]);
}

function renderClassSelect(root, user, onComplete) {
  let selected = null;
  const nameInput = el('input', { type: 'text', placeholder: 'Имя персонажа', maxlength: '20' });
  const errorText = el('div', { class: 'error-text' });
  const grid = el('div', { class: 'class-grid' });

  function renderGrid() {
    clear(grid);
    for (const cls of CLASSES) {
      grid.appendChild(
        el('div', {
          class: `class-card${selected === cls ? ' selected' : ''}`,
          onClick: () => { selected = cls; renderGrid(); },
        }, [
          el('img', { src: spriteIdlePath(cls), alt: CLASS_LABELS[cls] }),
          el('div', { class: 'name' }, CLASS_LABELS[cls]),
          el('div', { class: 'desc' }, CLASS_DESCRIPTIONS[cls]),
        ])
      );
    }
  }
  renderGrid();

  async function submit() {
    errorText.textContent = '';
    if (!selected) { errorText.textContent = 'Выберите персонажа.'; return; }
    const name = nameInput.value.trim();
    if (name.length < 2) { errorText.textContent = 'Введите имя персонажа (от 2 символов).'; return; }
    try {
      const character = await api.post('/character', { class: selected, name });
      onComplete(user, character);
    } catch (err) {
      errorText.textContent = err instanceof ApiError && err.message === 'invalid_name' ? 'Некорректное имя.' : 'Не удалось создать персонажа.';
    }
  }

  mount(root, el('div', { class: 'auth-screen' }, [
    el('h1', {}, 'Выберите героя'),
    grid,
    el('div', { class: 'field' }, [el('label', {}, 'Имя'), nameInput]),
    errorText,
    el('button', { class: 'btn primary', onClick: submit }, 'Начать приключение'),
  ]));
}

async function afterAuth(root, user, onComplete) {
  try {
    const character = await api.get('/character');
    onComplete(user, character);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      renderClassSelect(root, user, onComplete);
    } else {
      mount(root, el('div', { class: 'auth-screen' }, [el('div', { class: 'error-text' }, 'Не удалось загрузить персонажа. Обновите страницу.')]));
    }
  }
}

export function resumeSession(root, user, onComplete) {
  afterAuth(root, user, onComplete);
}

export function startAuthFlow(root, onComplete) {
  let mode = 'login';

  function errorMessage(err) {
    if (!(err instanceof ApiError)) return 'Не удалось подключиться к серверу.';
    const map = {
      invalid_username: 'Логин должен быть от 3 до 32 символов.',
      invalid_password: 'Пароль должен быть не короче 6 символов.',
      username_taken: 'Этот логин уже занят.',
      invalid_credentials: 'Неверный логин или пароль.',
    };
    return map[err.message] || 'Что-то пошло не так, попробуйте ещё раз.';
  }

  function renderCredentialsForm() {
    const usernameInput = el('input', { type: 'text', autocomplete: 'username', placeholder: 'Логин' });
    const passwordInput = el('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Пароль (мин. 6 символов)' });
    const errorText = el('div', { class: 'error-text' });

    async function submit() {
      errorText.textContent = '';
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      try {
        const result = mode === 'login'
          ? await api.post('/auth/login', { username, password })
          : await api.post('/auth/register', { username, password });
        setToken(result.token);
        await afterAuth(root, result.user, onComplete);
      } catch (err) {
        errorText.textContent = errorMessage(err);
      }
    }

    return el('div', { class: 'auth-screen' }, [
      el('h1', {}, 'Two — RPG'),
      el('div', { class: 'field' }, [el('label', {}, 'Логин'), usernameInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Пароль'), passwordInput]),
      errorText,
      el('button', { class: 'btn primary', onClick: submit }, mode === 'login' ? 'Войти' : 'Создать аккаунт'),
      el('button', {
        class: 'link-btn',
        onClick: () => { mode = mode === 'login' ? 'register' : 'login'; render(); },
      }, mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'),
    ]);
  }

  function render() {
    mount(root, renderCredentialsForm());
  }

  render();
}
