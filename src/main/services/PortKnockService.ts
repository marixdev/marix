import * as net from 'net';

/**
 * Port Knocking Service
 * 
 * Sends TCP connection attempts to a sequence of ports to "knock" on the firewall.
 * The server-side daemon (knockd) opens the SSH port after receiving the correct sequence.
 * 
 * Security benefits:
 * - SSH port remains closed to port scanners
 * - Only clients with the knock sequence can connect
 * - Prevents brute-force attacks on SSH
 * - Adds stealth layer before authentication
 */
export class PortKnockService {
  /**
   * Perform port knocking on target host
   * 
   * @param host Target server hostname/IP
   * @param ports Array of ports to knock in sequence (e.g., [7000, 8000, 9000])
   * @param delayMs Delay between knocks in milliseconds (default: 100ms)
   */
  static async knock(host: string, ports: number[], delayMs: number = 100): Promise<void> {
    if (!ports || ports.length === 0) {
      console.log('[PortKnock] No knock sequence provided, skipping');
      return;
    }

    console.log(`[PortKnock] Starting knock sequence on ${host}: ${ports.join(' → ')}`);

    for (let i = 0; i < ports.length; i++) {
      const port = ports[i];
      
      try {
        await this.knockPort(host, port);
        console.log(`[PortKnock] Knocked port ${port} (${i + 1}/${ports.length})`);
        
        // Delay before next knock (except after last knock)
        if (i < ports.length - 1) {
          await this.delay(delayMs);
        }
      } catch (error: any) {
        console.error(`[PortKnock] Failed to knock port ${port}:`, error.message);
        // Continue with next port even if one fails
      }
    }

    // Wait a bit for server to open SSH port
    console.log('[PortKnock] Knock sequence completed, waiting for SSH port to open...');
    await this.delay(500);
  }

  /**
   * Knock a single port by attempting TCP connection
   * The connection will fail, but the SYN packet reaches the knockd daemon
   */
  private static knockPort(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = 1000; // 1 second timeout

      // Set connection timeout
      socket.setTimeout(timeout);

      // Connection successful (unlikely for knock ports)
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });

      // Connection failed or timeout (expected behavior)
      socket.on('error', () => {
        socket.destroy();
        resolve(); // Not an error - knock was sent
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(); // Not an error - knock was sent
      });

      // Attempt connection to send SYN packet
      socket.connect(port, host);
    });
  }

  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate knock sequence format
   */
  static validateKnockSequence(sequence: string): { valid: boolean; ports?: number[]; error?: string } {
    if (!sequence || sequence.trim() === '') {
      return { valid: false, error: 'Knock sequence is empty' };
    }

    // Parse comma or space separated ports
    const parts = sequence.split(/[,\s]+/).map(p => p.trim()).filter(p => p);
    
    if (parts.length < 3) {
      return { valid: false, error: 'Knock sequence must have at least 3 ports' };
    }

    if (parts.length > 10) {
      return { valid: false, error: 'Knock sequence cannot exceed 10 ports' };
    }

    const ports: number[] = [];
    for (const part of parts) {
      const port = parseInt(part, 10);
      
      if (isNaN(port)) {
        return { valid: false, error: `Invalid port number: ${part}` };
      }
      
      if (port < 1 || port > 65535) {
        return { valid: false, error: `Port out of range (1-65535): ${port}` };
      }
      
      // Warn about common ports (but allow them)
      if ([22, 80, 443, 21, 25, 3306, 5432].includes(port)) {
        console.warn(`[PortKnock] Warning: Using common service port ${port} in knock sequence`);
      }
      
      ports.push(port);
    }

    return { valid: true, ports };
  }

  /**
   * Generate random knock sequence
   */
  static generateRandomSequence(length: number = 4): number[] {
    const ports: number[] = [];
    const usedPorts = new Set<number>();
    
    // Use port range 7000-9999 to avoid common services
    const minPort = 7000;
    const maxPort = 9999;
    
    while (ports.length < length) {
      const port = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
      
      if (!usedPorts.has(port)) {
        ports.push(port);
        usedPorts.add(port);
      }
    }
    
    return ports;
  }
}
