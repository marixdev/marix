import { Client, ConnectConfig, ClientChannel, Algorithms } from 'ssh2';
import { EventEmitter } from 'events';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: Buffer | string;
  passphrase?: string;
  envVars?: { [key: string]: string };  // Environment variables to set on remote shell
}

// Legacy algorithms for old servers (CentOS 6, RHEL 6, etc.)
// OpenSSH 5.3 on CentOS 6 only supports these older algorithms
const LEGACY_ALGORITHMS: Algorithms = {
  kex: [
    // Modern (try first)
    'curve25519-sha256',
    'curve25519-sha256@libssh.org',
    'ecdh-sha2-nistp256',
    'ecdh-sha2-nistp384',
    'ecdh-sha2-nistp521',
    // Legacy (for old servers)
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group-exchange-sha1',
    'diffie-hellman-group14-sha1',
    'diffie-hellman-group1-sha1',  // CentOS 6
  ],
  cipher: [
    // Modern
    'aes128-gcm@openssh.com',
    'aes256-gcm@openssh.com',
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    // Legacy
    'aes128-cbc',
    'aes192-cbc',
    'aes256-cbc',
    '3des-cbc',  // CentOS 6
  ],
  serverHostKey: [
    // Modern
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'ecdsa-sha2-nistp521',
    'rsa-sha2-512',
    'rsa-sha2-256',
    // Legacy
    'ssh-rsa',  // CentOS 6
    'ssh-dss',  // Very old servers
  ],
  hmac: [
    // Modern
    'hmac-sha2-256-etm@openssh.com',
    'hmac-sha2-512-etm@openssh.com',
    'hmac-sha2-256',
    'hmac-sha2-512',
    // Legacy
    'hmac-sha1',  // CentOS 6
    'hmac-md5',   // Very old servers
  ],
};

interface ConnectionData {
  client: Client;
  greeting?: string;
  banner?: string;
  envVars?: { [key: string]: string };  // Environment variables to set on shell creation
}

export class SSHConnectionManager {
  private connections: Map<string, ConnectionData> = new Map();
  private connectionConfigs: Map<string, SSHConfig> = new Map();
  private shells: Map<string, ClientChannel> = new Map();
  private shellEmitters: Map<string, EventEmitter> = new Map();

  async connect(config: SSHConfig): Promise<string> {
    const connectionId = `${config.username}@${config.host}:${config.port}`;
    
    console.log('[SSHConnectionManager] Connecting:', connectionId);
    
    return new Promise((resolve, reject) => {
      const client = new Client();
      
      // Store greeting and banner from client events
      let greeting = '';
      let banner = '';
      
      const connectConfig: ConnectConfig = {
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        // Normalize private key: ensure LF line endings and trailing newline
        privateKey: config.privateKey 
          ? (typeof config.privateKey === 'string' 
              ? config.privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n') + (config.privateKey.endsWith('\n') ? '' : '\n')
              : config.privateKey)
          : undefined,
        passphrase: config.passphrase,
        readyTimeout: 30000,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3,
        // Enable legacy algorithms for old servers (CentOS 6, RHEL 6, etc.)
        algorithms: LEGACY_ALGORITHMS,
      };

      // Capture greeting (server identification)
      client.on('greeting', (message: string) => {
        console.log('[SSH] Greeting received:', message.substring(0, 100));
        greeting = message;
      });

      // Capture banner (pre-auth message)
      client.on('banner', (message: string) => {
        console.log('[SSH] Banner received:', message.substring(0, 100));
        banner = message;
      });

      client.on('ready', () => {
        console.log('[SSHConnectionManager] Connected successfully:', connectionId);
        this.connections.set(connectionId, { client, greeting, banner, envVars: config.envVars });
        this.connectionConfigs.set(connectionId, config);
        resolve(connectionId);
      });

      client.on('error', (err) => {
        console.error('[SSHConnectionManager] Connection error:', err.message);
        reject(new Error(err.message || 'SSH connection failed'));
      });

      client.on('close', () => {
        console.log('[SSHConnectionManager] Connection closed:', connectionId);
      });

      try {
        client.connect(connectConfig);
      } catch (err: any) {
        console.error('[SSHConnectionManager] Connect exception:', err.message);
        reject(err);
      }
    });
  }

  async disconnect(connectionId: string): Promise<void> {
    const shell = this.shells.get(connectionId);
    if (shell) {
      try {
        shell.end();
      } catch {
        // Ignore errors during close
      }
      this.shells.delete(connectionId);
    }
    
    const emitter = this.shellEmitters.get(connectionId);
    if (emitter) {
      emitter.removeAllListeners();
      this.shellEmitters.delete(connectionId);
    }
    
    const connData = this.connections.get(connectionId);
    if (connData) {
      try {
        // Use destroy() for faster close, end() waits for graceful shutdown
        connData.client.destroy();
      } catch {
        // Ignore errors during close
      }
      this.connections.delete(connectionId);
      this.connectionConfigs.delete(connectionId);
    }
  }

