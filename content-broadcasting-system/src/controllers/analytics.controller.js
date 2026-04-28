const AnalyticsService = require('../services/analytics.service');
const { success, error } = require('../utils/response');

class AnalyticsController {
  static async mostActiveSubjects(req, res) {
    try {
      const days = parseInt(req.query.days) || 7;
      const data = await AnalyticsService.getMostActiveSubjects(days);
      return success(res, data, `Most active subjects in last ${days} days`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  static async contentUsage(req, res) {
    try {
      const days = parseInt(req.query.days) || 7;
      const data = await AnalyticsService.getContentUsage(days);
      return success(res, data, `Content usage in last ${days} days`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  static async teacherAnalytics(req, res) {
    try {
      const teacherId = req.user.role === 'teacher' ? req.user.id : req.params.teacherId;
      const days = parseInt(req.query.days) || 30;
      const data = await AnalyticsService.getTeacherAnalytics(teacherId, days);
      return success(res, data, `Teacher analytics for last ${days} days`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  
  static async dailyTrend(req, res) {
    try {
      const { subject, days = 14 } = req.query;
      const data = await AnalyticsService.getDailyTrend(subject || null, parseInt(days));
      return success(res, data, 'Daily view trend');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  
  static async summary(req, res) {
    try {
      const data = await AnalyticsService.getOverallSummary();
      return success(res, data, 'Overall analytics summary');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = AnalyticsController;
