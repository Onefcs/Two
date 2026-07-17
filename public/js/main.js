import { api, getToken, ApiError } from './api.js';
import { setUser, setCharacter } from './state.js';
import { startAuthFlow, resumeSession } from './screens/auth.js';
import { mountShell } from './ui/shell.js';

const root = document.getElementById('app');

function boot() {
  if (!getToken()) {
    startAuthFlow(root, launchGame);
    return;
  }

  api.get('/auth/me')
    .then((me) => resumeSession(root, me.user, launchGame))
    .catch((err) => {
      if (err instanceof ApiError) startAuthFlow(root, launchGame);
    });
}

function launchGame(user, character) {
  setUser(user);
  setCharacter(character);
  mountShell(root);
}

boot();
