const { query, queryOne } = require('../config/database');

class ContentSlotModel {
  static async findOrCreate(teacherId, subject) {
    let slot = await queryOne(
      'SELECT * FROM content_slots WHERE teacher_id = ? AND subject = ?',
      [teacherId, subject]
    );
    if (!slot) {
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      await query(
        'INSERT INTO content_slots (id, subject, teacher_id) VALUES (?, ?, ?)',
        [id, subject, teacherId]
      );
      slot = await queryOne('SELECT * FROM content_slots WHERE id = ?', [id]);
    }
    return slot;
  }

  static async findByTeacher(teacherId) {
    return query('SELECT * FROM content_slots WHERE teacher_id = ?', [teacherId]);
  }

  static async findById(id) {
    return queryOne('SELECT * FROM content_slots WHERE id = ?', [id]);
  }
}

module.exports = ContentSlotModel;
