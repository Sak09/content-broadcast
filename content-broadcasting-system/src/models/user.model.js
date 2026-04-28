const { query, queryOne } = require('../config/database');

class UserModel {
  static async findByEmail(email) {
    return queryOne('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
  }

  static async findById(id) {
    return queryOne(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
      [id]
    );
  }

  static async create({ id, name, email, passwordHash, role }) {
    await query(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, passwordHash, role]
    );
    return this.findById(id);
  }

  static async findAll({ role, page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    let sql = 'SELECT id, name, email, role, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    if (role) { sql += ' AND role = ?'; params.push(role); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    return query(sql, params);
  }

  static async countAll({ role } = {}) {
    let sql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];
    if (role) { sql += ' AND role = ?'; params.push(role); }
    const row = await queryOne(sql, params);
    return row.total;
  }
}

module.exports = UserModel;
