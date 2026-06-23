#!/usr/bin/env bash
# deploy.sh — Script de primeiro deploy na VPS
# Uso: bash deploy.sh <URL_DO_REPOSITORIO>
set -euo pipefail

REPO_URL="${1:-}"
INSTALL_DIR="/opt/lumen-content-engine"
DOMAIN="mkt.paglamp.com.br"

echo "======================================"
echo "  Lumen Content Engine — VPS Deploy"
echo "======================================"

# 1. Dependências do sistema
echo "[1/6] Instalando dependências..."
apt-get update -qq
apt-get install -y -qq git make

# Verifica Docker
if ! command -v docker &>/dev/null; then
  echo "Docker não encontrado. Instale Docker antes de continuar."
  echo "  curl -fsSL https://get.docker.com | sh"
  exit 1
fi

# 2. Clone ou atualização do repositório
echo "[2/6] Repositório..."
if [ -z "$REPO_URL" ] && [ ! -d "$INSTALL_DIR/.git" ]; then
  echo "Passe a URL do repositório como argumento:"
  echo "  bash deploy.sh https://github.com/seu-usuario/seu-repo.git"
  exit 1
fi

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "  Atualizando repositório existente..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "  Clonando repositório..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# 3. Arquivo de ambiente
echo "[3/6] Configuração de ambiente..."
if [ ! -f .env.prod ]; then
  cp .env.prod.example .env.prod
  echo ""
  echo "=========================================================="
  echo "  ATENÇÃO: Edite .env.prod com suas chaves reais!"
  echo ""
  echo "  nano $INSTALL_DIR/.env.prod"
  echo ""
  echo "  Preencha:"
  echo "    POSTGRES_PASSWORD  — senha forte do banco"
  echo "    JWT_ACCESS_SECRET  — openssl rand -hex 32"
  echo "    JWT_REFRESH_SECRET — openssl rand -hex 32"
  echo "    OPENAI_API_KEY     — sua chave OpenAI (se usar IA)"
  echo ""
  echo "  Depois execute:"
  echo "    cd $INSTALL_DIR && make traefik-init && make deploy"
  echo "=========================================================="
  exit 0
fi

# 4. Rede e volume do Traefik
echo "[4/6] Configurando rede Traefik..."
docker network create traefik-public 2>/dev/null || echo "  (rede traefik-public já existe)"
docker volume create traefik_certs 2>/dev/null || echo "  (volume traefik_certs já existe)"

# 5. Traefik
echo "[5/6] Traefik..."
if docker ps --format '{{.Names}}' | grep -q '^traefik$'; then
  echo "  Traefik já está rodando — pulando."
else
  docker compose -f docker-compose.traefik.yml --env-file .env.prod up -d
  echo "  Traefik iniciado."
fi

# 6. Build e deploy da aplicação
echo "[6/6] Build e deploy da aplicação..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo ""
echo "======================================"
echo "  Deploy concluído!"
echo "  Aguarde ~60s para o TLS ser emitido."
echo "  Acesse: https://$DOMAIN"
echo "======================================"
