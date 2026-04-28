const { query, queryOne } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AnalyticsModel {
  /**
   * Increment view count for a content item (upsert by content_id + date)
   */
  static async trackView(contentId, teacherId, subject) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    await query(
      `INSERT INTO content_analytics (id, content_id, teacher_id, subject, access_date, view_count)
       VALUES (?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE view_count = view_count + 1, updated_at = NOW()`,
      [uuidv4(), contentId, teacherId, subject, today]
    );
  }

  static async getMostActiveSubjects(days = 7, limit = 10) {
    return query(
      `SELECT subject,
              SUM(view_count) AS total_views,
              COUNT(DISTINCT content_id) AS content_count,
              MAX(access_date) AS last_active
       FROM content_analytics
       WHERE access_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY subject
       ORDER BY total_views DESC
       LIMIT ?`,
      [days, limit]
    );
  }

  static async getContentUsageStats(days = 7, limit = 20) {
    return query(
      `SELECT ca.content_id, c.title, c.subject, u.name AS teacher_name,
              SUM(ca.view_count) AS total_views,
              MAX(ca.access_date) AS last_accessed,
              MIN(ca.access_date) AS first_accessed
       FROM content_analytics ca
       JOIN content c ON c.id = ca.content_id
       JOIN users u ON u.id = ca.teacher_id
       WHERE ca.access_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY ca.content_id, c.title, c.subject, u.name
       ORDER BY total_views DESC
       LIMIT ?`,
      [days, limit]
    );
  }

  static async getTeacherAnalytics(teacherId, days = 30) {
    return query(
      `SELECT ca.subject,
              SUM(ca.view_count) AS total_views,
              COUNT(DISTINCT ca.content_id) AS content_count,
              MAX(ca.access_date) AS last_active
       FROM content_analytics ca
       WHERE ca.teacher_id = ?
         AND ca.access_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY ca.subject
       ORDER BY total_views DESC`,
      [teacherId, days]
    );
  }

  static async getDailyTrend(subject = null, days = 14) {
    let sql = `SELECT access_date, SUM(view_count) AS total_views
               FROM content_analytics
               WHERE access_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`;
    const params = [days];
    if (subject) { sql += ' AND subject = ?'; params.push(subject); }
    sql += ' GROUP BY access_date ORDER BY access_date ASC';
    return query(sql, params);
  }

  static async getOverallSummary() {
    return queryOne(
      `SELECT
         COUNT(DISTINCT content_id) AS unique_content_accessed,
         SUM(view_count) AS total_views,
         COUNT(DISTINCT subject) AS active_subjects,
         COUNT(DISTINCT teacher_id) AS active_teachers
       FROM content_analytics`
    );
  }
}

module.exports = AnalyticsModel;
