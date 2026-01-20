# Command Snippets Guide

Snippets are reusable command templates that help you execute frequently-used commands quickly in the SSH terminal.

---

## Overview

The Snippets feature combines **command templates** with optional **keyboard shortcuts** into a unified system:

- **Save commonly used commands** for quick access
- **Assign hotkeys** (Ctrl+Shift+Key or Cmd+Shift+Key) for instant execution
- **Organize by category** (System, Docker, Git, Network, etc.)
- **Scope-based visibility** - global, per-host, or per-group

---

## Accessing Snippets

### Snippets Panel

When connected to an SSH terminal, a **Snippets panel** appears on the right side:

1. **Search** - Find snippets by name, command, or tag
2. **Filter by category** - Click category icons to filter
3. **Click to insert** - Click any snippet to insert its command into the terminal
4. **Collapse/Expand** - Toggle panel visibility with the arrow button

### Snippets Manager

Access the full Snippets Manager from the sidebar menu:

1. Click the **Snippets** icon in the sidebar
2. View all snippets organized by scope
3. Add, edit, or delete snippets
4. Manage hotkey assignments

---

## Creating Snippets

### Quick Add

1. Open **Snippets Manager** from sidebar
2. Click **Add Snippet** button
3. Fill in the form:
   - **Name** - Short descriptive title (e.g., "List Docker Containers")
   - **Command** - The shell command (e.g., `docker ps -a`)
   - **Category** - Select from predefined categories or "Custom"
   - **Scope** - Where this snippet is visible:
     - `Global` - Available on all servers
     - `Host` - Only on specific server
     - `Group` - Only on servers in a specific group
   - **Hotkey** (optional) - Single character for keyboard shortcut
   - **Description** (optional) - Explain what the command does
   - **Tags** (optional) - Keywords for better searchability

4. Click **Save**

### Example Snippets

| Name | Command | Category | Hotkey |
|------|---------|----------|--------|
| Disk Usage | `df -h` | System | D |
| List All Docker | `docker ps -a` | Docker | P |
| Git Status | `git status` | Git | G |
| Check Ports | `netstat -tulpn` | Network | N |
| Tail Logs | `tail -f /var/log/syslog` | System | L |
| Restart Nginx | `sudo systemctl restart nginx` | System | R |

---

## Using Hotkeys

### Keyboard Shortcuts

When assigned a hotkey, you can execute a snippet instantly:

| Platform | Shortcut Format |
|----------|-----------------|
| **Windows/Linux** | `Ctrl + Shift + [Key]` |
| **macOS** | `Cmd + Shift + [Key]` |

**Example:** If snippet "Docker PS" has hotkey `P`:
- Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
- The command `docker ps` is typed and executed automatically

### Reserved Keys

Some keys are reserved for system functions and cannot be used:

| Key | Reserved For |
|-----|--------------|
| A | Add New Host |
| C | Copy |
| L | Toggle LAN Transfer |
| O | Switch Terminal/SFTP |
| T | Local Terminal |
| V | Paste |

### Viewing Hotkeys

The Snippets Panel displays assigned hotkeys as badges:

```
┌─────────────────────────────────────┐
│ Docker PS                   Ctrl+Shift+P │
│ ┌─────────────────────────────────┐ │
│ │ docker ps -a                    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Categories

Organize snippets with built-in categories:

| Icon | Category | Use For |
|------|----------|---------|
| 🖥️ | System | OS commands, services, logs |
| 🐳 | Docker | Container management |
| 📦 | Git | Version control |
| 🌐 | Network | Ports, connections, DNS |
| 📁 | Files | File operations |
| 🗄️ | Database | Database commands |
| ✨ | Custom | Anything else |

---

## Scope Levels

Control where each snippet appears:

### Global Scope
- Visible on **all** SSH connections
- Best for universal commands (e.g., `ls -la`, `htop`)

### Host Scope
- Visible only when connected to a **specific server**
- Best for server-specific commands (e.g., restart app-specific service)

### Group Scope
- Visible on all servers in a **specific group**
- Best for environment-specific commands (e.g., all production servers)

---

## Tips & Best Practices

### 1. Use Variables Wisely
For commands with variable parts, leave placeholders:
```bash
# Instead of hardcoding paths
tail -f /path/to/log

# Use a pattern you'll remember to edit
tail -f [LOG_PATH]
```

### 2. Chain Commands
Combine multiple commands:
```bash
cd /var/www && git pull && systemctl restart app
```

### 3. Use Aliases for Complex Commands
For very long commands, consider creating shell aliases on the server instead.

### 4. Organize with Tags
Add tags like `prod`, `dev`, `urgent` for easier filtering.

### 5. Backup Your Snippets
Snippets are included in Marix encrypted backups. Export regularly!

---

## Data Storage

- Snippets are stored locally in browser localStorage
- **Included in encrypted backups** (.marix files)
- **Synced with Google Drive** (if enabled)
- No cloud storage without your explicit backup action

---

## Migration from Legacy Hotkeys

If you previously used the Custom Hotkeys feature, your hotkeys are automatically migrated to Snippets:

- Each legacy hotkey becomes a global-scope snippet
- The hotkey assignment is preserved
- Legacy data is cleaned up after migration

---

## Troubleshooting

### Hotkey Not Working?

1. **Check for conflicts** - The key might be reserved or used by another snippet
2. **Focus on terminal** - The terminal must be focused for hotkeys to work
3. **Verify assignment** - Open Snippets Manager and check the hotkey column

### Snippet Not Appearing?

1. **Check scope** - Make sure the snippet's scope matches your current connection
2. **Check category filter** - Clear the category filter in the panel
3. **Search cleared** - Make sure the search box is empty

### Command Not Executing?

1. **Check terminal state** - Make sure you're not in the middle of another command
2. **Permission issues** - Some commands may require sudo
