import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getQuery } from '../config/db';
import { UserRecord, AuthUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-watch-party-key-2026';

export class AuthService {
  static async register(username: string, password: string, name?: string): Promise<{ user: AuthUser; token: string }> {
    const cleanUsername = username.trim();
    const cleanName = name ? name.trim() : cleanUsername;

    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters long');
    }

    const existingUser = await getQuery<UserRecord>('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    if (existingUser) {
      throw new Error('Username is already taken');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = uuidv4();

    await runQuery(
      'INSERT INTO users (id, username, name, passwordHash) VALUES (?, ?, ?, ?)',
      [id, cleanUsername, cleanName, passwordHash]
    );

    const user: AuthUser = { id, username: cleanUsername, name: cleanName };
    const token = this.generateToken(user);
    return { user, token };
  }

  static async login(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const cleanUsername = username.trim();
    const userRecord = await getQuery<UserRecord>('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    if (!userRecord) {
      throw new Error('Invalid username or password');
    }

    const isValid = await bcrypt.compare(password, userRecord.passwordHash);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    const user: AuthUser = { 
      id: userRecord.id, 
      username: userRecord.username,
      name: userRecord.name || userRecord.username 
    };
    const token = this.generateToken(user);
    return { user, token };
  }

  static generateToken(user: AuthUser): string {
    return jwt.sign({ id: user.id, username: user.username, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  }

  static verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      return decoded;
    } catch {
      return null;
    }
  }

  static async findUserByUsername(username: string): Promise<UserRecord | undefined> {
    if (!username || typeof username !== 'string') return undefined;
    const cleanUsername = username.trim();
    return getQuery<UserRecord>('SELECT * FROM users WHERE username = ?', [cleanUsername]);
  }
}
