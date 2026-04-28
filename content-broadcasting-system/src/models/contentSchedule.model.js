const { query, queryOne } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ContentScheduleModel {
  static async create({ contentId, slotId, rotationOrder, duration = 5 }) {
    const id = uuidv4();
    await query(
      `INSERT INTO content_schedule (id, content_id, slot_id, rotation_order, duration)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rotation_order = VALUES(rotation_order), duration = VALUES(duration)`,
      [id, contentId, slotId, rotationOrder, duration]
    );
    return queryOne('SELECT * FROM content_schedule WHERE content_id = ? AND slot_id = ?', [contentId, slotId]);
  }

  static async findBySlot(slotId) {
    return query(
      `SELECT cs.*, c.title, c.subject, c.status, c.start_time, c.end_time
       FROM content_schedule cs
       JOIN content c ON c.id = cs.content_id
       WHERE cs.slot_id = ?
       ORDER BY cs.rotation_order ASC`,
      [slotId]
    );
  }

  static async findByContent(contentId) {
    return queryOne('SELECT * FROM content_schedule WHERE content_id = ?', [contentId]);
  }

  static async getNextRotationOrder(slotId) {
    const row = await queryOne(
      'SELECT COALESCE(MAX(rotation_order), -1) + 1 AS next_order FROM content_schedule WHERE slot_id = ?',
      [slotId]
    );
    return row.next_order;
  }

  static async deleteByContent(contentId) {
    return query('DELETE FROM content_schedule WHERE content_id = ?', [contentId]);
  }
}

module.exports = ContentScheduleModel;
