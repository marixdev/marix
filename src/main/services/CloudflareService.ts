import Cloudflare from 'cloudflare';
import Store from 'electron-store';
import { SecureStorage } from './SecureStorage';

const store = new Store() as any;

interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  development_mode: number;
  name_servers: string[];
  original_name_servers?: string[];
  modified_on: string;
  created_on: string;
}

interface CloudflareDNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  meta: {
    auto_added: boolean;
    managed_by_apps: boolean;
    managed_by_argo_tunnel: boolean;
  };
  comment?: string;
  tags: string[];
  created_on: string;
  modified_on: string;
}

export class CloudflareService {
  private client: Cloudflare | null = null;

  /**
   * Get stored API token (decrypted)
   */
  getToken(): string | null {
    const encrypted = store.get('cloudflare.token', null) as string | null;
    if (!encrypted) return null;
    return SecureStorage.decrypt(encrypted);
  }

  /**
   * Save API token (encrypted with OS keychain)
   */
  setToken(token: string): void {
    console.log('[CloudflareService] Setting new token (encrypted)');
    const encrypted = SecureStorage.encrypt(token);
    store.set('cloudflare.token', encrypted);
    this.client = null; // Reset client to use new token
  }

  /**
   * Remove API token
   */
  removeToken(): void {
    console.log('[CloudflareService] Removing token');
    store.delete('cloudflare.token');
    this.client = null;
  }

  /**
   * Check if token is configured
   */
  hasToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Get Cloudflare client instance
   */
  private getClient(): Cloudflare {
    const token = this.getToken();
    console.log('[CloudflareService] getClient - token exists:', !!token);
    if (!token) {
      throw new Error('Cloudflare API token not configured');
    }
    // Always create a new client to ensure fresh token is used
    this.client = new Cloudflare({
      apiToken: token,
    });
    return this.client;
  }

