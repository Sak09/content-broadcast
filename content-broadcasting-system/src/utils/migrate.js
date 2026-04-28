require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('./logger');

const migrations = [
  

  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('principal', 'teacher') NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,


  `CREATE TABLE IF NOT EXISTS content (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    file_size BIGINT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(36) NOT NULL,
    status ENUM('uploaded', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    approved_by VARCHAR(36),
    approved_at TIMESTAMP NULL,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_status (status),
    INDEX idx_subject (subject),
    INDEX idx_start_end (start_time, end_time)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  
  `CREATE TABLE IF NOT EXISTS content_slots (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    subject VARCHAR(100) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_teacher_subject (teacher_id, subject),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_subject (subject)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS content_schedule (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    content_id VARCHAR(36) NOT NULL,
    slot_id VARCHAR(36) NOT NULL,
    rotation_order INT NOT NULL DEFAULT 0,
    duration INT NOT NULL DEFAULT 5 COMMENT 'Duration in minutes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES content_slots(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_content_slot (content_id, slot_id),
    INDEX idx_slot_order (slot_id, rotation_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS content_analytics (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    content_id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    access_date DATE NOT NULL,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_content_date (content_id, access_date),
    INDEX idx_subject_date (subject, access_date),
    INDEX idx_teacher_date (teacher_id, access_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const runMigrations = async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });

    await createDatabase(conn);
    await conn.query(`USE \`${process.env.DB_NAME || 'content_broadcasting'}\``);

    logger.info('Running migrations...');
    for (let i = 0; i < migrations.length; i++) {
      await conn.query(migrations[i]);
      logger.info(`Migration ${i + 1}/${migrations.length} complete`);
    }

    logger.info('All migrations completed successfully');
  } catch (err) {
    logger.error('Migration failed:', err.message || err);
    console.error('Full error:', err);
    throw err;
  } finally {
    if (conn) await conn.end();
  }
};

const createDatabase = async (conn) => {
  const dbName = process.env.DB_NAME || 'content_broadcasting';
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  logger.info(` Database '${dbName}' created or already exists`);
};

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations, createDatabase };
