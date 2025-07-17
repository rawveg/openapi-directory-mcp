#!/bin/bash

# Install git hooks for the project

HOOKS_DIR=".git/hooks"
SCRIPTS_DIR="scripts"

echo "📎 Installing git hooks..."

# Install pre-push hook
if [ -f "$SCRIPTS_DIR/pre-push.sh" ]; then
    cp "$SCRIPTS_DIR/pre-push.sh" "$HOOKS_DIR/pre-push"
    chmod +x "$HOOKS_DIR/pre-push"
    echo "✅ Installed pre-push hook"
else
    echo "⚠️  Pre-push script not found"
fi

echo ""
echo "Git hooks installed successfully!"
echo ""
echo "The pre-push hook will run pre-flight checks before pushing to remote."
echo "To skip hooks (not recommended), use: git push --no-verify"