  /**
   * Verify API token is valid
   */
  async verifyToken(): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      const client = this.getClient();
      const result = await client.user.tokens.verify();
      return { 
        success: result.status === 'active',
        email: 'Token verified'
      };
    } catch (error: any) {
      console.error('[CloudflareService] Token verification failed:', error);
      return { success: false, error: error.message || 'Invalid token' };
    }
  }

  /**
   * List all zones (domains)
   */
  async listZones(): Promise<{ success: boolean; zones?: CloudflareZone[]; error?: string }> {
    try {
      const client = this.getClient();
      const zones: CloudflareZone[] = [];
      
      for await (const zone of client.zones.list()) {
        const z = zone as any;
        zones.push({
          id: z.id,
          name: z.name,
          status: z.status || 'unknown',
          paused: z.paused || false,
          type: z.type || 'full',
          development_mode: z.development_mode || 0,
          name_servers: z.name_servers || [],
          original_name_servers: z.original_name_servers || undefined,
          modified_on: z.modified_on,
          created_on: z.created_on,
        });
      }
      
      return { success: true, zones };
    } catch (error: any) {
      console.error('[CloudflareService] Failed to list zones:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List DNS records for a zone
   */
  async listDNSRecords(zoneId: string): Promise<{ success: boolean; records?: CloudflareDNSRecord[]; error?: string }> {
    try {
      const client = this.getClient();
      const records: CloudflareDNSRecord[] = [];
      
      for await (const record of client.dns.records.list({ zone_id: zoneId })) {
        const r = record as any;
        records.push({
          id: r.id,
          zone_id: r.zone_id || zoneId,
          zone_name: r.zone_name || '',
          name: r.name,
          type: r.type,
          content: r.content || '',
          proxiable: r.proxiable,
          proxied: r.proxied || false,
          ttl: r.ttl,
          locked: r.locked || false,
          meta: r.meta || { auto_added: false, managed_by_apps: false, managed_by_argo_tunnel: false },
          comment: r.comment || undefined,
          tags: r.tags || [],
          created_on: r.created_on,
          modified_on: r.modified_on,
        });
      }
      
      return { success: true, records };
    } catch (error: any) {
      console.error('[CloudflareService] Failed to list DNS records:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a DNS record
   */
  async createDNSRecord(
    zoneId: string,
    type: string,
    name: string,
    content: string,
    ttl: number = 1,
    proxied: boolean = false,
    comment?: string,
    priority?: number,
    data?: { service?: string; proto?: string; name?: string; priority?: number; weight?: number; port?: number; target?: string }
  ): Promise<{ success: boolean; record?: CloudflareDNSRecord; error?: string }> {
    try {
      const client = this.getClient();
      
      const recordData: any = {
        zone_id: zoneId,
        type: type as any,
        name,
        content,
        ttl,
        comment,
      };
      
      // Only add proxied for proxyable types
      if (['A', 'AAAA', 'CNAME'].includes(type)) {
        recordData.proxied = proxied;
      }
      
      // Add priority for MX records
      if (type === 'MX' && priority !== undefined) {
        recordData.priority = priority;
      }
      
      // Add SRV data
      if (type === 'SRV' && data) {
        recordData.data = {
          service: data.service,
          proto: data.proto,
          name: data.name,
          priority: data.priority,
          weight: data.weight,
          port: data.port,
          target: data.target,
        };
      }
      
      const result = await client.dns.records.create(recordData);
      
      const r = result as any;
      return { 
        success: true, 
        record: {
          id: r.id,
          zone_id: r.zone_id || zoneId,
          zone_name: r.zone_name || '',
          name: r.name,
          type: r.type,
          content: r.content || '',
          proxiable: r.proxiable,
          proxied: r.proxied || false,
          ttl: r.ttl,
          locked: r.locked || false,
          meta: r.meta || { auto_added: false, managed_by_apps: false, managed_by_argo_tunnel: false },
          comment: r.comment || undefined,
          tags: r.tags || [],
          created_on: r.created_on,
          modified_on: r.modified_on,
        }
      };
    } catch (error: any) {
      console.error('[CloudflareService] Failed to create DNS record:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a DNS record
   */
  async updateDNSRecord(
    zoneId: string,
    recordId: string,
    type: string,
    name: string,
    content: string,
    ttl: number = 1,
    proxied: boolean = false,
    comment?: string,
    priority?: number,
    data?: { service?: string; proto?: string; name?: string; priority?: number; weight?: number; port?: number; target?: string }
  ): Promise<{ success: boolean; record?: CloudflareDNSRecord; error?: string }> {
    try {
      const client = this.getClient();
      
      const recordData: any = {
        zone_id: zoneId,
        type: type as any,
        name,
        content,
        ttl,
        comment,
      };
      
      // Only add proxied for proxyable types
      if (['A', 'AAAA', 'CNAME'].includes(type)) {
        recordData.proxied = proxied;
      }
      
      // Add priority for MX records
      if (type === 'MX' && priority !== undefined) {
        recordData.priority = priority;
      }
      
      // Add SRV data
      if (type === 'SRV' && data) {
        recordData.data = {
          service: data.service,
          proto: data.proto,
          name: data.name,
          priority: data.priority,
          weight: data.weight,
          port: data.port,
          target: data.target,
        };
      }
      
      const result = await client.dns.records.update(recordId, recordData);
      
      const r = result as any;
      return { 
        success: true, 
        record: {
          id: r.id,
          zone_id: r.zone_id || zoneId,
          zone_name: r.zone_name || '',
          name: r.name,
          type: r.type,
          content: r.content || '',
          proxiable: r.proxiable,
          proxied: r.proxied || false,
          ttl: r.ttl,
          locked: r.locked || false,
          meta: r.meta || { auto_added: false, managed_by_apps: false, managed_by_argo_tunnel: false },
          comment: r.comment || undefined,
          tags: r.tags || [],
          created_on: r.created_on,
          modified_on: r.modified_on,
        }
      };
    } catch (error: any) {
      console.error('[CloudflareService] Failed to update DNS record:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a DNS record
   */
  async deleteDNSRecord(zoneId: string, recordId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.getClient();
      await client.dns.records.delete(recordId, { zone_id: zoneId });
      return { success: true };
    } catch (error: any) {
      console.error('[CloudflareService] Failed to delete DNS record:', error);
      return { success: false, error: error.message };
    }
  }
}

export const cloudflareService = new CloudflareService();
