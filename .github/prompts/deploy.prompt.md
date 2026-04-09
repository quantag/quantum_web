---
description: "Deploy quantum application to production server"
argument-hint: "Deploy"
agent: "agent"
tools: [execute, read]
---

Deploy the Quantum application to production (cryspprod1.quantag-it.com).

## Execution Steps

1. Check if dist folder exists
2. Scan labs in `dist/quantum-new/browser/labs/` folder
3. Show deployment plan (which labs found, what will be cleaned)
4. Ask for user confirmation
5. Execute deployment with SSH/SCP (passwordless via SSH keys):
   - Clean old frontend files (chunks, index, main, polyfills, styles)
   - Clean labs that exist in dist
   - Clean assets EXCEPT monaco/ folder
   - Clean server folder
   - Upload all browser files
   - Upload server folder
   - Restart PM2

## Server Details

- Host: `cryspprod1.quantag-it.com`
- User: `mykyta`
- Authentication: SSH key (passwordless)
- Path: `/var/www/quantum.quantag-it.com`

## Key Points

- **Monaco folder**: NEVER delete /assets/monaco (large, doesn't change)
- **Lab detection**: Scan dist/quantum-new/browser/labs/ to know which labs to clean
- **SSH Keys**: Uses passwordless authentication (no prompts)

## Output

Show clear progress and completion status.
