# Deployment Guide

Deploy the Quantum application using GitHub Copilot's custom deployment agent.

## ��� Quick Start

Open GitHub Copilot Chat:

```
@deploy
```

Or use the prompt:

```
/deploy
```

## How It Works

The Deploy Agent will:
- ✅ Scan your dist folder to detect which labs to deploy
- ✅ Show you a deployment plan (labs found, cleanup details)
- ✅ Ask for confirmation before executing
- ✅ Execute deployment automatically (no password prompts!)
- ✅ Preserve monaco folder in assets (large, doesn't change)
- ✅ Clean only the labs that exist in your dist
- ✅ Restart PM2 service automatically

## Prerequisites

**SSH Key Authentication** (Already configured ✓):
- Passwordless authentication via SSH keys
- No passwords needed during deployment

**Build**: Make sure to run `npm run build` before deploying

## Server Details

- **Host**: `cryspprod1.quantag-it.com`
- **User**: `mykyta`
- **Path**: `/var/www/quantum.quantag-it.com`
- **Authentication**: SSH key (passwordless)

## What Gets Deployed

The agent will:
1. **Scan dist folder** - Detects which labs you have built
2. **Clean frontend** - Removes all chunk-*.js, main-*.js, polyfills-*.js, styles-*.css
3. **Clean labs** - Only removes labs that exist in your dist folder
4. **Clean assets** - Removes everything EXCEPT monaco/ folder (large, preserved)
5. **Clean server** - Removes entire /server folder
6. **Upload everything** - Uploads all browser and server files
7. **Restart PM2** - Stops, deletes, starts, and saves PM2 configuration

## Example Usage

```
@deploy
```

**Agent Response:**
```
��� Deployment Plan:
- Labs found in dist: ewald-visualizer, envi-datacube-generator, circuit-optimizer
- Clean: All frontend chunks, only labs above, assets (except monaco), server folder
- Upload: All browser and server files
- Restart: PM2

Proceed? [yes/no]
```

## Key Features

- **Automatic lab detection**: Scans your dist folder, only deploys what you built
- **Monaco preservation**: Never re-uploads large monaco editor files
- **No password prompts**: Uses SSH key authentication (passwordless)
- **Smart cleanup**: Only removes labs that exist in dist
- **Chunk hash handling**: Cleans all frontend chunks (they regenerate on every build)
- **Safety first**: Shows detailed plan before execution

## Troubleshooting

### "dist folder not found"
Run `npm run build` first before deploying

### SSH Connection Issues
Verify network access to cryspprod1.quantag-it.com

Test connection:
```bash
ssh mykyta@cryspprod1.quantag-it.com "echo Connected"
```

### PM2 Not Restarting
Check PM2 status manually:
```bash
ssh mykyta@cryspprod1.quantag-it.com "cd /var/www/quantum.quantag-it.com && pm2 list"
```

### SSH Key Issues
If SSH key stops working, check:
```bash
ls -la ~/.ssh/id_ed25519*
ssh -v mykyta@cryspprod1.quantag-it.com
```
