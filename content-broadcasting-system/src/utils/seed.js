require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { runMigrations } = require('./migrate');
const { query } = require('../config/database');
const logger = require('./logger');

const seed = async () => {
  await runMigrations();


  const principalId = uuidv4();
  const principalHash = await bcrypt.hash('principal123', 12);
  await query(
    `INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
    [principalId, 'Mr. Principal', 'principal@school.com', principalHash, 'principal']
  );


  const teachers = [
    { id: uuidv4(), name: 'Ms. Sharma', email: 'teacher1@school.com' },
    { id: uuidv4(), name: 'Mr. Verma', email: 'teacher2@school.com' },
    { id: uuidv4(), name: 'Ms. Gupta', email: 'teacher3@school.com' },
  ];

  for (const t of teachers) {
    const hash = await bcrypt.hash('teacher123', 12);
    await query(
      `INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [t.id, t.name, t.email, hash, 'teacher']
    );
  }

  logger.info('Seed complete');
  logger.info('---');
  logger.info('Principal: principal@school.com / principal123');
  logger.info('Teacher 1: teacher1@school.com / teacher123');
  logger.info('Teacher 2: teacher2@school.com / teacher123');
  logger.info('Teacher 3: teacher3@school.com / teacher123');
};

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
