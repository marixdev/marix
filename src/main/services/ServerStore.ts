import Store from 'electron-store';

export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  color?: string;
  tags?: string[];
  createdAt: number;
  lastConnected?: number;
  knockEnabled?: boolean;
  knockSequence?: number[];
}

interface StoreSchema {
  servers: ServerConfig[];
  tagColors: { [tagName: string]: string };
}

export class ServerStore {
  private store: any;

  constructor() {
    this.store = new Store({
      defaults: {
        servers: [],
        tagColors: {},
      },
    });
  }

  getAllServers(): ServerConfig[] {
    return this.store.get('servers', []);
  }

  getServer(id: string): ServerConfig | undefined {
    const servers = this.getAllServers();
    return servers.find(server => server.id === id);
  }

  addServer(server: Omit<ServerConfig, 'id' | 'createdAt'>): ServerConfig {
    const servers = this.getAllServers();
    const newServer: ServerConfig = {
      ...server,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    servers.push(newServer);
    this.store.set('servers', servers);
    return newServer;
  }

  updateServer(id: string, updates: Partial<ServerConfig>): boolean {
    const servers = this.getAllServers();
    const index = servers.findIndex(server => server.id === id);
    
    if (index === -1) {
      return false;
    }

    servers[index] = { ...servers[index], ...updates };
    this.store.set('servers', servers);
    return true;
  }

  deleteServer(id: string): boolean {
    const servers = this.getAllServers();
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
    const servers = this.getAllServers();
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

  // Set all servers (for backup restore)
  setServers(servers: ServerConfig[]): void {
    this.store.set('servers', servers);
  }

  // Set all tag colors (for backup restore)
  setTagColors(tagColors: { [tagName: string]: string }): void {
    this.store.set('tagColors', tagColors);
  }
}
