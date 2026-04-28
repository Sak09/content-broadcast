const AuthService = require('../services/auth.service');
const { success, created, error } = require('../utils/response');

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, password, role } = req.body;
      const result = await AuthService.register({ name, email, password, role });
      return created(res, result, 'Registration successful');
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });
      return success(res, result, 'Login successful');
    } catch (err) {
      return error(res, err.message, err.statusCode || 500);
    }
  }

  static async me(req, res) {
    return success(res, req.user, 'User profile');
  }
}

module.exports = AuthController;
