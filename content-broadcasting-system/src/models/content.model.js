const { query, queryOne } = require('../config/database');

class ContentModel {
  // ─── Create ───────────────────────────────────────────────────────────────
  static async create({
    id, title, description, subject, fileUrl, filePath,
    fileType, fileSize, originalFilename, uploadedBy, startTime, endTime,
  }) {
    await query(
      `INSERT INTO content
        (id, title, description, subject, file_url, file_path, file_type, file_size,
         original_filename, uploaded_by, status, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, title, description || null, subject, fileUrl, filePath,
       fileType, fileSize, originalFilename, uploadedBy,
       startTime || null, endTime || null]
    );
    return this.findById(id);
  }

  // ─── Read ─────────────────────────────────────────────────────────────────
  static async findById(id) {
    return queryOne(
      `SELECT c.*, u.name AS teacher_name, u.email AS teacher_email,
              p.name AS approver_name
       FROM content c
       JOIN users u ON c.uploaded_by = u.id
       LEFT JOIN users p ON c.approved_by = p.id
       WHERE c.id = ?`,
      [id]
    );
  }

  static async findAll({ status, subject, teacherId, page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    let sql = `SELECT c.*, u.name AS teacher_name, u.email AS teacher_email,
                      p.name AS approver_name
               FROM content c
               JOIN users u ON c.uploaded_by = u.id
               LEFT JOIN users p ON c.approved_by = p.id
               WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    if (subject) { sql += ' AND c.subject = ?'; params.push(subject); }
    if (teacherId) { sql += ' AND c.uploaded_by = ?'; params.push(teacherId); }
    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    return query(sql, params);
  }

  static async countAll({ status, subject, teacherId } = {}) {
    let sql = 'SELECT COUNT(*) AS total FROM content c WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    if (subject) { sql += ' AND c.subject = ?'; params.push(subject); }
    if (teacherId) { sql += ' AND c.uploaded_by = ?'; params.push(teacherId); }
    const row = await queryOne(sql, params);
    return row.total;
  }

  // ─── Approval ─────────────────────────────────────────────────────────────
  static async approve(id, approvedBy) {
    await query(
      `UPDATE content SET status = 'approved', approved_by = ?, approved_at = NOW(),
       rejection_reason = NULL WHERE id = ?`,
      [approvedBy, id]
    );
    return this.findById(id);
  }

  static async reject(id, approvedBy, rejectionReason) {
    await query(
      `UPDATE content SET status = 'rejected', approved_by = ?,
       rejection_reason = ?, approved_at = NOW() WHERE id = ?`,
      [approvedBy, rejectionReason, id]
    );
    return this.findById(id);
  }

  // ─── Live / Scheduling ────────────────────────────────────────────────────
  /**
   * Returns all approved, currently time-active content for a teacher
   * (start_time <= NOW <= end_time, and start_time IS NOT NULL)
   */
  static async findLiveByTeacher(teacherId, subject = null) {
    let sql = `SELECT c.*, cs.rotation_order, cs.duration, csl.subject AS slot_subject
               FROM content c
               JOIN content_schedule cs ON cs.content_id = c.id
               JOIN content_slots csl ON csl.id = cs.slot_id
               WHERE c.uploaded_by = ?
                 AND c.status = 'approved'
                 AND c.start_time IS NOT NULL
                 AND c.end_time IS NOT NULL
                 AND NOW() BETWEEN c.start_time AND c.end_time`;
    const params = [teacherId];
    if (subject) { sql += ' AND c.subject = ?'; params.push(subject); }
    sql += ' ORDER BY c.subject, cs.rotation_order ASC';
    return query(sql, params);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  static async delete(id) {
    return query('DELETE FROM content WHERE id = ?', [id]);
  }

  // ─── Analytics ───────────────────────────────────────────────────────────
  static async getSubjectStats() {
    return query(
      `SELECT subject, status, COUNT(*) AS count
       FROM content GROUP BY subject, status ORDER BY subject, status`
    );
  }

  static async getTeacherStats(teacherId) {
    return query(
      `SELECT subject, status, COUNT(*) AS count
       FROM content WHERE uploaded_by = ?
       GROUP BY subject, status`,
      [teacherId]
    );
  }

  static async getMostActiveSubjects(days = 7) {
    return query(
      `SELECT ca.subject,
              SUM(ca.view_count) AS total_views,
              COUNT(DISTINCT ca.content_id) AS content_count
       FROM content_analytics ca
       WHERE ca.access_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY ca.subject
       ORDER BY total_views DESC
       LIMIT 10`,
      [days]
    );
  }

  static async getContentUsage(days = 7) {
    return query(
      `SELECT ca.content_id, c.title, c.subject, u.name AS teacher_name,
              SUM(ca.view_count) AS total_views,
              MAX(ca.access_date) AS last_accessed
       FROM content_analytics ca
       JOIN content c ON c.id = ca.content_id
       JOIN users u ON u.id = ca.teacher_id
       WHERE ca.access_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY ca.content_id, c.title, c.subject, u.name
       ORDER BY total_views DESC
       LIMIT 20`,
      [days]
    );
  }
}

module.exports = ContentModel;
