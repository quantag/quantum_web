# Deployment Agent

Dynamic deployment assistant for the Quantum application using GitHub Copilot.

## Usage

### Start a chat with the deployment agent:

**In VS Code Chat:**
```
@deploy [your deployment request]
```

**Or use the slash command:**
```
/deploy [full|lab-name|assets]
```

## Common Commands

### Full Site Deployment
```
@deploy full site
@deploy everything
```
Builds the project, cleans old files, uploads all files, and restarts PM2.

### Lab-Specific Deployment
```
@deploy circuit-optimizer
@deploy update guppy-compiler
@deploy only qedit
```
Cleans old chunks (hashes change on rebuild), removes the lab folder and prerendered page, uploads all new files.

### Assets Only
```
@deploy assets
@deploy assets folder
@deploy only images and fonts
```
Uploads assets without restarting the entire application.

### Specific Files
```
@deploy main and polyfills files
@deploy update styles
@deploy server folder only
```
Uploads only specified files, restarting PM2 if needed.

### Quick Deploy (No Build)
```
@deploy without building
@deploy existing dist
```
Deploys already-built files without running `npm run build`.

## Interactive Features

The agent will:

1. **Analyze your request** - Understands natural language deployment needs
2. **Check prerequisites** - Verifies dist folder exists and tools are available
3. **Confirm before acting** - Shows deployment plan and asks for confirmation
4. **Provide feedback** - Real-time updates on deployment progress
5. **Handle errors** - Reports issues and suggests solutions

## Examples

### Example 1: Deploy after making lab changes
```
@deploy I updated the circuit-optimizer lab, please deploy only that lab
```

**Agent Response:**
```
🚀 Deployment Plan:
- Clean: chunk-*.js, main-*.js, polyfills-*.js, styles-*.css (hashes changed)
- Remove: /var/www/quantum.quantag-it.com/labs/circuit-optimizer/
- Remove: /var/www/quantum.quantag-it.com/server/assets-chunks/labs_circuit-optimizer_index_html.mjs
- Clean: server/ folder
- Upload: dist/quantum-new/browser/* (includes updated lab)
- Upload: dist/quantum-new/server/ (updated chunks and prerendered pages)
- Restart PM2: Yes

⚠️ SSH will prompt for password: ROMA1000

Proceed? (yes/no)
```

### Example 2: Deploy new assets
```
@deploy I added new images to assets/images, deploy assets only
```

**Agent Response:**
```
🚀 Deployment Plan:
- Upload: dist/quantum-new/browser/assets/*
- Restart: No (assets only)

Proceeding with deployment...
✓ Assets uploaded successfully
```

### Example 3: Full deployment
```
@deploy deploy everything to production
```

**Agent Response:**
```
🚀 Deployment Plan:
- Build: npm run build
- Clean: chunk-*.js, index*.html, main-*.js, polyfills-*.js, styles-*.css, server/
- Upload: browser/* and server/
- Restart PM2: Yes

Building project...
✓ Build completed
✓ Old files cleaned
✓ Browser files uploaded
✓ Server files uploaded
✓ PM2 restarted

Deployment completed successfully! 🎉
```

## Server Configuration

The agent connects to:
- **Host**: `cryspprod1.quantag-it.com`
- **User**: `mykyta`
- **Path**: `/var/www/quantum.quantag-it.com`
- **Authentication**: Interactive (password: ROMA1000)

### Available Labs on Server

The following labs are currently deployed:
- **base64** - Base64 encoder/decoder
- **circuit-optimizer** - Quantum circuit optimization tool
- **compare-sql** - SQL comparison utility  
- **envi-datacube-generator** - ENVI datacube generator
- **ewald-visualizer** - Ewald sphere visualizer
- **guppy-compiler** - Guppy language compiler
- **qedit** - Quantum circuit editor
- **qic** - Quantum information calculator
- **qir** - Quantum IR compiler
- **quantum-portfolio-optimizer** - Portfolio optimization tool
- **script-generator** - Script generation utility
- **xyz** - XYZ file processor
- **q3d, q3d2, q3d3, qgx** - 3D quantum visualizers
- **qaoa** - QAOA algorithm implementation

