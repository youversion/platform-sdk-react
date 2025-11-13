# NPM Publishing Documentation

Complete guide to automated NPM publishing for this monorepo.

## 📚 Documentation Files

### [PUBLISHING.md](./PUBLISHING.md)
Comprehensive guide for day-to-day publishing. Main reference for developers.

- Publishing workflow overview
- Changeset guidelines and best practices
- Security features (provenance, OIDC)
- Troubleshooting guide
- Manual publishing (emergency)

### [WORKFLOW.md](./WORKFLOW.md)
Visual diagrams and quick reference. Great for understanding the flow at a glance.

- Visual workflow diagrams
- Version bump examples
- Common scenarios
- Quick reference commands
- GitHub Actions job flows

## 🚀 Quick Start

1. **Daily Publishing** → Use [PUBLISHING.md](./PUBLISHING.md)
2. **Visual Reference** → Check [WORKFLOW.md](./WORKFLOW.md)

## ⚡ TL;DR

```bash
# Make your changes, then:
pnpm changeset           # Create changeset
# Commit and open PR
# Merge to main
# "Version Packages" PR auto-created
# Merge version PR → Auto-publish to NPM! 🎉
```

## 📦 Published Packages

- `@youversion/platform-core`
- `@youversion/platform-react-hooks`
- `@youversion/platform-react-ui`

## 🛠️ GitHub Workflows

- **CI** (`.github/workflows/ci.yml`) - Runs on all PRs
- **Release** (`.github/workflows/release.yml`) - Automates publishing