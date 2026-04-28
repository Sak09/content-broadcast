const SchedulingService = require('../services/scheduling.service');
const UserModel = require('../models/user.model');
const { success, error } = require('../utils/response');

class BroadcastController {
 
  static async getLive(req, res) {
    try {
      const { teacherId } = req.params;
      const { subject } = req.query;


      const teacher = await UserModel.findById(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return success(res, null, 'No content available');
      }

      const result = await SchedulingService.getLiveContent(teacherId, subject || null);

      if (!result.available) {
        return success(res, null, result.message);
      }

      return success(res, result.data, result.message);
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }

  
  static async getLiveSubjects(req, res) {
    try {
      const { teacherId } = req.params;

      const teacher = await UserModel.findById(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return success(res, [], 'No subjects available');
      }

      const result = await SchedulingService.getLiveContent(teacherId, null);
      if (!result.available) {
        return success(res, [], 'No content available');
      }

      const subjects = Array.isArray(result.data)
        ? [...new Set(result.data.map((c) => c.subject))]
        : [result.data?.subject].filter(Boolean);

      return success(res, subjects, 'Active subjects');
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }
}

module.exports = BroadcastController;
