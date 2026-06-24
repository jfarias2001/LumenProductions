import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt.js';
import { Role } from '@content-engine/shared';

declare module 'fastify' {
  interface FastifyRequest {
    actor: AccessTokenPayload;
  }
}

// Roles that are allowed per capability (SPEC-001 §12.3)
export const PERMISSIONS = {
  manageUsersConfig: [Role.ADMIN],
  viewBoard: [Role.ADMIN, Role.GESTOR, Role.ESTRATEGISTA, Role.ROTEIRISTA, Role.GRAVACAO, Role.EDITOR, Role.REVISOR_RETENCAO],
  createCard: [Role.ADMIN, Role.GESTOR, Role.ESTRATEGISTA],
  confirmValidation: [Role.ADMIN, Role.GESTOR, Role.ESTRATEGISTA],
  editStrategy: [Role.ADMIN, Role.GESTOR, Role.ESTRATEGISTA, Role.ROTEIRISTA],
  editCreative: [Role.ADMIN, Role.GESTOR, Role.ESTRATEGISTA, Role.ROTEIRISTA, Role.GRAVACAO, Role.EDITOR],
  markRecording: [Role.ADMIN, Role.GESTOR, Role.GRAVACAO, Role.EDITOR],
  editRetention: [Role.ADMIN, Role.GESTOR, Role.EDITOR],
  approveRetention: [Role.ADMIN, Role.GESTOR, Role.REVISOR_RETENCAO],
  schedulePublish: [Role.ADMIN, Role.GESTOR, Role.ESTRATEGISTA],
  enterMetrics: [Role.ADMIN, Role.GESTOR, Role.ESTRATEGISTA],
  useAI: [Role.ADMIN, Role.GESTOR, Role.ESTRATEGISTA, Role.ROTEIRISTA, Role.EDITOR, Role.REVISOR_RETENCAO],
  managePrompts: [Role.ADMIN, Role.GESTOR],
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export default fp(async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('actor', null as unknown as AccessTokenPayload);

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return; // public routes skip
    const token = authHeader.slice(7);
    try {
      request.actor = verifyAccessToken(token);
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Token inválido ou expirado.' } });
    }
  });
});

export function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.actor?.sub) {
    void reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária.' } });
    return false;
  }
  return true;
}

export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAuth(request, reply)) return;
    const role = request.actor.role as Role;
    const allowed = PERMISSIONS[permission] as readonly Role[];
    if (!allowed.includes(role)) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Sem permissão para esta ação.' } });
    }
  };
}
