.PHONY: traefik-init traefik-down up down build logs restart deploy seed-knowledge

ENV_FILE=.env.prod
COMPOSE_PROD=docker compose -f docker-compose.prod.yml --env-file $(ENV_FILE)
COMPOSE_TRAEFIK=docker compose -f docker-compose.traefik.yml --env-file $(ENV_FILE)

# --- Infraestrutura Traefik (rodar uma vez na VPS) ---

traefik-init:
	docker network create proxy 2>/dev/null || true
	docker volume create traefik_certs 2>/dev/null || true
	$(COMPOSE_TRAEFIK) up -d
	@echo "Traefik iniciado."

traefik-down:
	$(COMPOSE_TRAEFIK) down

# --- Aplicação ---

build:
	$(COMPOSE_PROD) build --no-cache

up:
	$(COMPOSE_PROD) up -d

down:
	$(COMPOSE_PROD) down

logs:
	$(COMPOSE_PROD) logs -f

restart:
	$(COMPOSE_PROD) restart

# Deploy completo: build + up (sem --no-cache para reaproveitar layers)
deploy:
	$(COMPOSE_PROD) up -d --build
	@echo ""
	@echo "Deploy concluído — https://$$(grep '^DOMAIN=' $(ENV_FILE) | cut -d= -f2)"

# Aplica a base de conhecimento (modelo white label) + a Regra de Ouro no banco (PRD-012).
# Idempotente; requer o container 'api' rodando (make deploy antes). Roda o JS compilado
# porque a imagem de produção só leva o dist (sem src/tsx).
seed-knowledge:
	$(COMPOSE_PROD) exec api sh -c "cd apps/api && node dist/prisma/seed-knowledge.js"
	@echo ""
	@echo "Base de conhecimento aplicada — novas gerações usam o modelo de negócio."
