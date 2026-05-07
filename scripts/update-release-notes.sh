#!/bin/bash
# =============================================================================
# update-release-notes.sh
# Chamado pelo git hook post-commit.
# Detecta os commits novos desde a última execução (lê o ponteiro
# ultimo_commit_inserido do banco) e empilha cada um em commits_pendentes.
# A inserção nas notas só ocorre quando o superadmin confirma cada commit do
# carrossel pelo painel.
#
# Comportamentos:
#   • Se houver vários commits desde a última execução, todos sobem (não só HEAD)
#   • Idempotente: rodar duas vezes sem novos commits é no-op
#   • Fallback: se o ponteiro anterior não existir mais na história
#     (force-push, rebase) ou for a primeira execução, empilha apenas HEAD
#   • Filtros (Merge, chore, wip, ci, build, test, style) aplicam-se commit
#     a commit — commits filtrados não entram na fila
# =============================================================================

set -euo pipefail

# ── Credenciais do banco ──────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../server/.env"

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

PSQL=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME")

# ── Determina HEAD e ponteiro anterior ───────────────────────────────────────

HEAD_HASH=$(git rev-parse HEAD 2>/dev/null || echo "")
if [ -z "$HEAD_HASH" ]; then
  echo "[release-notes] nenhum commit encontrado, abortando."
  exit 0
fi

PREV_HASH=$(PGPASSWORD="$DB_PASS" "${PSQL[@]}" -At \
  -c "SELECT valor FROM rodape_configuracoes WHERE chave = 'ultimo_commit_inserido'" 2>/dev/null || echo "")
PREV_HASH=$(echo "$PREV_HASH" | tr -d '[:space:]')

# ── Lista de commits a empilhar ──────────────────────────────────────────────

if [ -n "$PREV_HASH" ] && git cat-file -e "$PREV_HASH^{commit}" 2>/dev/null; then
  if [ "$PREV_HASH" = "$HEAD_HASH" ]; then
    echo "[release-notes] nenhum commit novo desde ${PREV_HASH:0:7}."
    exit 0
  fi
  echo "[release-notes] empilhando ${PREV_HASH:0:7}..HEAD"
  HASHES=$(git log --reverse --pretty=format:'%H' "${PREV_HASH}..HEAD" 2>/dev/null || echo "")
else
  if [ -n "$PREV_HASH" ]; then
    echo "[release-notes] ponteiro anterior fora da história — empilhando apenas HEAD"
  else
    echo "[release-notes] primeira execução — empilhando apenas HEAD"
  fi
  HASHES="$HEAD_HASH"
fi

if [ -z "$HASHES" ]; then
  echo "[release-notes] nada a empilhar."
  exit 0
fi

# ── Acumula INSERTs e aplica em uma transação ────────────────────────────────

SQL_INSERTS=""
COUNT=0
LAST_MSG=""
LAST_DATE=""
while IFS= read -r HASH; do
  [ -z "$HASH" ] && continue
  MSG=$(git log -1 --pretty=format:'%s' "$HASH" 2>/dev/null || echo "")
  DATE=$(git log -1 --pretty=format:'%ad' --date=format:'%d/%m/%Y' "$HASH" 2>/dev/null || date '+%d/%m/%Y')

  # Filtra commits que não devem virar release notes
  if echo "$MSG" | grep -qiE "^(Merge|chore|wip|style:|ci:|build:|test:)"; then
    echo "[release-notes] ignorado (filtro): ${HASH:0:7} — $MSG"
    continue
  fi

  SAFE_MSG=$(printf '%s' "$MSG" | sed "s/'/''/g")
  SQL_INSERTS="${SQL_INSERTS}
    INSERT INTO commits_pendentes (commit_hash, mensagem, data, detectado_em)
    VALUES ('$HASH', '$SAFE_MSG', '$DATE', NOW())
    ON CONFLICT (commit_hash) DO NOTHING;"
  COUNT=$((COUNT + 1))
  LAST_MSG="$SAFE_MSG"
  LAST_DATE="$DATE"
  echo "[release-notes]   • ${HASH:0:7} — $MSG"
done <<< "$HASHES"

# Mesmo se todos os commits do range foram filtrados, atualizamos o ponteiro
# para HEAD para não reprocessar na próxima execução
SAFE_HEAD_MSG_RAW=$(git log -1 --pretty=format:'%s' "$HEAD_HASH" 2>/dev/null || echo "")
SAFE_HEAD_DATE=$(git log -1 --pretty=format:'%ad' --date=format:'%d/%m/%Y' "$HEAD_HASH" 2>/dev/null || date '+%d/%m/%Y')
SAFE_HEAD_MSG=$(printf '%s' "$SAFE_HEAD_MSG_RAW" | sed "s/'/''/g")

PGPASSWORD="$DB_PASS" "${PSQL[@]}" --quiet 2>/dev/null <<-SQL || echo "[release-notes] ✗ falha ao gravar (continuando)"
  BEGIN;
  $SQL_INSERTS

  -- Mantém o ponteiro mais recente (compat com chaves antigas)
  INSERT INTO rodape_configuracoes (chave, valor, updated_at)
  VALUES
    ('ultimo_commit_inserido', '$HEAD_HASH', NOW()),
    ('ultimo_commit_msg',      '$SAFE_HEAD_MSG', NOW()),
    ('ultimo_commit_data',     '$SAFE_HEAD_DATE', NOW())
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = EXCLUDED.updated_at;
  COMMIT;
SQL

echo "[release-notes] ✓ $COUNT commit(s) empilhado(s) na fila."
exit 0
