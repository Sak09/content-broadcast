const UserModel = require('../models/user.model');
const { success, paginated, error, notFound } = require('../utils/response');
const { buildPagination } = require('../utils/response');

class UserController {
  static async list(req, res) {
    try {
      const { role, page = 1, limit = 10 } = req.query;
      const [rows, total] = await Promise.all([
        UserModel.findAll({ role, page: parseInt(page), limit: Math.min(parseInt(limit), 50) }),
        UserModel.countAll({ role }),
      ]);
      return paginated(res, rows, buildPagination(page, limit, total));
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  static async getById(req, res) {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) return notFound(res, 'User not found');
      return success(res, user);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = UserController;
