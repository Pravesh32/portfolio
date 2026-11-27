
import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_NAME = process.env.DB_NAME || 'portfolio';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

// --------------------------------------------------
// Data Loading & Validation
// --------------------------------------------------

async function loadJSON(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function validateData(data) {
  const requiredArrays = [
    'education',
    'skills',
    'projects',
    'strengths',
    'languages',
  ];

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid portfolio data.');
  }

  if (!data.profile || typeof data.profile !== 'object') {
    throw new Error('Profile information is missing.');
  }

  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Invalid or missing "${key}" array.`);
    }
  }

  const profileFields = [
    'name',
    'title',
    'location',
    'email',
    'phone',
    'github',
    'linkedin',
    'summary',
  ];

  for (const field of profileFields) {
    if (typeof data.profile[field] !== 'string') {
      throw new Error(`Missing or invalid profile field: ${field}`);
    }
  }

  for (const project of data.projects) {
    if (
      !project.title ||
      !Array.isArray(project.tech) ||
      !project.description ||
      !Array.isArray(project.points)
    ) {
      throw new Error(
        `Invalid project data: ${project.title || 'Unknown project'}`
      );
    }
  }
}

// --------------------------------------------------
// Database Setup
// --------------------------------------------------

async function initializeDatabase(db) {
  // Prevent SQL identifier injection through DB_NAME.
  if (!/^[a-zA-Z0-9_]+$/.test(DB_NAME)) {
    throw new Error('Invalid database name in DB_NAME.');
  }

  await db.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await db.query(`USE \`${DB_NAME}\``);

  const schema = await fs.readFile(
    path.join(__dirname, 'schema.sql'),
    'utf8'
  );

  await db.query(schema);

  console.log(`✓ Database "${DB_NAME}" is ready.`);
}

// --------------------------------------------------
// Portfolio Seeding
// --------------------------------------------------

async function seedProfile(db, profile) {
  await db.execute(
    `INSERT INTO profile
    (name, title, location, email, phone, github, linkedin, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.name,
      profile.title,
      profile.location,
      profile.email,
      profile.phone,
      profile.github,
      profile.linkedin,
      profile.summary,
    ]
  );
}

async function seedEducation(db, education) {
  for (const item of education) {
    await db.execute(
      `INSERT INTO education (school, degree, period)
       VALUES (?, ?, ?)`,
      [item.school, item.degree, item.period]
    );
  }
}

async function seedSkills(db, skills) {
  for (const group of skills) {
    const [result] = await db.execute(
      `INSERT INTO skill_groups (name) VALUES (?)`,
      [group.group]
    );

    for (const skill of group.items) {
      await db.execute(
        `INSERT INTO skills (group_id, name)
         VALUES (?, ?)`,
        [result.insertId, skill]
      );
    }
  }
}

async function seedProjects(db, projects) {
  for (const project of projects) {
    await db.execute(
      `INSERT INTO projects (title, tech, description, points)
       VALUES (?, ?, ?, ?)`,
      [
        project.title,
        JSON.stringify(project.tech),
        project.description,
        JSON.stringify(project.points),
      ]
    );
  }
}

async function seedTags(db, values, kind) {
  for (const value of values) {
    await db.execute(
      `INSERT INTO tags (kind, name) VALUES (?, ?)`,
      [kind, value]
    );
  }
}

// --------------------------------------------------
// Main Execution
// --------------------------------------------------

async function main() {
  let db;

  try {
    console.log('\nStarting portfolio database seeding...\n');

    // Load portfolio data.
    const data = await loadJSON(
      path.join(__dirname, 'data.json')
    );

    validateData(data);

    // Connect to MySQL.
    db = await mysql.createConnection(DB_CONFIG);

    console.log('✓ Connected to MySQL.');

    // Create database and tables.
    await initializeDatabase(db);

    // Prevent accidental duplicate seeding.
    const [existing] = await db.execute(
      'SELECT COUNT(*) AS total FROM profile'
    );

    if (Number(existing[0].total) > 0) {
      throw new Error(
        'Portfolio data already exists. Seeding cancelled to prevent duplicates.'
      );
    }

    // Start transaction for data insertion.
    await db.beginTransaction();

    try {
      await seedProfile(db, data.profile);
      console.log('✓ Profile inserted.');

      await seedEducation(db, data.education);
      console.log('✓ Education inserted.');

      await seedSkills(db, data.skills);
      console.log('✓ Skills inserted.');

      await seedProjects(db, data.projects);
      console.log('✓ Projects inserted.');

      await seedTags(db, data.strengths, 'strength');
      await seedTags(db, data.languages, 'language');
      console.log('✓ Strengths and languages inserted.');

      await db.commit();

      console.log('\n--------------------------------');
      console.log('Portfolio database seeded successfully!');
      console.log(`Database: ${DB_NAME}`);
      console.log('--------------------------------\n');
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    console.error('\n✗ Database seeding failed.');
    console.error(`Reason: ${error.message}`);

    process.exitCode = 1;
  } finally {
    if (db) {
      await db.end();
      console.log('MySQL connection closed.');
    }
  }
}

main();
