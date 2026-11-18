import 'dotenv/config';
import fs from 'fs';
import mysql from 'mysql2/promise';
const d = JSON.parse(fs.readFileSync(new URL('./data.json', import.meta.url)));
const db = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1', port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true,
});
await db.query(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const p = d.profile;
await db.query('INSERT INTO profile (name,title,location,email,phone,github,linkedin,summary) VALUES (?,?,?,?,?,?,?,?)',
  [p.name, p.title, p.location, p.email, p.phone, p.github, p.linkedin, p.summary]);
for (const e of d.education) await db.query('INSERT INTO education (school,degree,period) VALUES (?,?,?)', [e.school, e.degree, e.period]);
for (const g of d.skills) {
  const [r] = await db.query('INSERT INTO skill_groups (name) VALUES (?)', [g.group]);
  for (const s of g.items) await db.query('INSERT INTO skills (group_id,name) VALUES (?,?)', [r.insertId, s]);
}
for (const x of d.projects) await db.query('INSERT INTO projects (title,tech,description,points) VALUES (?,?,?,?)',
  [x.title, JSON.stringify(x.tech), x.description, JSON.stringify(x.points)]);
for (const n of d.strengths) await db.query("INSERT INTO tags (kind,name) VALUES ('strength',?)", [n]);
for (const n of d.languages) await db.query("INSERT INTO tags (kind,name) VALUES ('language',?)", [n]);
console.log('Database "portfolio" seeded.');
await db.end();