When deploying a lab, use the exact folder name (e.g., `circuit-optimizer`, not `circuit-lab`).

## Prerequisites

### Required Tools

**SSH Access** (built-in on most systems):
- Windows: Use Git Bash, PowerShell, or WSL
- Linux/macOS: SSH is pre-installed

**Note**: The deployment agent uses interactive SSH (prompts for password). You'll need to enter the password when prompted.

**Alternative**: For automated deployments, install `sshpass`:
- Windows (Git Bash): Download from https://sourceforge.net/projects/sshpass/
- Linux: `sudo apt-get install sshpass`
- macOS: `brew install hudochenkov/sshpass/sshpass`

## Server Structure

The production server is organized as follows:

```
/var/www/quantum.quantag-it.com/
├── chunk-*.js              # Frontend JavaScript chunks
├── index.html              # Main page (SSR)
├── index.csr.html          # Client-side rendered version
├── main-*.js               # Main application bundle
├── polyfills-*.js          # Browser polyfills
├── styles-*.css            # Application styles
├── ecosystem.config.js     # PM2 configuration
├── favicon.svg, robots.txt, sitemap.xml
├── assets/                 # Static assets
│   ├── endpoints.json
│   ├── images/
│   ├── monaco/             # Monaco editor
│   └── styles/
├── labs/                   # Lab applications
│   ├── index.html          # Labs list page
│   ├── base64/
│   ├── circuit-optimizer/
│   ├── guppy-compiler/
│   ├── qedit/
│   └── ... (16+ labs)
├── server/                 # SSR server files (same level as frontend)
│   ├── server.mjs          # Main SSR server
│   ├── chunk-*.mjs         # Server-side chunks
│   └── assets-chunks/      # Prerendered pages
│       ├── labs_circuit-optimizer_index_html.mjs
│       ├── labs_guppy-compiler_index_html.mjs
│       └── ... (prerendered HTML for each lab)
├── docs/
└── privacy-policy/
```

## Advanced Usage

### Deploy with conditions
```
@deploy check if there are changes in the dist folder, if yes deploy the full site
```

### Deploy and verify
```
@deploy circuit-lab and then check if the deployment was successful
```

### Custom deployment
```
@deploy I need to update only the index.html and main JavaScript files
```

## Troubleshooting

### "sshpass not found"
Install sshpass using the commands in Prerequisites section.

### "dist folder not found"
Run `npm run build` first or ask the agent to build:
```
@deploy build and deploy
```

### SSH connection issues
Verify you have network access to the server and credentials are correct.

### PM2 restart failed
SSH to the server manually and check PM2 status:
```bash
ssh mykyta@cryspprod1.quantag-it.com
cd /var/www/quantum.quantag-it.com
pm2 status
```

## Safety Features

- **Confirmation prompts** - Agent asks before executing destructive operations
- **Prerequisite checks** - Verifies tools and files exist before proceeding
- **Error handling** - Reports issues with clear messages
- **Selective deployment** - Only touches what you specify

## Benefits vs Traditional Scripts

| Feature | Deploy Agent | Shell Scripts |
|---------|--------------|---------------|
| Flexibility | Natural language requests | Fixed commands |
| Confirmation | Interactive prompts | Automatic execution |
| Error Handling | Contextual help | Generic errors |
| Partial Updates | Smart file selection | All or nothing |
| Learning Curve | Conversational | Requires command knowledge |

## Tips

1. **Be specific**: "deploy circuit-lab" is clearer than "deploy something"
2. **Ask for confirmation**: The agent will show you what it plans to do
3. **Check dist first**: Make sure your build is up to date
4. **Use natural language**: "I changed the footer, deploy that" works!
5. **Combine operations**: "build and deploy" or "deploy and verify"

## Need Help?

Ask the agent:
```
@deploy what can you help me deploy?
@deploy how do I deploy only one file?
@deploy show me deployment options
```
