import * as pty from 'node-pty';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { execSync } from 'child_process';

/**
 * Find SSH executable path
 * On Windows, node-pty needs full path to ssh.exe
 */
function findSSHExecutable(): string {
  const isWindows = process.platform === 'win32';
  
  if (!isWindows) {
    return 'ssh'; // Unix can use PATH
  }
  
  // Windows: Try common SSH locations
  const possiblePaths = [
    // Windows 10/11 built-in OpenSSH
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'OpenSSH', 'ssh.exe'),
    // Git for Windows
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'usr', 'bin', 'ssh.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Git', 'usr', 'bin', 'ssh.exe'),
    // Standalone OpenSSH
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'OpenSSH', 'ssh.exe'),
    // User's local bin
    path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Git', 'usr', 'bin', 'ssh.exe'),
  ];
  
  for (const sshPath of possiblePaths) {
    if (fs.existsSync(sshPath)) {
      console.log('[NativeSSH] Found SSH at:', sshPath);
      return sshPath;
    }
  }
  
  // Try to find via 'where' command
  try {
    const result = execSync('where ssh.exe', { encoding: 'utf8', timeout: 5000 });
    const firstPath = result.split('\n')[0].trim();
    if (firstPath && fs.existsSync(firstPath)) {
      console.log('[NativeSSH] Found SSH via where:', firstPath);
      return firstPath;
    }
  } catch {
    // 'where' failed, ssh not in PATH
  }
  
  // Fallback - let node-pty try to find it
  console.warn('[NativeSSH] SSH not found in common paths, trying ssh.exe');
  return 'ssh.exe';
}

// Cache SSH path
let cachedSSHPath: string | null = null;

function getSSHPath(): string {
  if (!cachedSSHPath) {
    cachedSSHPath = findSSHExecutable();
  }
  return cachedSSHPath;
}

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  authType?: 'password' | 'key';
  useLegacyAlgorithms?: boolean;  // Enable legacy SSH algorithms for old servers (CentOS 6, RHEL 6)
  envVars?: { [key: string]: string };  // Environment variables to set on remote shell (like ssh -o SetEnv)
}

interface PTYSession {
  pty: pty.IPty;
  emitter: EventEmitter;
  config: SSHConfig;
  keyFile?: string;  // Temp key file path
}

export class NativeSSHManager {
  private sessions: Map<string, PTYSession> = new Map();

  /**
   * Connect and create shell using native SSH command
   * This triggers PAM properly so MOTD displays automatically
   */
  async connectAndCreateShell(
    config: SSHConfig,
    cols: number = 80,
    rows: number = 24
  ): Promise<{ connectionId: string; emitter: EventEmitter }> {
    const connectionId = `${config.username}@${config.host}:${config.port}`;
    
    console.log('[NativeSSH] Connecting:', connectionId);

    // Check if already connected
    if (this.sessions.has(connectionId)) {
      const session = this.sessions.get(connectionId)!;
      return { connectionId, emitter: session.emitter };
    }

    const emitter = new EventEmitter();
    let keyFilePath: string | undefined;

    // Build SSH command - only add legacy algorithms if explicitly requested
    const sshArgs: string[] = [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'LogLevel=ERROR',
    ];

    // Add legacy algorithm support only when explicitly enabled (for old servers like CentOS 6, RHEL 6)
    if (config.useLegacyAlgorithms) {
      console.log('[NativeSSH] Using legacy algorithms for old server compatibility');
      sshArgs.push(
        '-o', 'KexAlgorithms=+diffie-hellman-group1-sha1,diffie-hellman-group14-sha1,diffie-hellman-group-exchange-sha1',
        '-o', 'HostKeyAlgorithms=+ssh-rsa,ssh-dss',
        '-o', 'Ciphers=+aes128-cbc,aes192-cbc,aes256-cbc,3des-cbc',
        '-o', 'MACs=+hmac-sha1,hmac-md5',
        '-o', 'PubkeyAcceptedAlgorithms=+ssh-rsa,ssh-dss'
      );
    }

    // Add environment variables via SetEnv option
    // Note: Requires server to have AcceptEnv configured, otherwise will be silently ignored
    // We'll also inject them via export commands after shell is ready as fallback
    if (config.envVars && Object.keys(config.envVars).length > 0) {
      for (const [key, value] of Object.entries(config.envVars)) {
        // SetEnv uses space-separated key=value pairs in newer OpenSSH
        sshArgs.push('-o', `SetEnv=${key}=${value}`);
      }
      console.log('[NativeSSH] Setting env vars:', Object.keys(config.envVars).join(', '));
    }

    // Add port and host
    sshArgs.push(
      '-p', config.port.toString(),
      `${config.username}@${config.host}`
    );

    // If using private key
    if (config.authType === 'key' && config.privateKey) {
      // Write key to temp file (SSH requires file path)
      const tempDir = os.tmpdir();
      keyFilePath = path.join(tempDir, `ssh_key_${Date.now()}`);
      
      // Ensure key has correct format:
      // 1. Normalize line endings to LF (Unix style)
      // 2. Ensure key ends with newline
      let keyContent = config.privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      if (!keyContent.endsWith('\n')) {
        keyContent += '\n';
      }
      
      fs.writeFileSync(keyFilePath, keyContent, { mode: 0o600 });
      sshArgs.unshift('-i', keyFilePath);
      console.log('[NativeSSH] Using private key (normalized)');
    }

    console.log('[NativeSSH] Spawning:', 'ssh', sshArgs.join(' '));

    // Get SSH executable path (important for Windows)
    const sshPath = getSSHPath();
    console.log('[NativeSSH] Using SSH path:', sshPath);

    // Spawn SSH process with PTY
    const ptyProcess = pty.spawn(sshPath, sshArgs, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.env.HOME,
      env: process.env as { [key: string]: string }
    });

