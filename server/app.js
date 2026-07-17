const path = require('path');
const express = require('express');
const cors = require('cors');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/images', express.static(path.join(__dirname, '..', 'images')));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/character', require('./routes/character.routes'));
  app.use('/api/dungeons', require('./routes/dungeons.routes'));
  app.use('/api/battles', require('./routes/battles.routes'));
  app.use('/api/inventory', require('./routes/inventory.routes'));
  app.use('/api/upgrades', require('./routes/upgrades.routes'));
  app.use('/api/crafting', require('./routes/crafting.routes'));
  app.use('/api/friends', require('./routes/friends.routes'));
  app.use('/api/profile', require('./routes/profile.routes'));

  app.use((req, res) => res.status(404).json({ error: 'not_found' }));
  app.use(require('./middleware/errorHandler'));

  return app;
}

module.exports = createApp;
