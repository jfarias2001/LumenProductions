import type { FastifyInstance } from 'fastify';
import argon2 from 'argon2';
import { prisma } from '../lib/prisma.js';
import { requirePermission } from '../plugins/auth.js';
import { CreateUserSchema, UpdateUserSchema } from '@content-engine/shared';

export default async function userRoutes(fastify: FastifyInstance) {
  const guardAdmin = { preHandler: [requirePermission('manageUsersConfig')] };

  fastify.get('/users', { preHandler: [requirePermission('manageUsersConfig')] }, async (_req, reply) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return reply.send(users);
  });

  fastify.post('/users', guardAdmin, async (request, reply) => {
    const body = CreateUserSchema.parse(request.body);
    const passwordHash = await argon2.hash(body.password);
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash, role: body.role },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    return reply.status(201).send(user);
  });

  fastify.patch('/users/:id', guardAdmin, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateUserSchema.parse(request.body);
    const data: Record<string, unknown> = { ...body };
    if (body.password) {
      data['passwordHash'] = await argon2.hash(body.password);
      delete data['password'];
    }
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    return reply.send(user);
  });

  fastify.delete('/users/:id', guardAdmin, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.user.update({ where: { id }, data: { active: false } });
    return reply.status(204).send();
  });
}
