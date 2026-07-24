/**
 * Rotas de prompts editáveis (PRD-017): Regra de Ouro + 3 guias (AppSetting, com
 * fallback nas constantes) e CRUD de prompts personalizados (CustomPrompt).
 * Leitura: viewBoard. Edição: managePrompts (ADMIN/GESTOR).
 */
import type { FastifyInstance } from 'fastify';
import { requirePermission } from '../plugins/auth.js';
import { prisma } from '../lib/prisma.js';
import { getPromptSettings, updatePromptSettings } from '../services/promptKit.js';
import { PromptSettingsSchema, CustomPromptSchema, UpdateCustomPromptSchema } from '@content-engine/shared';

export default async function promptRoutes(fastify: FastifyInstance) {
  const view = { preHandler: [requirePermission('viewBoard')] };
  const manage = { preHandler: [requirePermission('managePrompts')] };

  // ── Regra de Ouro + guias ───────────────────────────────────────────────────
  fastify.get('/prompt-settings', view, async (_request, reply) => {
    return reply.send(await getPromptSettings());
  });

  fastify.put('/prompt-settings', manage, async (request, reply) => {
    const data = PromptSettingsSchema.parse(request.body);
    return reply.send(await updatePromptSettings(data));
  });

  // ── Prompts personalizados ──────────────────────────────────────────────────
  fastify.get('/custom-prompts', view, async (_request, reply) => {
    return reply.send(await prisma.customPrompt.findMany({ orderBy: { updatedAt: 'desc' } }));
  });

  fastify.post('/custom-prompts', manage, async (request, reply) => {
    const data = CustomPromptSchema.parse(request.body);
    const prompt = await prisma.customPrompt.create({ data: { ...data, createdById: request.actor.sub } });
    return reply.status(201).send(prompt);
  });

  fastify.patch('/custom-prompts/:id', manage, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = UpdateCustomPromptSchema.parse(request.body);
    return reply.send(await prisma.customPrompt.update({ where: { id }, data }));
  });

  fastify.delete('/custom-prompts/:id', manage, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.customPrompt.delete({ where: { id } });
    return reply.status(204).send();
  });
}
