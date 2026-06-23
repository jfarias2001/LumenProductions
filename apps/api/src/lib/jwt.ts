import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwtAccessSecret, { expiresIn: config.jwtAccessExpiry });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwtAccessSecret) as AccessTokenPayload;
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiry });
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, config.jwtRefreshSecret) as { sub: string };
}
