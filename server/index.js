import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const fallback = JSON.parse(fs.readFileSync(new URL('./data.json', import.meta.url)));
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'portfolio',
});

async function fromDb() {
  const [[profile]] = await pool.query('SELECT * FROM profile LIMIT 1');
  if (!profile) throw new Error('profile table is empty; run npm run seed');
  const [education] = await pool.query('SELECT school, degree, period FROM education ORDER BY id');
  const [rows] = await pool.query('SELECT g.name AS grp, s.name AS item FROM skills s JOIN skill_groups g ON g.id = s.group_id ORDER BY g.id, s.id');
  const skills = [];
  for (const r of rows) {
    let g = skills.find((x) => x.group === r.grp);
    if (!g) skills.push((g = { group: r.grp, items: [] }));
    g.items.push(r.item);
  }
  const [pr] = await pool.query('SELECT title, tech, description, points FROM projects ORDER BY id');
  const [tags] = await pool.query('SELECT kind, name FROM tags ORDER BY id');
  const pick = (k) => tags.filter((t) => t.kind === k).map((t) => t.name);
  return { profile, education, skills, projects: pr, strengths: pick('strength'), languages: pick('language') };
}

const app = express();
app.use(cors());
app.get('/api/portfolio', async (_req, res) => {
  try {
    res.json(await fromDb());
  } catch (err) {
    console.warn('MySQL unavailable, serving data.json:', err.message);
    res.json(fallback);
  }
});
app.listen(process.env.PORT || 3001, () => console.log('API on http://localhost:' + (process.env.PORT || 3001)));
