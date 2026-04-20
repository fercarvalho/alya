#!/bin/bash
# =============================================================================
# update-release-notes.sh
# Chamado pelo git hook post-commit.
# Armazena o commit pendente no banco — a inserção nas notas ocorre apenas
# quando o superadmin confirma (com possível edição da mensagem) pelo painel.
# =============================================================================

set -euo pipefail

# ── Commit info ──────────────────────────────────────────────────────────────

COMMIT_HASH=$(git log -1 --pretty=format:"%H")
COMMIT_MSG=$(git log -1 --pretty=format:"%s")
COMMIT_DATE=$(git log -1 --pretty=format:"%ad" --date=format:"%d/%m/%Y")

# Ignorar commits que não devem aparecer nas notas
if echo "$COMMIT_MSG" | grep -qiE "^(Merge|chore|wip|style:|ci:|build:|test:)"; then
  echo "[release-notes] commit ignorado: $COMMIT_MSG"
  exit 0
fi

# ── Credenciais do banco ──────────────────────────────────────────────────────

ENV_FILE="$(dirname "$0")/../server/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "[release-notes] .env não encontrado, pulando atualização."
  exit 0
fi

DB_HOST=$(grep -E "^DB_HOST=" "$ENV_FILE" | cut -d= -f2 | tr -d '[:space:]')
DB_PORT=$(grep -E "^DB_PORT=" "$ENV_FILE" | cut -d= -f2 | tr -d '[:space:]')
DB_NAME=$(grep -E "^DB_NAME=" "$ENV_FILE" | cut -d= -f2 | tr -d '[:space:]')
DB_USER=$(grep -E "^DB_USER=" "$ENV_FILE" | cut -d= -f2 | tr -d '[:space:]')
DB_PASS=$(grep -E "^DB_PASSWORD=" "$ENV_FILE" | cut -d= -f2 | tr -d '[:space:]')

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Escapa aspas simples para o SQL
SAFE_MSG=$(echo "$COMMIT_MSG" | sed "s/'/''/g")

# ── Salva o commit pendente no banco (sem inserir nas notas ainda) ────────────

PGPASSWORD="$DB_PASS" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -c "INSERT INTO rodape_configuracoes (chave, valor, updated_at)
      VALUES ('ultimo_commit_inserido', '${COMMIT_HASH}', NOW())
      ON CONFLICT (chave) DO UPDATE SET valor = '${COMMIT_HASH}', updated_at = NOW();

      INSERT INTO rodape_configuracoes (chave, valor, updated_at)
      VALUES ('ultimo_commit_msg', '${SAFE_MSG}', NOW())
      ON CONFLICT (chave) DO UPDATE SET valor = '${SAFE_MSG}', updated_at = NOW();

      INSERT INTO rodape_configuracoes (chave, valor, updated_at)
      VALUES ('ultimo_commit_data', '${COMMIT_DATE}', NOW())
      ON CONFLICT (chave) DO UPDATE SET valor = '${COMMIT_DATE}', updated_at = NOW();" \
  --quiet 2>/dev/null \
  && echo "[release-notes] ✓ commit pendente salvo: ${COMMIT_DATE} — ${COMMIT_MSG} [${COMMIT_HASH:0:7}]" \
  || echo "[release-notes] ✗ falha ao salvar commit pendente (continuando normalmente)"

exit 0
