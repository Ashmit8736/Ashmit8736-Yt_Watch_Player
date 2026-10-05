import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { username, password, name } = req.body;
      const result = await AuthService.register(username, password, name);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      const result = await AuthService.login(username, password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Login failed' });
    }
  }

  static async getMe(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const user = AuthService.verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.json({ user });
  }

  static async checkUsername(req: Request, res: Response) {
    try {
      const { username } = req.params;
      const user = await AuthService.findUserByUsername(username);
      res.json({ exists: !!user, username: user?.username || username });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
