#!/bin/bash
# =============================================================================
# install-hooks.sh
# Instala os git hooks do projeto. Rodar uma vez após clonar o repositório.
# =============================================================================

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
SCRIPTS_DIR="$(dirname "$0")"

echo "Instalando git hooks em $HOOKS_DIR..."

# post-commit
cat > "$HOOKS_DIR/post-commit" << 'HOOK'
#!/bin/bash
bash "$(git rev-parse --show-toplevel)/scripts/update-release-notes.sh"
HOOK

chmod +x "$HOOKS_DIR/post-commit"

echo "✓ post-commit instalado"
echo ""
echo "Hooks instalados com sucesso!"
