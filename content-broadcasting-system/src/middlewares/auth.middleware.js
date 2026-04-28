const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const { unauthorized, forbidden } = require('../utils/response');

/**
 * Verify JWT and attach user to req
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') return unauthorized(res, 'Token expired');
      return unauthorized(res, 'Invalid token');
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) return unauthorized(res, 'User not found');
    if (!user.is_active) return forbidden(res, 'Account deactivated');

    req.user = user;
    next();
  } catch (err) {
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * Role-based access control factory
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (!roles.includes(req.user.role)) {
    return forbidden(res, `Access restricted to: ${roles.join(', ')}`);
  }
  next();
};

const isPrincipal = authorize('principal');
const isTeacher = authorize('teacher');
const isPrincipalOrTeacher = authorize('principal', 'teacher');

module.exports = { authenticate, authorize, isPrincipal, isTeacher, isPrincipalOrTeacher };
