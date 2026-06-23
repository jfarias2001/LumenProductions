import type { FastifyInstance } from 'fastify';
import argon2 from 'argon2';
import { prisma } from '../lib/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { LoginSchema } from '@content-engine/shared';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/login
  fastify.post('/auth/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.active) {
      return reply.status(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas.' } });
    }
    const valid = await argon2.verify(user.passwordHash, body.password);
    if (!valid) {
      return reply.status(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas.' } });
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken(user.id);

    const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE * 1000);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } });

    void reply.setCookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: REFRESH_MAX_AGE,
    });

    return reply.send({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  });

  // POST /auth/refresh
  fastify.post('/auth/refresh', async (request, reply) => {
    const token = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (!token) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Refresh token ausente.' } });

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Refresh token inválido.' } });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Refresh token revogado ou expirado.' } });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Usuário inativo.' } });
    }

    // Rotate refresh token
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const newRefresh = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE * 1000);
    await prisma.refreshToken.create({ data: { userId: user.id, token: newRefresh, expiresAt } });

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });

    void reply.setCookie(REFRESH_COOKIE, newRefresh, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: REFRESH_MAX_AGE,
    });

    return reply.send({ accessToken });
  });

  // POST /auth/logout
  fastify.post('/auth/logout', async (request, reply) => {
    const token = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (token) {
      await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
      void reply.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    }
    return reply.send({ ok: true });
  });

  // GET /auth/me
  fastify.get('/auth/me', async (request, reply) => {
    if (!request.actor?.sub) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Não autenticado.' } });
    const user = await prisma.user.findUnique({
      where: { id: request.actor.sub },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Usuário não encontrado.' } });
    return reply.send(user);
  });
}
