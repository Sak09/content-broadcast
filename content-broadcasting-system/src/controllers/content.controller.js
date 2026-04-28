const ContentService = require('../services/content.service');
const { success, created, paginated, error, notFound } = require('../utils/response');
const { buildPagination } = require('../utils/response');

class ContentController {
  static async upload(req, res) {
    try {
      const { title, description, subject, start_time, end_time, rotation_duration } = req.body;
      const content = await ContentService.upload({
        title,
        description,
        subject,
        file: req.file,
        uploadedBy: req.user.id,
        startTime: start_time || null,
        endTime: end_time || null,
        rotationDuration: rotation_duration ? parseInt(rotation_duration) : 5,
      });
      return created(res, content, 'Content uploaded successfully');
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }

  static async list(req, res) {
    try {
      const { status, subject, teacher_id, page = 1, limit = 10 } = req.query;

      let teacherId = teacher_id;
      if (req.user.role === 'teacher') teacherId = req.user.id;

      const { rows, total } = await ContentService.list({
        status,
        subject,
        teacherId,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50),
      });

      const pagination = buildPagination(page, limit, total);
      return paginated(res, rows, pagination);
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }

  static async getById(req, res) {
    try {
      const content = await ContentService.getById(req.params.id);
      // Teacher can only view own content
      if (req.user.role === 'teacher' && content.uploaded_by !== req.user.id) {
        return error(res, 'Access denied', 403);
      }
      return success(res, content);
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }

  static async approve(req, res) {
    try {
      const content = await ContentService.approve(req.params.id, req.user.id);
      return success(res, content, 'Content approved successfully');
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }

  static async reject(req, res) {
    try {
      const { rejection_reason } = req.body;
      const content = await ContentService.reject(req.params.id, req.user.id, rejection_reason);
      return success(res, content, 'Content rejected');
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }


  static async delete(req, res) {
    try {
      await ContentService.delete(req.params.id, req.user.id, req.user.role);
      return success(res, null, 'Content deleted successfully');
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }


  static async pending(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const { rows, total } = await ContentService.list({
        status: 'pending',
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50),
      });
      const pagination = buildPagination(page, limit, total);
      return paginated(res, rows, pagination);
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }
}

module.exports = ContentController;
