const AnalyticsModel = require('../models/analytics.model');
const ContentModel = require('../models/content.model');
const { cacheGet, cacheSet } = require('../config/redis');

class AnalyticsService {
  static async getMostActiveSubjects(days = 7) {
    const cacheKey = `analytics:active-subjects:${days}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const [dbRows, dbStats] = await Promise.all([
      AnalyticsModel.getMostActiveSubjects(days),
      ContentModel.getSubjectStats(),
    ]);

    
    const statsMap = {};
    for (const row of dbStats) {
      if (!statsMap[row.subject]) statsMap[row.subject] = {};
      statsMap[row.subject][row.status] = row.count;
    }

    const result = dbRows.map((r) => ({
      subject: r.subject,
      total_views: r.total_views,
      content_count: r.content_count,
      last_active: r.last_active,
      content_stats: statsMap[r.subject] || {},
    }));

    await cacheSet(cacheKey, result, 120);
    return result;
  }

  static async getContentUsage(days = 7) {
    const cacheKey = `analytics:content-usage:${days}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const result = await AnalyticsModel.getContentUsageStats(days);
    await cacheSet(cacheKey, result, 120);
    return result;
  }

  static async getTeacherAnalytics(teacherId, days = 30) {
    const cacheKey = `analytics:teacher:${teacherId}:${days}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const result = await AnalyticsModel.getTeacherAnalytics(teacherId, days);
    await cacheSet(cacheKey, result, 120);
    return result;
  }

  static async getDailyTrend(subject = null, days = 14) {
    const cacheKey = `analytics:trend:${subject || 'all'}:${days}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const result = await AnalyticsModel.getDailyTrend(subject, days);
    await cacheSet(cacheKey, result, 120);
    return result;
  }

  static async getOverallSummary() {
    const cacheKey = 'analytics:summary';
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const result = await AnalyticsModel.getOverallSummary();
    await cacheSet(cacheKey, result, 60);
    return result;
  }
}

module.exports = AnalyticsService;