    // Track password/passphrase state
    let passwordSent = false;
    let passphraseSent = false;
    let dataBuffer = '';
    let lastBufferSize = 0;
    let hideNextOutput = false;  // Flag to hide password prompt output
    let envVarsInjected = false;  // Track if we've injected env vars

    // Forward data from PTY to emitter
    ptyProcess.onData((data: string) => {
      dataBuffer += data;
      
      // Keep buffer manageable (last 500 chars)
      if (dataBuffer.length > 500) {
        dataBuffer = dataBuffer.slice(-500);
      }
      
      // Only check for prompts on new data
      const newData = dataBuffer.slice(lastBufferSize);
      lastBufferSize = dataBuffer.length;
      const lowerData = data.toLowerCase();
      const lowerBuffer = dataBuffer.toLowerCase();

      // Inject environment variables after successful login (as fallback for servers without AcceptEnv)
      // Detect shell prompt indicators
      if (!envVarsInjected && config.envVars && Object.keys(config.envVars).length > 0) {
        const hasShellPrompt = 
          data.includes('$') || 
          data.includes('#') || 
          data.includes('%') ||
          data.includes('Last login') ||
          data.includes('Welcome') ||
          data.includes('~]');
        
        if (hasShellPrompt && (passwordSent || passphraseSent || config.authType !== 'password')) {
          envVarsInjected = true;
          
          // Build export commands
          const exportCommands = Object.entries(config.envVars)
            .map(([key, value]) => {
              // Escape single quotes in values
              const escapedValue = value.replace(/'/g, "'\\''");
              return `export ${key}='${escapedValue}'`;
            })
            .join(' && ');
          
          // Inject after short delay to ensure shell is ready
          setTimeout(() => {
            console.log('[NativeSSH] Injecting environment variables...');
            ptyProcess.write(`${exportCommands} && clear\r`);
          }, 100);
        }
      }
      
      // Handle passphrase for encrypted key (check new data only)
      if (config.authType === 'key' && config.passphrase && !passphraseSent) {
        const lowerNewData = newData.toLowerCase();
        // Match common passphrase prompts
        if (lowerNewData.includes('enter passphrase') || 
            lowerNewData.includes('passphrase for') ||
            (lowerNewData.includes('passphrase') && lowerNewData.includes(':'))) {
          console.log('[NativeSSH] Passphrase prompt detected, sending passphrase');
          passphraseSent = true;
          
          // Send passphrase after small delay
          setTimeout(() => {
            ptyProcess.write(config.passphrase + '\r');
          }, 50);
          
          // Continue to emit the prompt data so user sees it
          emitter.emit('data', data);
          return;
        }
      }
      
      // Handle password authentication (only for password auth type)
      if (config.authType === 'password' && config.password && !passwordSent) {
        // Check for password prompt in current chunk OR buffer (Windows may split prompt)
        const hasPasswordPrompt = 
          lowerData.includes('password:') || 
          lowerData.includes("'s password:") ||
          lowerData.includes('password for') ||
          lowerBuffer.includes("'s password:") ||
          // Also check for partial patterns (Windows terminal may send char by char)
          (lowerBuffer.endsWith('password:') || lowerBuffer.endsWith("'s password:"));
        
        if (hasPasswordPrompt) {
          console.log('[NativeSSH] Password prompt detected, sending password');
          passwordSent = true;
          hideNextOutput = true;  // Hide any echoed output
          
          // Send password after small delay
          setTimeout(() => {
            ptyProcess.write(config.password + '\r');
          }, 50);
          
          // Stop hiding after password is processed
          setTimeout(() => {
            hideNextOutput = false;
          }, 500);
          
          // Don't emit password prompt to keep it hidden
          return;
        }
      }
      
      // Skip output if hiding (during password entry)
      if (hideNextOutput) {
        // But allow through if it looks like we're past the password prompt
        if (data.includes('Last login') || data.includes('Welcome') || 
            data.includes('$') || data.includes('#') || data.includes('~')) {
          hideNextOutput = false;
        } else {
          return;  // Hide this output
        }
      }
      
      // Emit data to terminal
      emitter.emit('data', data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log('[NativeSSH] Process exited:', exitCode, signal);
      emitter.emit('close');
      
      // Cleanup temp key file
      if (keyFilePath && fs.existsSync(keyFilePath)) {
        fs.unlinkSync(keyFilePath);
        console.log('[NativeSSH] Cleaned up temp key file');
      }
      
      this.sessions.delete(connectionId);
    });

    // Store session
    this.sessions.set(connectionId, {
      pty: ptyProcess,
      emitter,
      config,
      keyFile: keyFilePath
    });

    return { connectionId, emitter };
  }

  /**
   * Write data to shell
   */
  writeToShell(connectionId: string, data: string): void {
    const session = this.sessions.get(connectionId);
    if (session) {
      session.pty.write(data);
    }
  }

  /**
   * Resize shell
   */
  resizeShell(connectionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(connectionId);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  /**
   * Disconnect and close shell
   */
  disconnect(connectionId: string): void {
    const session = this.sessions.get(connectionId);
    if (session) {
      console.log('[NativeSSH] Disconnecting:', connectionId);
      try {
        // On Windows, use taskkill to ensure process tree is killed
        if (process.platform === 'win32') {
          const pid = session.pty.pid;
          if (pid) {
            try {
              // /T = kill entire process tree, /F = force
              execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
              console.log('[NativeSSH] Killed process tree via taskkill:', pid);
            } catch {
              // Fallback to pty.kill
              session.pty.kill();
            }
          }
        } else {
          // Unix: Force kill with SIGKILL for faster termination
          session.pty.kill('SIGKILL');
        }
      } catch {
        // Ignore errors during kill
      }
      session.emitter.removeAllListeners();
      
      // Cleanup temp key file
      if (session.keyFile && fs.existsSync(session.keyFile)) {
        try {
          fs.unlinkSync(session.keyFile);
          console.log('[NativeSSH] Cleaned up temp key file');
        } catch {
          // Ignore cleanup errors
        }
      }
      
      this.sessions.delete(connectionId);
    }
  }

  /**
   * Check if connected
   */
  isConnected(connectionId: string): boolean {
    return this.sessions.has(connectionId);
  }

  /**
   * Get config for SFTP (reuse credentials)
   */
  getConfig(connectionId: string): SSHConfig | undefined {
    return this.sessions.get(connectionId)?.config;
  }

  /**
   * Create a local terminal shell (no SSH)
   */
  createLocalShell(
    cols: number = 80,
    rows: number = 24
  ): { connectionId: string; emitter: EventEmitter } {
    const connectionId = `local-${Date.now()}`;
    
    console.log('[NativeSSH] Creating local shell:', connectionId);

    const emitter = new EventEmitter();

    // Determine shell based on OS
    const isWindows = process.platform === 'win32';
    const shell = isWindows 
      ? process.env.COMSPEC || 'cmd.exe'
      : process.env.SHELL || '/bin/bash';

    // Spawn local shell process with PTY
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.env.HOME || process.cwd(),
      env: process.env as { [key: string]: string }
    });

    // Forward data from PTY to emitter
    ptyProcess.onData((data: string) => {
      emitter.emit('data', data);
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log('[NativeSSH] Local shell exited:', connectionId, 'code:', exitCode);
      emitter.emit('close', { exitCode, signal });
      this.sessions.delete(connectionId);
    });

    // Store session (reuse session structure with dummy config)
    this.sessions.set(connectionId, {
      pty: ptyProcess,
      emitter,
      config: { host: 'localhost', port: 0, username: os.userInfo().username }
    });

    return { connectionId, emitter };
  }

  /**
   * Get the number of active connections
   */
  getActiveCount(): number {
    return this.sessions.size;
  }

  /**
   * Close all connections - called when app is closing
   */
  closeAll(): void {
    console.log(`[NativeSSH] Closing all ${this.sessions.size} sessions...`);
    for (const [id] of this.sessions) {
      this.disconnect(id);
    }
    console.log('[NativeSSH] All sessions closed');
  }
}
