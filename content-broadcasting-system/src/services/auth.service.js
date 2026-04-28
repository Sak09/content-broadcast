const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const UserModel = require('../models/user.model');

class AuthService {
  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  static async register({ name, email, password, role }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) throw Object.assign(new Error('Email already registered'), { statusCode: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ id: uuidv4(), name, email, passwordHash, role });
    const token = this.generateToken(user);
    return { user, token };
  }

  static async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

    if (!user.is_active) throw Object.assign(new Error('Account deactivated'), { statusCode: 403 });

    const token = this.generateToken(user);
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }
}

module.exports = AuthService;
