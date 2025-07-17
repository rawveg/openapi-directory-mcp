#!/bin/bash

# Pre-push hook script
# Run pre-flight checks before pushing to remote

echo "🚀 Running pre-push checks..."

# Run pre-flight checks
npm run preflight

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Pre-push checks failed!"
    echo "Fix the issues above before pushing."
    echo ""
    echo "To bypass pre-push checks (not recommended):"
    echo "  git push --no-verify"
    exit 1
fi

echo ""
echo "✅ All pre-push checks passed!"
echo "Proceeding with push..."