  async createShell(connectionId: string, cols: number = 80, rows: number = 24): Promise<EventEmitter> {
    const connData = this.connections.get(connectionId);
    if (!connData) {
      throw new Error('Connection not found');
    }

    // Return existing shell if already created
    const existingEmitter = this.shellEmitters.get(connectionId);
    if (existingEmitter) {
      return existingEmitter;
    }

    const { client, greeting, banner, envVars } = connData;

    return new Promise((resolve, reject) => {
      // MUST use shell() with PTY - NOT exec()
      console.log('[SSH] Requesting shell with PTY...');

      // Pass env vars via the SSH protocol (equivalent to ssh -o "SetEnv KEY=val")
      // This sets them before the shell starts, so .bashrc/.profile will see them
      const shellOptions: any = {};
      if (envVars && Object.keys(envVars).length > 0) {
        shellOptions.env = envVars;
        console.log('[SSH] Passing environment variables via SSH protocol:', Object.keys(envVars).join(', '));
      }
      
      client.shell({
        term: 'xterm-256color',
        cols,
        rows,
        width: cols * 9,
        height: rows * 17
      }, shellOptions, (err, stream) => {
        if (err) {
          console.log('[SSH] Shell error:', err.message);
          reject(err);
          return;
        }

        console.log('[SSH] Shell stream created');
        
        const emitter = new EventEmitter();
        this.shells.set(connectionId, stream);
        this.shellEmitters.set(connectionId, emitter);

        // Buffer ALL data until renderer listener is ready
        let dataBuffer: string[] = [];
        let hasListener = false;

        // Pre-fill buffer with greeting and banner if available
        if (greeting) {
          console.log('[SSH] Adding greeting to buffer:', greeting.length, 'bytes');
          dataBuffer.push(greeting);
        }
        if (banner) {
          console.log('[SSH] Adding banner to buffer:', banner.length, 'bytes');
          dataBuffer.push(banner);
        }

        const flushBuffer = () => {
          if (dataBuffer.length === 0) {
            console.log('[SSH] Flush: buffer empty');
            return;
          }
          
          const combined = dataBuffer.join('');
          console.log('[SSH] Flushing:', combined.length, 'bytes');
          dataBuffer = [];
          
          emitter.emit('data', combined);
        };

        // Setup stream listener IMMEDIATELY
        stream.on('data', (data: Buffer) => {
          const str = data.toString('utf-8');
          console.log('[SSH] Stream data:', data.length, 'bytes, hasListener:', hasListener);
          
          if (hasListener) {
            emitter.emit('data', str);
          } else {
            dataBuffer.push(str);
          }
        });

        stream.stderr.on('data', (data: Buffer) => {
          console.log('[SSH] Stderr:', data.length, 'bytes');
          if (hasListener) {
            emitter.emit('data', data.toString('utf-8'));
          } else {
            dataBuffer.push(data.toString('utf-8'));
          }
        });

        stream.on('close', () => {
          console.log('[SSH] Stream closed');
          emitter.emit('close');
          this.shells.delete(connectionId);
          this.shellEmitters.delete(connectionId);
        });

        // Override 'on' to detect when renderer attaches listener
        const originalOn = emitter.on.bind(emitter);
        emitter.on = function(event: string, listener: (...args: any[]) => void) {
          const result = originalOn(event, listener);
          
          if (event === 'data' && !hasListener) {
            hasListener = true;
            console.log('[SSH] Listener attached! Buffered chunks:', dataBuffer.length);
            
            // Fetch MOTD first, then flush everything in correct order
            client.exec('cat /run/motd.dynamic 2>/dev/null || cat /etc/motd 2>/dev/null', (err, motdStream) => {
              if (err) {
                flushBuffer();
                return;
              }
              
              let motd = '';
              motdStream.on('data', (data: Buffer) => {
                motd += data.toString('utf-8');
              });
              
              motdStream.on('close', () => {
                if (motd.trim()) {
                  console.log('[SSH] MOTD fetched:', motd.length, 'bytes');
                  // Emit MOTD first (with newline)
                  emitter.emit('data', '\r\n' + motd + '\r\n');
                }
                // Flush buffered shell data (prompt)
                flushBuffer();
              });
            });
          }
          
          return result;
        };

        // Resolve immediately
        console.log('[SSH] Shell ready, resolving...');
        resolve(emitter);
      });
    });
  }

  writeToShell(connectionId: string, data: string): void {
    const shell = this.shells.get(connectionId);
    if (!shell) {
      throw new Error('Shell not found');
    }
    shell.write(data);
  }

  resizeShell(connectionId: string, cols: number, rows: number): void {
    const shell = this.shells.get(connectionId);
    if (shell) {
      shell.setWindow(rows, cols, 0, 0);
    }
  }

  getConnection(connectionId: string): Client | undefined {
    return this.connections.get(connectionId)?.client;
  }

  async executeCommand(connectionId: string, command: string): Promise<string> {
    const connData = this.connections.get(connectionId);
    if (!connData) {
      throw new Error('Connection not found');
    }

    return new Promise((resolve, reject) => {
      connData.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        let errorOutput = '';

        stream.on('close', (code: number, signal: string) => {
          if (code !== 0) {
            reject(new Error(errorOutput || `Command failed with code ${code}`));
          } else {
            resolve(output);
          }
        });

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });
      });
    });
  }

  /**
   * Execute command with streaming output via callback
   */
  async executeCommandStream(
    connectionId: string, 
    command: string,
    onData: (data: string, isError: boolean) => void
  ): Promise<{ success: boolean; exitCode: number }> {
    const connData = this.connections.get(connectionId);
    if (!connData) {
      throw new Error('Connection not found');
    }

    return new Promise((resolve, reject) => {
      connData.client.exec(command, { pty: true }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('close', (code: number) => {
          resolve({ success: code === 0, exitCode: code });
        });

        stream.on('data', (data: Buffer) => {
          onData(data.toString(), false);
        });

        stream.stderr.on('data', (data: Buffer) => {
          onData(data.toString(), true);
        });
      });
    });
  }

  getAllConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  isConnected(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  /**
   * Get the number of active connections
   */
  getActiveCount(): number {
    return this.connections.size;
  }

  /**
   * Close all connections - called when app is closing
   */
  closeAll(): void {
    console.log(`[SSHConnectionManager] Closing all ${this.connections.size} connections...`);
    for (const [id] of this.connections) {
      this.disconnect(id);
    }
    console.log('[SSHConnectionManager] All connections closed');
  }
}
