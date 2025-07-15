# NPM Publishing Setup Guide

This repository is configured with automated NPM publishing via GitHub Actions. Follow this guide to set up the necessary secrets and permissions.

## 🔐 Required Setup Steps

### 1. Create NPM Account & Get Auth Token

If you don't have an NPM account:
```bash
# Create account at npmjs.com or via CLI
npm adduser
```

Generate an access token:
1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Click your profile → "Access Tokens"
3. Click "Generate New Token" → "Classic Token"
4. Choose "Automation" (for CI/CD use)
5. Copy the token (starts with `npm_...`)

### 2. Configure GitHub Repository Secrets

Go to your GitHub repository settings:

**Repository → Settings → Secrets and variables → Actions**

Add the following secret:
- **Name**: `NPM_TOKEN`
- **Value**: Your NPM access token from step 1

### 3. Set Up NPM Environment (Optional but Recommended)

For additional security, you can set up a GitHub Environment:

1. **Repository → Settings → Environments**
2. Click "New environment"
3. Name: `npm-production`
4. Configure protection rules:
   - ✅ Required reviewers (add maintainers)
   - ✅ Wait timer: 0 minutes
   - ✅ Deployment branches: Selected branches → `main`

The release workflow already references this environment on line 150:
```yaml
environment: npm-production
```

### 4. Verify Package Configuration

Ensure your `package.json` is properly configured:

```json
{
  "name": "openapi-directory-mcp",
  "version": "1.2.0",
  "description": "Model Context Protocol server for accessing enhanced dual-source OpenAPI directory",
  "main": "dist/index.js",
  "bin": {
    "openapi-directory-mcp": "dist/index.js"
  },
  "publishConfig": {
    "access": "public"
  },
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ]
}
```

Key points:
- ✅ `publishConfig.access: "public"` for public packages
- ✅ `files` array specifies what gets published
- ✅ `bin` field for CLI functionality

## 🚀 How Publishing Works

### Automated Release Process

1. **Create Release Manually**:
   - Go to GitHub → Releases → "Create a new release"
   - Create a new tag (e.g., `v1.2.1`) 
   - Add release title and description
   - Publish the release

2. **Automated Workflow Triggers**:
   When you create a release with a tag, GitHub Actions automatically:
   - **Pre-release validation**: Lint, type-check, build, package validation
   - **Build & Package**: Clean build, create tarball, upload artifacts
   - **NPM Publish**: Authenticate and publish to NPM registry
   - **Update Release**: Add NPM publication info to your existing release
   - **Post-release**: Verify publication and accessibility

**Alternative (Command Line)**:
```bash
# Update version and create tag
npm version patch  # or minor/major
git push origin --tags
git push origin main
```

### Version Handling

The workflow automatically handles version types:

- **Stable releases**: `1.2.3` → Published with `latest` tag
- **Pre-releases**: `1.2.3-beta.1` → Published with `beta` tag

### Publication Verification

The workflow includes comprehensive verification:
- ✅ Package exists on NPM registry
- ✅ Version matches expected version
- ✅ Installation test via `npm install`
- ✅ CLI functionality test

## 🔧 Manual Publishing (Emergency Only)

If automated publishing fails, you can publish manually:

```bash
# Ensure you're on main branch with latest changes
git checkout main
git pull origin main

# Build the project
npm run build
chmod +x dist/index.js

# Verify everything looks good
npm run validate
npm pack --dry-run

# Publish (requires NPM_TOKEN in environment)
npm publish
```

## 🛡️ Security Considerations

### NPM Token Security
- ✅ Use "Automation" token type (scoped to specific packages)
- ✅ Store in GitHub Secrets (encrypted at rest)
- ✅ Only accessible during GitHub Actions runs
- ✅ Consider IP restrictions if available

### Access Control
- ✅ Repository environment protection for releases
- ✅ Branch protection on `main` branch
- ✅ Required status checks before merge
- ✅ Manual approval for releases (if environment configured)

### Package Security
- ✅ `files` array prevents accidental inclusion of sensitive files
- ✅ `.npmignore` not needed (using `files` allowlist approach)
- ✅ Automated security scanning via CodeQL

## 📋 Troubleshooting

### Common Issues

**1. "Authentication failed" during NPM publish**
- Check NPM token is valid and not expired
- Ensure token has correct permissions
- Verify token is correctly stored in GitHub Secrets

**2. "Package already exists" error**
- Version already published to NPM
- Increment version number: `npm version patch`
- Check if you're trying to republish same version

**3. "Permission denied" during publish**
- NPM token doesn't have publish permissions
- Package name might be taken by someone else
- Ensure you're a maintainer of the package

**4. GitHub Actions failing**
- Check workflow logs in Actions tab
- Common cause: missing or invalid NPM_TOKEN secret
- Verify package.json configuration

### Debug Commands

```bash
# Check if package name is available
npm view openapi-directory-mcp

# Verify NPM authentication locally
npm whoami

# Test package installation
npm pack
npm install -g ./openapi-directory-mcp-1.2.0.tgz
```

## 📞 Getting Help

If you encounter issues:

1. **Check workflow logs**: Repository → Actions → Failed run
2. **NPM Status**: Check [NPM Status](https://status.npmjs.org/)
3. **GitHub Issues**: Create issue with workflow logs
4. **NPM Support**: [NPM Support](https://docs.npmjs.com/support)

## ✅ Verification Checklist

Before first release, verify:

- [ ] NPM account created and verified
- [ ] NPM access token generated (starts with `npm_`)
- [ ] GitHub Secret `NPM_TOKEN` configured
- [ ] Package name available on NPM
- [ ] `package.json` properly configured
- [ ] Environment protection (optional) configured
- [ ] Test release workflow with dry run

---

**Ready to publish!** 🚀

Once configured, simply run `npm version patch && git push origin --tags` to trigger automated publishing.