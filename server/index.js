require('dotenv').config();

const pool = require('./db/pool');
const migrate = require('./db/migrate');
const seed = require('./content/seed');
const createApp = require('./app');

async function main() {
  await migrate(pool);
  await seed(pool);

  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`[server] listening on ${port}`);
  });
}

main().catch((err) => {
  console.error('[server] fatal startup error', err);
  process.exit(1);
});
