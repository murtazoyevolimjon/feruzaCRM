// Lokal ishlab chiqish uchun: Docker/Postgres o'rnatmasdan PostgreSQL ishga tushiradi.
// `npm run dev:db` — port 5436, foydalanuvchi erp_user, baza erp_data.
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'fs';

const dir = './.pgdata';
const fresh = !fs.existsSync(dir);
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'erp_user',
  password: 'datapass',
  port: 5436,
  persistent: true,
});

if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase('erp_data');
console.log('PostgreSQL tayyor: postgresql://erp_user:datapass@localhost:5436/erp_data');

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
