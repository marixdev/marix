import Store from 'electron-store';
import { SecureStorage } from './SecureStorage';

export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  privateKey?: string;      // Inline private key content
  passphrase?: string;      // SSH key passphrase
  color?: string;
  tags?: string[];
  createdAt: number;
  lastConnected?: number;
  knockEnabled?: boolean;
  knockSequence?: number[];
  envVars?: { [key: string]: string };  // Environment variables for SSH
  defaultRemotePath?: string;  // Default remote path for SFTP
  defaultLocalPath?: string;   // Default local path for SFTP
}

// Fields that contain sensitive data and should be encrypted
const SENSITIVE_FIELDS: (keyof ServerConfig)[] = ['password', 'privateKey', 'passphrase'];

interface StoreSchema {
  servers: ServerConfig[];
  tagColors: { [tagName: string]: string };
  encryptionMigrated?: boolean; // Track if we've migrated plaintext to encrypted
}

export class ServerStore {
  private store: any;

  constructor() {
    this.store = new Store({
      defaults: {
        servers: [],
        tagColors: {},
        encryptionMigrated: false,
      },
    });
    
    // Migrate existing plaintext passwords to encrypted on first run
    this.migrateToEncrypted();
  }

  /**
   * Migrate existing plaintext sensitive data to encrypted format
   * Only runs once per installation
   */
  private migrateToEncrypted(): void {
    if (this.store.get('encryptionMigrated', false)) {
      return; // Already migrated
    }

    if (!SecureStorage.isAvailable()) {
      console.warn('[ServerStore] Encryption not available, skipping migration');
      return;
    }

    console.log('[ServerStore] Migrating sensitive data to encrypted format...');
    
    const servers = this.store.get('servers', []) as ServerConfig[];
    let migratedCount = 0;

    const migratedServers = servers.map(server => {
      let needsMigration = false;
      
      // Check if any sensitive field needs encryption
      for (const field of SENSITIVE_FIELDS) {
        const value = server[field];
        if (typeof value === 'string' && value && !SecureStorage.isEncrypted(value)) {
          needsMigration = true;
          break;
        }
      }

      if (needsMigration) {
        migratedCount++;
        return SecureStorage.encryptFields(server, SENSITIVE_FIELDS);
      }
      return server;
    });

    if (migratedCount > 0) {
      this.store.set('servers', migratedServers);
      console.log(`[ServerStore] Migrated ${migratedCount} server(s) to encrypted storage`);
    }

    this.store.set('encryptionMigrated', true);
  }

  /**
   * Get all servers with sensitive data decrypted for use
   */
  getAllServers(): ServerConfig[] {
    const servers = this.store.get('servers', []) as ServerConfig[];
    // Decrypt sensitive fields before returning
    return servers.map(server => SecureStorage.decryptFields(server, SENSITIVE_FIELDS));
  }

  /**
   * Get raw servers without decryption (for internal use only)
   */
  private getRawServers(): ServerConfig[] {
    return this.store.get('servers', []);
  }

  getServer(id: string): ServerConfig | undefined {
    const servers = this.getAllServers(); // Already decrypted
    return servers.find(server => server.id === id);
  }

  addServer(server: Omit<ServerConfig, 'id' | 'createdAt'> | ServerConfig): ServerConfig {
    const servers = this.getRawServers(); // Get raw (encrypted) servers
    
    // If server already has id and createdAt (e.g., from LAN import), use them
    const newServer: ServerConfig = {
      ...(server as ServerConfig),
      id: (server as ServerConfig).id || Date.now().toString(),
      createdAt: (server as ServerConfig).createdAt || Date.now(),
    };
    
    // Encrypt sensitive fields before storing
    const encryptedServer = SecureStorage.encryptFields(newServer, SENSITIVE_FIELDS);
    
    servers.push(encryptedServer);
    this.store.set('servers', servers);
    
    // Return decrypted version
    return newServer;
  }

  updateServer(id: string, updates: Partial<ServerConfig>): boolean {
    const servers = this.getRawServers(); // Get raw (encrypted) servers
    const index = servers.findIndex(server => server.id === id);
    
    if (index === -1) {
      return false;
    }

    // Encrypt any sensitive fields in the updates
    const encryptedUpdates = SecureStorage.encryptFields(updates as ServerConfig, SENSITIVE_FIELDS);
    
    servers[index] = { ...servers[index], ...encryptedUpdates };
    this.store.set('servers', servers);
    return true;
  }

  deleteServer(id: string): boolean {
    const servers = this.getRawServers();
    const filtered = servers.filter(server => server.id !== id);
    
    if (filtered.length === servers.length) {
      return false;
    }

    this.store.set('servers', filtered);
    return true;
  }

  updateLastConnected(id: string): void {
    this.updateServer(id, { lastConnected: Date.now() });
  }

  // Tag colors management
  getTagColors(): { [tagName: string]: string } {
    return this.store.get('tagColors', {});
  }

  setTagColor(tagName: string, color: string): void {
    const tagColors = this.getTagColors();
    tagColors[tagName] = color;
    this.store.set('tagColors', tagColors);
  }

  deleteTagColor(tagName: string): void {
    const tagColors = this.getTagColors();
    delete tagColors[tagName];
    this.store.set('tagColors', tagColors);
  }

  // Delete tag from all servers
  deleteTagFromAllServers(tagName: string): void {
    const servers = this.getRawServers();
    const updatedServers = servers.map(server => {
      if (server.tags?.includes(tagName)) {
        return {
          ...server,
          tags: server.tags.filter(t => t !== tagName)
        };
      }
      return server;
    });
    this.store.set('servers', updatedServers);
    // Also delete the color
    this.deleteTagColor(tagName);
  }

  /**
   * Set all servers (for backup restore)
   * Input should be decrypted - will be encrypted before storing
   */
  setServers(servers: ServerConfig[]): void {
    // Encrypt sensitive fields before storing
    const encryptedServers = servers.map(server => 
      SecureStorage.encryptFields(server, SENSITIVE_FIELDS)
    );
    this.store.set('servers', encryptedServers);
  }

  /**
   * Reorder servers - update the order in storage
   * Servers come already in the new order, we just need to save them
   */
  reorderServers(servers: ServerConfig[]): void {
    // Get raw servers to preserve encrypted data
    const rawServers = this.getRawServers();
    
    // Create a map for quick lookup
    const serverMap = new Map(rawServers.map(s => [s.id, s]));
    
    // Reorder based on incoming order, using raw (encrypted) data
    const reorderedServers = servers
      .map(s => serverMap.get(s.id))
      .filter((s): s is ServerConfig => s !== undefined);
    
    this.store.set('servers', reorderedServers);
  }

  // Set all tag colors (for backup restore)
  setTagColors(tagColors: { [tagName: string]: string }): void {
    this.store.set('tagColors', tagColors);
  }
}
