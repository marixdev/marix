/**
 * Server Benchmark Service
 * 
 * Runs performance benchmarks on remote servers via SSH:
 * - System Information (OS, CPU, RAM, Disk)
 * - Disk Speed (sequential write/read)
 * - Network Speed (download/upload test)
 * 
 * Inspired by codetay.com benchmark but fully independent implementation.
 */

import { SSHConnectionManager } from './SSHConnectionManager';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Speedtest server cache interface
interface SpeedtestServer {
  id: string;
  host: string;
  name: string;
  country: string;
  sponsor: string;
  url: string;
  lat: string;
  lon: string;
  region: string; // Search region used to find this server
  failCount: number; // Track download/upload failures
  latencyFailCount: number; // Track latency/ping failures
  lastTested?: number;
}

interface SpeedtestCache {
  servers: SpeedtestServer[];
  lastUpdated: number;
}

export interface SystemInfo {
  os: string;
  kernel: string;
  arch: string;
  hostname: string;
  uptime: string;
  loadAverage: string;
  cpu: {
    model: string;
    cores: number;
    frequency: string;
    usage: string;
  };
  memory: {
    total: string;
    used: string;
    free: string;
    usagePercent: number;
  };
  swap: {
    total: string;
    used: string;
    free: string;
  };
  disk: {
    total: string;
    used: string;
    free: string;
    usagePercent: number;
    mountPoint: string;
  };
  virtualization: string;
  ipv4: boolean;
  ipv6: boolean;
}

export interface CPUBenchmark {
  model: string;
  cores: number;
  threads: number;
  frequency: { base: number; max?: number };
  cache: { l2: string; l3: string };
  virtualization: string;
  isVirtual: boolean;
  hasAESNI: boolean;
  benchmark: {
    singleThread: number;
    multiThread: number;
    scaling: number;
  };
  crypto: {
    aes256gcm: number;
    sha256: number;
  };
  cpuSteal?: number;
  stealRating?: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface MemoryBenchmark {
  total: string;
  used: string;
  read: number;      // GB/s
  write: number;     // GB/s
  copy: number;      // GB/s
  latency: number;   // nanoseconds
}

export interface DiskBenchmark {
  sequentialWrite: {
    speed: string;
    rawBytes: number;
  };
  sequentialRead: {
    speed: string;
    rawBytes: number;
  };
  ioping: string;
  fio?: {
    [blockSize: string]: {
      readIops: string;
      writeIops: string;
      readBw: string;
      writeBw: string;
    };
  };
}

export interface NetworkBenchmark {
  tests: Array<{
    server: string;
    location: string;
    download: string;
    upload: string;
    latency: string;
  }>;
  provider?: string;
  publicIp?: string;
  location?: string;
}

export interface BenchmarkResult {
  systemInfo: SystemInfo | null;
  cpuBenchmark: CPUBenchmark | null;
  memoryBenchmark: MemoryBenchmark | null;
  diskBenchmark: DiskBenchmark | null;
  networkBenchmark: NetworkBenchmark | null;
  startTime: number;
  endTime: number;
  duration: number;
  errors: string[];
}

export interface BenchmarkProgress {
  phase: 'system' | 'cpu' | 'memory' | 'disk' | 'network' | 'complete';
  message: string;
  percent: number;
}

type ProgressCallback = (progress: BenchmarkProgress) => void;

// Cache file path for speedtest servers
const getCachePath = () => {
  try {
    return path.join(app.getPath('userData'), 'speedtest-servers-cache.json');
  } catch {
    return path.join(process.cwd(), 'speedtest-servers-cache.json');
  }
};

export class BenchmarkService {
  private sshManager: SSHConnectionManager;
  private static serverCache: SpeedtestCache | null = null;

  // Regions to search for multi-region coverage (40+ regions)
  private static readonly SEARCH_REGIONS = [
    // === VIETNAM ===
    'Hanoi', 'Ho Chi Minh', 'Da Nang',
    // === SOUTHEAST ASIA ===
    'Singapore', 'Bangkok', 'Jakarta', 'Kuala Lumpur', 'Manila', 'Phnom Penh', 'Yangon',
    // === EAST ASIA ===
    'Tokyo', 'Hong Kong', 'Seoul', 'Taipei', 'Beijing', 'Shanghai', 'Shenzhen',
    // === SOUTH ASIA ===
    'Mumbai', 'Delhi', 'Bangalore',
    // === OCEANIA ===
    'Sydney', 'Melbourne', 'Auckland', 'Brisbane',
    // === EUROPE ===
    'London', 'Frankfurt', 'Paris', 'Amsterdam', 'Moscow', 'Stockholm', 'Madrid', 'Milan',
    // === NORTH AMERICA ===
    'Los Angeles', 'New York', 'Chicago', 'Toronto', 'Vancouver', 'Miami', 'Seattle', 'Dallas',
    // === SOUTH AMERICA ===
    'Sao Paulo', 'Buenos Aires', 'Santiago', 'Lima', 'Bogota',
    // === AFRICA ===
    'Johannesburg', 'Cape Town', 'Lagos', 'Cairo', 'Nairobi',
    // === MIDDLE EAST ===
    'Dubai', 'Tel Aviv', 'Riyadh',
    // === RUSSIA & CIS ===
    'Moscow', 'Saint Petersburg', 'Almaty',
  ];

  constructor(sshManager: SSHConnectionManager) {
    this.sshManager = sshManager;
  }

  /**
   * Load server cache from disk
   */
  private static loadCache(): SpeedtestCache | null {
    try {
      const cachePath = getCachePath();
      if (fs.existsSync(cachePath)) {
        const data = fs.readFileSync(cachePath, 'utf-8');
        const cache = JSON.parse(data) as SpeedtestCache;
        // Filter out servers with too many failures
        cache.servers = cache.servers.filter(s => s.failCount < 3);
        return cache;
      }
    } catch (err) {
      console.error('[Benchmark] Failed to load server cache:', err);
    }
    return null;
  }

  /**
   * Save server cache to disk
   */
  private static saveCache(cache: SpeedtestCache): void {
    try {
      const cachePath = getCachePath();
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    } catch (err) {
      console.error('[Benchmark] Failed to save server cache:', err);
    }
  }

  /**
   * Mark a server as failed (download/upload failure)
   */
  private static markServerFailed(serverId: string): void {
    if (!this.serverCache) return;
    
    const server = this.serverCache.servers.find(s => s.id === serverId);
    if (server) {
      server.failCount = (server.failCount || 0) + 1;
      this.saveCache(this.serverCache);
    }
  }

  /**
   * Mark a server as latency failed (ping failure)
   */
  private static markLatencyFailed(serverId: string): void {
    if (!this.serverCache) return;
    
    const server = this.serverCache.servers.find(s => s.id === serverId);
    if (server) {
      server.latencyFailCount = (server.latencyFailCount || 0) + 1;
      // Don't save immediately, will save after all tests
    }
  }

  /**
   * Get cached servers or fetch new ones
   */
  private static getServerCache(): SpeedtestCache | null {
    if (!this.serverCache) {
      this.serverCache = this.loadCache();
    }
    return this.serverCache;
  }

  /**
   * Run full benchmark suite
   */
  async runBenchmark(
    connectionId: string,
    onProgress?: ProgressCallback
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let systemInfo: SystemInfo | null = null;
    let cpuBenchmark: CPUBenchmark | null = null;
    let memoryBenchmark: MemoryBenchmark | null = null;
    let diskBenchmark: DiskBenchmark | null = null;
    let networkBenchmark: NetworkBenchmark | null = null;

    // Phase 1: System Information (0-15%)
    onProgress?.({ phase: 'system', message: 'Collecting system information...', percent: 0 });
    try {
      systemInfo = await this.getSystemInfo(connectionId, onProgress);
    } catch (err: any) {
      errors.push(`System info error: ${err.message}`);
    }

    // Phase 2: CPU Benchmark (15-35%)
    onProgress?.({ phase: 'cpu', message: 'Running CPU benchmark...', percent: 15 });
    try {
      cpuBenchmark = await this.runCPUBenchmark(connectionId, onProgress);
    } catch (err: any) {
      errors.push(`CPU benchmark error: ${err.message}`);
    }

    // Phase 3: Memory Benchmark (35-45%)
    onProgress?.({ phase: 'memory', message: 'Running memory benchmark...', percent: 35 });
    try {
      memoryBenchmark = await this.runMemoryBenchmark(connectionId, onProgress);
    } catch (err: any) {
      errors.push(`Memory benchmark error: ${err.message}`);
    }

    // Phase 4: Disk Benchmark (45-65%)
    onProgress?.({ phase: 'disk', message: 'Running disk benchmark...', percent: 45 });
    try {
      diskBenchmark = await this.runDiskBenchmark(connectionId, onProgress);
    } catch (err: any) {
      errors.push(`Disk benchmark error: ${err.message}`);
    }

    // Phase 5: Network Benchmark (65-100%)
    onProgress?.({ phase: 'network', message: 'Running network speed test...', percent: 65 });
    try {
      networkBenchmark = await this.runNetworkBenchmark(connectionId, onProgress);
    } catch (err: any) {
      errors.push(`Network benchmark error: ${err.message}`);
    }

    const endTime = Date.now();
    onProgress?.({ phase: 'complete', message: 'Benchmark complete!', percent: 100 });

    return {
      systemInfo,
      cpuBenchmark,
      memoryBenchmark,
      diskBenchmark,
      networkBenchmark,
      startTime,
      endTime,
      duration: endTime - startTime,
      errors
    };
  }

  /**
   * Collect system information
   */
  private async getSystemInfo(
    connectionId: string,
    onProgress?: ProgressCallback
  ): Promise<SystemInfo> {
    const exec = (cmd: string) => this.sshManager.executeCommand(connectionId, cmd);

    onProgress?.({ phase: 'system', message: 'Getting OS info...', percent: 5 });
    
    // OS Info
    let os = 'Unknown';
    try {
      const osRelease = await exec('cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'');
      os = osRelease.trim() || 'Unknown';
    } catch {
      try {
        os = (await exec('uname -o')).trim();
      } catch {}
    }

    onProgress?.({ phase: 'system', message: 'Getting kernel info...', percent: 10 });
    
    // Kernel
    const kernel = (await exec('uname -r')).trim();
    const arch = (await exec('uname -m')).trim();
    const hostname = (await exec('hostname')).trim();

    onProgress?.({ phase: 'system', message: 'Getting uptime...', percent: 15 });
    
    // Uptime
    let uptime = 'Unknown';
    try {
      const uptimeSec = (await exec('cat /proc/uptime | cut -d. -f1')).trim();
      const seconds = parseInt(uptimeSec, 10);
      if (!isNaN(seconds)) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        uptime = days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;
      }
    } catch {}

    // Load average
    const loadAverage = (await exec('cat /proc/loadavg | cut -d\' \' -f1-3')).trim();

    onProgress?.({ phase: 'system', message: 'Getting CPU info...', percent: 20 });
    
    // CPU Info
    let cpuModel = 'Unknown';
    let cpuCores = 1;
    let cpuFreq = 'Unknown';
    let cpuUsage = '0%';
    try {
      cpuModel = (await exec('cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2')).trim();
      const coresStr = (await exec('nproc')).trim();
      cpuCores = parseInt(coresStr, 10) || 1;
      
      // CPU frequency
      const freqMhz = (await exec('cat /proc/cpuinfo | grep "cpu MHz" | head -1 | cut -d: -f2')).trim();
      if (freqMhz) {
        const freq = parseFloat(freqMhz);
        cpuFreq = freq > 1000 ? `${(freq / 1000).toFixed(2)} GHz` : `${freq.toFixed(0)} MHz`;
      }
      
      // CPU usage (quick sample)
      const usage = await exec('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\'');
      cpuUsage = usage.trim() ? `${parseFloat(usage.trim()).toFixed(1)}%` : '0%';
    } catch {}

    onProgress?.({ phase: 'system', message: 'Getting memory info...', percent: 25 });
    
    // Memory Info
    let memTotal = '0';
    let memUsed = '0';
    let memFree = '0';
    let memUsagePercent = 0;
    try {
      const memInfo = await exec('free -b | grep Mem');
      const parts = memInfo.trim().split(/\s+/);
      if (parts.length >= 3) {
        const total = parseInt(parts[1], 10);
        const used = parseInt(parts[2], 10);
        const free = parseInt(parts[3], 10);
        memTotal = this.formatBytes(total);
        memUsed = this.formatBytes(used);
        memFree = this.formatBytes(free);
        memUsagePercent = Math.round((used / total) * 100);
      }
    } catch {}

    // Swap Info
    let swapTotal = '0';
    let swapUsed = '0';
    let swapFree = '0';
    try {
      const swapInfo = await exec('free -b | grep Swap');
      const parts = swapInfo.trim().split(/\s+/);
      if (parts.length >= 3) {
        swapTotal = this.formatBytes(parseInt(parts[1], 10));
        swapUsed = this.formatBytes(parseInt(parts[2], 10));
        swapFree = this.formatBytes(parseInt(parts[3], 10));
      }
    } catch {}

    onProgress?.({ phase: 'system', message: 'Getting disk info...', percent: 30 });
    
    // Disk Info
    let diskTotal = '0';
    let diskUsed = '0';
    let diskFree = '0';
    let diskUsagePercent = 0;
    let mountPoint = '/';
    try {
      const diskInfo = await exec('df -B1 / | tail -1');
      const parts = diskInfo.trim().split(/\s+/);
      if (parts.length >= 5) {
        diskTotal = this.formatBytes(parseInt(parts[1], 10));
        diskUsed = this.formatBytes(parseInt(parts[2], 10));
        diskFree = this.formatBytes(parseInt(parts[3], 10));
        diskUsagePercent = parseInt(parts[4], 10);
        mountPoint = parts[5] || '/';
      }
    } catch {}

    onProgress?.({ phase: 'system', message: 'Getting virtualization info...', percent: 35 });
    
    // Virtualization
    let virtualization = 'Bare Metal';
    try {
      const virt = await exec('systemd-detect-virt 2>/dev/null || cat /sys/class/dmi/id/product_name 2>/dev/null | head -1');
      const virtType = virt.trim().toLowerCase();
      if (virtType === 'kvm' || virtType.includes('kvm')) virtualization = 'KVM';
      else if (virtType === 'vmware' || virtType.includes('vmware')) virtualization = 'VMware';
      else if (virtType === 'xen') virtualization = 'Xen';
      else if (virtType === 'lxc') virtualization = 'LXC';
      else if (virtType === 'docker') virtualization = 'Docker';
      else if (virtType === 'openvz') virtualization = 'OpenVZ';
      else if (virtType === 'microsoft' || virtType.includes('hyper-v')) virtualization = 'Hyper-V';
      else if (virtType.includes('virtual')) virtualization = virtType;
      else if (virtType !== 'none' && virtType !== '') virtualization = virtType;
    } catch {}

    // IPv4/IPv6 connectivity check
    onProgress?.({ phase: 'system', message: 'Checking IPv4/IPv6 connectivity...', percent: 13 });
    let ipv4 = false;
    let ipv6 = false;
    try {
      const ipv4Result = await exec('curl -4 -s --max-time 5 https://ipv4.icanhazip.com 2>/dev/null');
      ipv4 = ipv4Result.trim().length > 0 && /^\d{1,3}(\.\d{1,3}){3}$/.test(ipv4Result.trim());
    } catch {}
    try {
      const ipv6Result = await exec('curl -6 -s --max-time 5 https://ipv6.icanhazip.com 2>/dev/null');
      ipv6 = ipv6Result.trim().length > 0 && /^[0-9a-f:]+$/i.test(ipv6Result.trim());
    } catch {}

    return {
      os,
      kernel,
      arch,
      hostname,
      uptime,
      loadAverage,
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        frequency: cpuFreq,
        usage: cpuUsage
      },
      memory: {
        total: memTotal,
        used: memUsed,
        free: memFree,
        usagePercent: memUsagePercent
      },
      swap: {
        total: swapTotal,
        used: swapUsed,
        free: swapFree
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskFree,
        usagePercent: diskUsagePercent,
        mountPoint
      },
      virtualization,
      ipv4,
      ipv6
    };
  }

  /**
   * Run CPU benchmark via SSH
   * Tests single-thread performance, crypto (OpenSSL), CPU steal
   */
  private async runCPUBenchmark(
    connectionId: string,
    onProgress?: ProgressCallback
  ): Promise<CPUBenchmark> {
    const exec = (cmd: string) => this.sshManager.executeCommand(connectionId, cmd);

    onProgress?.({ phase: 'cpu', message: 'Collecting CPU details...', percent: 16 });

    // Get detailed CPU info  
    let model = 'Unknown';
    let cores = 1;
    let threads = 1;
    let baseFreq = 0;
    let maxFreq: number | undefined;
    let l2 = 'N/A';
    let l3 = 'N/A';
    let hasAESNI = false;

    try {
      const cpuinfo = await exec('cat /proc/cpuinfo');
      const modelMatch = cpuinfo.match(/model name\s*:\s*(.+)/);
      if (modelMatch) {
        model = modelMatch[1].trim()
          .replace(/\(R\)/g, '').replace(/\(TM\)/g, '')
          .replace(/CPU @.*$/, '').replace(/\s+/g, ' ').trim();
      }
      const processorMatches = cpuinfo.match(/processor\s*:/g);
      threads = processorMatches ? processorMatches.length : 1;
      const freqMatch = cpuinfo.match(/cpu MHz\s*:\s*([\d.]+)/);
      if (freqMatch) baseFreq = Math.round(parseFloat(freqMatch[1]));
      hasAESNI = cpuinfo.includes(' aes ');

      const lscpu = await exec('lscpu 2>/dev/null || true');
      const coresMatch = lscpu.match(/Core\\(s\\) per socket:\\s*(\\d+)/);
      const socketsMatch = lscpu.match(/Socket\\(s\\):\\s*(\\d+)/);
      if (coresMatch && socketsMatch) {
        cores = parseInt(coresMatch[1]) * parseInt(socketsMatch[1]);
      } else {
        cores = threads;
      }
      const maxFreqMatch = lscpu.match(/CPU max MHz:\\s*([\\d.]+)/);
      if (maxFreqMatch) maxFreq = Math.round(parseFloat(maxFreqMatch[1]));
      const l2Match = lscpu.match(/L2 cache:\\s*(.+)/);
      if (l2Match) l2 = l2Match[1].trim();
      const l3Match = lscpu.match(/L3 cache:\\s*(.+)/);
      if (l3Match) l3 = l3Match[1].trim();
    } catch {}

    // Virtualization detection
    let virtualization = 'Dedicated';
    let isVirtual = false;
    try {
      const detectVirt = await exec('systemd-detect-virt 2>/dev/null || true');
      const virt = detectVirt.trim();
      if (virt && virt !== 'none' && virt !== '') {
        const virtNames: Record<string, string> = {
          'kvm': 'KVM', 'qemu': 'QEMU', 'vmware': 'VMware', 'microsoft': 'Hyper-V',
          'xen': 'Xen', 'lxc': 'LXC', 'openvz': 'OpenVZ', 'docker': 'Docker',
          'oracle': 'VirtualBox', 'amazon': 'AWS EC2', 'google': 'Google Cloud', 'azure': 'Microsoft Azure'
        };
        virtualization = virtNames[virt] || virt.charAt(0).toUpperCase() + virt.slice(1);
        isVirtual = true;
      }
    } catch {}

    // Single-thread benchmark using shell script (prime counting)
    onProgress?.({ phase: 'cpu', message: 'Running single-thread benchmark...', percent: 20 });
    let singleThread = 0;
    try {
      // Use Python for accurate benchmark (available on 99% of Linux servers)
      const benchScript = `python3 -c "
import time
def count_primes(limit):
    count = 0
    for n in range(2, limit + 1):
        is_prime = True
        i = 2
        while i * i <= n:
            if n % i == 0:
                is_prime = False
                break
            i += 1
        if is_prime:
            count += 1
    return count

# Run for ~2 seconds, measure ops/sec
ops = 0
start = time.time()
while time.time() - start < 2.0:
    count_primes(10000)
    ops += 1
elapsed = time.time() - start
print(int(ops / elapsed * 1000))
" 2>/dev/null`;
      const result = await exec(benchScript);
      const parsed = parseInt(result.trim());
      if (!isNaN(parsed) && parsed > 0) singleThread = parsed;
    } catch {}

    // Multi-thread estimate
    const multiThread = singleThread * threads;
    const scaling = 100;

    // OpenSSL crypto benchmark
    onProgress?.({ phase: 'cpu', message: 'Testing AES-256-GCM encryption...', percent: 25 });
    let aes256gcm = 0;
    let sha256 = 0;
    try {
      const aesOutput = await exec('openssl speed -elapsed -evp aes-256-gcm 2>&1 | tail -1');
      const aesMatch = aesOutput.match(/([\d.]+)k\s*$/);
      if (aesMatch) aes256gcm = Math.round(parseFloat(aesMatch[1]) * 1024);
    } catch {}
    try {
      onProgress?.({ phase: 'cpu', message: 'Testing SHA256 hashing...', percent: 28 });
      const shaOutput = await exec('openssl speed -elapsed sha256 2>&1 | tail -1');
      const shaMatch = shaOutput.match(/([\d.]+)k\s*$/);
      if (shaMatch) sha256 = Math.round(parseFloat(shaMatch[1]) * 1024);
    } catch {}

    // CPU Steal (only for VMs)
    let cpuSteal: number | undefined;
    let stealRating: CPUBenchmark['stealRating'];
    if (isVirtual) {
      onProgress?.({ phase: 'cpu', message: 'Measuring CPU steal...', percent: 30 });
      try {
        const stealResult = await exec(`
          cat /proc/stat | head -1 > /tmp/cpu1;
          sleep 1;
          cat /proc/stat | head -1 > /tmp/cpu2;
          awk 'NR==1{split($0,a)} NR==2{split($0,b)} END{
            t1=0; t2=0; for(i=2;i<=9;i++){t1+=a[i]; t2+=b[i]}
            if(t2-t1>0) printf "%.1f", (b[9]-a[9])/(t2-t1)*100; else print "0"
          }' /tmp/cpu1 /tmp/cpu2 2>/dev/null
        `);
        cpuSteal = parseFloat(stealResult.trim()) || 0;
        if (cpuSteal <= 1) stealRating = 'excellent';
        else if (cpuSteal <= 3) stealRating = 'good';
        else if (cpuSteal <= 5) stealRating = 'warning';
        else stealRating = 'critical';
      } catch {}
    }

    onProgress?.({ phase: 'cpu', message: 'CPU benchmark complete', percent: 34 });

    return {
      model,
      cores,
      threads,
      frequency: { base: baseFreq, max: maxFreq },
      cache: { l2, l3 },
      virtualization,
      isVirtual,
      hasAESNI,
      benchmark: { singleThread, multiThread, scaling },
      crypto: { aes256gcm, sha256 },
      cpuSteal,
      stealRating
    };
  }

  /**
   * Run Memory benchmark via SSH
   * Tests read, write, copy speeds and latency using dd and Python
   */
  private async runMemoryBenchmark(
    connectionId: string,
    onProgress?: ProgressCallback
  ): Promise<MemoryBenchmark> {
    const exec = (cmd: string) => this.sshManager.executeCommand(connectionId, cmd);

    // Get memory info
    let total = 'N/A';
    let used = 'N/A';
    try {
      const meminfo = await exec('cat /proc/meminfo');
      const totalMatch = meminfo.match(/MemTotal:\\s+(\\d+)/);
      const availMatch = meminfo.match(/MemAvailable:\\s+(\\d+)/);
      if (totalMatch) {
        const totalKb = parseInt(totalMatch[1]);
        total = `${(totalKb * 1024 / (1024 ** 3)).toFixed(2)} GB`;
        if (availMatch) {
          const usedBytes = (totalKb - parseInt(availMatch[1])) * 1024;
          used = `${(usedBytes / (1024 ** 3)).toFixed(2)} GB`;
        }
      }
    } catch {}

    // Memory bandwidth and latency test using Python/dd
    onProgress?.({ phase: 'memory', message: 'Testing memory write speed...', percent: 37 });
    let readSpeed = 0;
    let writeSpeed = 0;
    let copySpeed = 0;
    let latency = 0;

    try {
      // Use dd for memory bandwidth (write to /dev/null from /dev/zero through memory)
      // This measures effective memory bandwidth
      const memBenchScript = `python3 -c "
import time, array, random

SIZE = 64 * 1024 * 1024  # 64MB

# Write test
buf = bytearray(SIZE)
start = time.time()
for i in range(0, SIZE, 4096):
    buf[i] = i & 0xFF
write_time = time.time() - start
write_gbs = (SIZE / (1024**3)) / write_time if write_time > 0 else 0

# Read test
start = time.time()
s = 0
for i in range(0, SIZE, 4096):
    s += buf[i]
read_time = time.time() - start
read_gbs = (SIZE / (1024**3)) / read_time if read_time > 0 else 0

# Copy test
dst = bytearray(SIZE)
start = time.time()
dst[:] = buf
copy_time = time.time() - start
copy_gbs = (SIZE / (1024**3)) / copy_time if copy_time > 0 else 0

# Latency test (random access)
arr = list(range(1024 * 1024))
random.shuffle(arr)
idx = 0
start = time.time()
for _ in range(100000):
    idx = arr[idx % len(arr)]
lat_time = time.time() - start
lat_ns = (lat_time / 100000) * 1e9

print(f'{read_gbs:.2f} {write_gbs:.2f} {copy_gbs:.2f} {lat_ns:.1f}')
" 2>/dev/null`;

      onProgress?.({ phase: 'memory', message: 'Running memory benchmark...', percent: 39 });
      const result = await exec(memBenchScript);
      const parts = result.trim().split(/\s+/);
      if (parts.length >= 4) {
        readSpeed = parseFloat(parts[0]) || 0;
        writeSpeed = parseFloat(parts[1]) || 0;
        copySpeed = parseFloat(parts[2]) || 0;
        latency = parseFloat(parts[3]) || 0;
      }
    } catch {}

    onProgress?.({ phase: 'memory', message: 'Memory benchmark complete', percent: 44 });

    return {
      total,
      used,
      read: Math.round(readSpeed * 100) / 100,
      write: Math.round(writeSpeed * 100) / 100,
      copy: Math.round(copySpeed * 100) / 100,
      latency: Math.round(latency * 10) / 10
    };
  }

  /**
   * Run disk benchmark
   */
  private async runDiskBenchmark(
    connectionId: string,
    onProgress?: ProgressCallback
  ): Promise<DiskBenchmark> {
    const exec = (cmd: string) => this.sshManager.executeCommand(connectionId, cmd);

    onProgress?.({ phase: 'disk', message: 'Installing fio & ioping...', percent: 42 });
    
    // Install fio and ioping if not available
    try {
      // Check and install fio
      const hasFio = await exec('command -v fio >/dev/null 2>&1 && echo "yes" || echo "no"');
      if (hasFio.trim() !== 'yes') {
        // Detect package manager and install
        await exec(`
          if command -v apt-get >/dev/null 2>&1; then
            sudo apt-get update -qq && sudo apt-get install -y -qq fio ioping 2>/dev/null || true
          elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y -q fio ioping 2>/dev/null || sudo yum install -y -q epel-release && sudo yum install -y -q fio ioping 2>/dev/null || true
          elif command -v dnf >/dev/null 2>&1; then
            sudo dnf install -y -q fio ioping 2>/dev/null || true
          elif command -v pacman >/dev/null 2>&1; then
            sudo pacman -S --noconfirm fio ioping 2>/dev/null || true
          elif command -v apk >/dev/null 2>&1; then
            sudo apk add --quiet fio ioping 2>/dev/null || true
          elif command -v zypper >/dev/null 2>&1; then
            sudo zypper install -y -q fio ioping 2>/dev/null || true
          fi
        `);
      }
      // Check and install ioping separately if needed
      const hasIoping = await exec('command -v ioping >/dev/null 2>&1 && echo "yes" || echo "no"');
      if (hasIoping.trim() !== 'yes') {
        await exec(`
          if command -v apt-get >/dev/null 2>&1; then
            sudo apt-get install -y -qq ioping 2>/dev/null || true
          elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y -q ioping 2>/dev/null || true
          elif command -v dnf >/dev/null 2>&1; then
            sudo dnf install -y -q ioping 2>/dev/null || true
          fi
        `);
      }
    } catch {
      // Installation failed, continue anyway
    }

    onProgress?.({ phase: 'disk', message: 'Testing sequential write speed (dd)...', percent: 45 });
    
    // Determine test directory - avoid /tmp if it's tmpfs (RAM)
    // Use home directory or a directory on real disk
    let testDir = '/tmp';
    try {
      const tmpFsType = await exec("df /tmp 2>/dev/null | tail -1 | awk '{print $1}'");
      if (tmpFsType.trim() === 'tmpfs' || tmpFsType.trim().includes('tmpfs')) {
        // /tmp is RAM, use home directory or root
        const homeDir = await exec('echo $HOME');
        testDir = homeDir.trim() || '/root';
      }
    } catch {
      testDir = '/root';
    }
    
    // Cleanup any leftover test files first
    try {
      await exec(`rm -f ${testDir}/arix_test_dd ${testDir}/arix_test_read ${testDir}/arix_fio_test /tmp/arix_fio_test 2>/dev/null`);
    } catch {}
    
    // Sequential Write using tocdo.net method: LANG=C dd bs=64k count=16k (1GB)
    // Run 3 times and average
    let writeSpeed = 'N/A';
    let writeBytes = 0;
    try {
      // Use tocdo.net method: LANG=C dd bs=64k count=16k = 1GB, run 3 times
      const ddCmd = `cd ${testDir} && LANG=C dd if=/dev/zero of=arix_test_dd bs=64k count=16k conv=fdatasync 2>&1 | awk -F, '{io=$NF} END { print io}'`;
      
      const io1 = await exec(ddCmd);
      await exec(`rm -f ${testDir}/arix_test_dd`); // Cleanup after each run
      const io2 = await exec(ddCmd);
      await exec(`rm -f ${testDir}/arix_test_dd`);
      const io3 = await exec(ddCmd);
      await exec(`rm -f ${testDir}/arix_test_dd`);
      
      // Parse results (e.g., "430 MB/s" or "1.2 GB/s")
      const parseSpeed = (s: string): number => {
        const trimmed = s.trim();
        const match = trimmed.match(/^([\d.]+)\s*(GB|MB|KB)\/s$/i);
        if (match) {
          const val = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          if (unit === 'GB') return val * 1024;
          if (unit === 'KB') return val / 1024;
          return val; // MB
        }
        return 0;
      };
      
      const speed1 = parseSpeed(io1);
      const speed2 = parseSpeed(io2);
      const speed3 = parseSpeed(io3);
      
      if (speed1 > 0 || speed2 > 0 || speed3 > 0) {
        const avgSpeed = (speed1 + speed2 + speed3) / 3;
        writeBytes = 64 * 1024 * 16 * 1024; // 1GB
        if (avgSpeed >= 1024) {
          writeSpeed = `${(avgSpeed / 1024).toFixed(1)} GB/s`;
        } else {
          writeSpeed = `${avgSpeed.toFixed(1)} MB/s`;
        }
      }
    } catch {
      // Cleanup on error
      try { await exec(`rm -f ${testDir}/arix_test_dd`); } catch {}
    }

    onProgress?.({ phase: 'disk', message: 'Testing sequential read speed (dd)...', percent: 55 });
    
    // Sequential Read - create test file on real disk, clear cache, then read
    let readSpeed = 'N/A';
    let readBytes = 0;
    try {
      // Create test file first on real disk
      await exec(`cd ${testDir} && dd if=/dev/zero of=arix_test_read bs=64k count=16k conv=fdatasync 2>/dev/null`);
      // Clear cache - this is critical for accurate read test
      await exec('sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true');
      // Read test
      const readResult = await exec(`cd ${testDir} && LANG=C dd if=arix_test_read of=/dev/null bs=64k 2>&1 | awk -F, '{io=$NF} END { print io}'`);
      // Cleanup immediately after read
      await exec(`rm -f ${testDir}/arix_test_read`);
      
      const trimmed = readResult.trim();
      const match = trimmed.match(/^([\d.]+)\s*(GB|MB|KB)\/s$/i);
      if (match) {
        readBytes = 64 * 1024 * 16 * 1024; // 1GB
        const val = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        if (unit === 'GB') {
          readSpeed = `${val.toFixed(1)} GB/s`;
        } else if (unit === 'KB') {
          readSpeed = `${(val / 1024).toFixed(1)} MB/s`;
        } else {
          readSpeed = `${val.toFixed(1)} MB/s`;
        }
      }
    } catch {
      // Cleanup on error
      try { await exec(`rm -f ${testDir}/arix_test_read`); } catch {}
    }

    onProgress?.({ phase: 'disk', message: 'Testing I/O latency (ioping)...', percent: 60 });
    
    // IOPing for latency - test on root filesystem (real disk), not /tmp (may be tmpfs/RAM)
    let ioping = 'N/A';
    try {
      // Get the mount point of root filesystem
      const mountPoint = await exec("df / | tail -1 | awk '{print $NF}'");
      const testDir = mountPoint.trim() || '/';
      
      const iopingResult = await exec(`ioping -c 10 -q ${testDir} 2>&1 | tail -1`);
      // Parse: "min/avg/max/mdev = 188.4 us / 227.1 us / 261.6 us / 19.3 us"
      const avgMatch = iopingResult.match(/\/\s*([\d.]+)\s*(ms|us)\s*\//);
      if (avgMatch) {
        ioping = `${avgMatch[1]} ${avgMatch[2]}`;
      } else {
        // Alternative: just get any latency number
        const anyMatch = iopingResult.match(/([\d.]+)\s*(ms|us)/);
        if (anyMatch) {
          ioping = `${anyMatch[1]} ${anyMatch[2]}`;
        }
      }
    } catch {}

    onProgress?.({ phase: 'disk', message: 'Testing random IOPS (fio)...', percent: 58 });
    
    // FIO random read/write test - multiple block sizes like benix (4k, 64k, 512k, 1m)
    // Uses JSON output for reliable parsing across fio versions
    let fio: DiskBenchmark['fio'] = undefined;
    try {
      const hasFio = await exec('command -v fio >/dev/null 2>&1 && echo "yes" || echo "no"');
      if (hasFio.trim() === 'yes') {
        const blockSizes = ['4k', '64k', '512k', '1m'];
        const fioResults: Record<string, { readIops: string; writeIops: string; readBw: string; writeBw: string }> = {};
        
        for (const bs of blockSizes) {
          onProgress?.({ phase: 'disk', message: `Testing random IOPS (${bs})...`, percent: 58 + blockSizes.indexOf(bs) * 2 });
          try {
            const fioResult = await exec(`
              cd ${testDir} && fio --name=test --filename=arix_fio_test --size=256M --bs=${bs} \
              --ioengine=libaio --iodepth=64 --rw=randrw --rwmixread=50 --direct=1 \
              --runtime=15 --time_based --group_reporting --output-format=json 2>/dev/null
            `);
            await exec(`rm -f ${testDir}/arix_fio_test`);

            const json = JSON.parse(fioResult);
            const job = json.jobs?.[0];
            if (job) {
              const formatBw = (bwKb: number): string => {
                const bytes = bwKb * 1024;
                if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
                if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
                return `${(bytes / 1024).toFixed(1)} KB/s`;
              };
              const formatIopsVal = (iops: number): string => {
                if (iops >= 1000) return `${(iops / 1000).toFixed(1)}k`;
                return `${Math.round(iops)}`;
              };
              fioResults[bs] = {
                readBw: formatBw(job.read?.bw || 0),
                writeBw: formatBw(job.write?.bw || 0),
                readIops: formatIopsVal(job.read?.iops || 0),
                writeIops: formatIopsVal(job.write?.iops || 0)
              };
            }
          } catch {
            // Skip this block size on error  
          }
        }
        
        if (Object.keys(fioResults).length > 0) {
          fio = fioResults;
        }
      }
    } catch {
      try { await exec(`rm -f ${testDir}/arix_fio_test`); } catch {}
    }

    // Final cleanup - ensure all test files are removed
    try {
      await exec(`rm -f ${testDir}/arix_test_dd ${testDir}/arix_test_read ${testDir}/arix_fio_test /tmp/arix_fio_test 2>/dev/null`);
    } catch {}

    return {
      sequentialWrite: { speed: writeSpeed, rawBytes: writeBytes },
      sequentialRead: { speed: readSpeed, rawBytes: readBytes },
      ioping,
      fio
    };
  }

  /**
   * Run network benchmark
   */
  private async runNetworkBenchmark(
    connectionId: string,
    onProgress?: ProgressCallback
  ): Promise<NetworkBenchmark> {
    const exec = (cmd: string) => this.sshManager.executeCommand(connectionId, cmd);
    const tests: NetworkBenchmark['tests'] = [];
    let provider: string | undefined;
    let publicIp: string | undefined;
    let location: string | undefined;

    onProgress?.({ phase: 'network', message: 'Getting public IP...', percent: 72 });
    
    // Get public IP and provider
    try {
      publicIp = (await exec('curl -s -4 -m 5 ifconfig.me 2>/dev/null || curl -s -4 -m 5 icanhazip.com 2>/dev/null')).trim();
    } catch {}

    // Try to detect provider and location via benix API (IP2Location)
    if (publicIp) {
      try {
        const ipInfo = await exec(`curl -s -m 5 "https://api.benix.app/api/ip/${publicIp}" 2>/dev/null`);
        const info = JSON.parse(ipInfo);
        if (info && info.location) {
          location = info.location;
          provider = info.provider || undefined;
          console.log('[Benchmark] benix IP lookup:', JSON.stringify(info));
        }
      } catch (e) {
        console.log('[Benchmark] benix IP lookup failed:', e);
      }
    }

    // Fallback: try ip-api.com if benix API failed
    if (!location && publicIp) {
      try {
        const ipInfo = await exec(`curl -s -m 5 "http://ip-api.com/json/${publicIp}?fields=status,country,regionName,city,isp,org" 2>/dev/null`);
        const info = JSON.parse(ipInfo);
        if (!provider) provider = info.org || info.isp || undefined;
        const locParts = [info.city, info.regionName, info.country].filter(Boolean);
        if (locParts.length > 0) {
          location = locParts.join(', ');
        }
        console.log('[Benchmark] ip-api.com fallback:', location);
      } catch (e) {
        console.log('[Benchmark] ip-api.com failed:', e);
      }
    }

    onProgress?.({ phase: 'network', message: 'Loading speedtest servers...', percent: 75 });
    
    // Get server list - use cache if available
    let speedtestServers: SpeedtestServer[] = [];
    const cache = BenchmarkService.getServerCache();
    
    if (cache && cache.servers.length > 0) {
      // Use cached servers (filter out failed ones - both download and latency failures)
      speedtestServers = cache.servers.filter(s => 
        (s.failCount || 0) < 3 && (s.latencyFailCount || 0) < 5
      );
      onProgress?.({ phase: 'network', message: `Using ${speedtestServers.length} cached servers...`, percent: 76 });
    }
    
    // If no cache or not enough servers, fetch from API
    if (speedtestServers.length < 20) {
      onProgress?.({ phase: 'network', message: 'Fetching servers from Speedtest.net API...', percent: 77 });
      
      const seenIds = new Set<string>(speedtestServers.map(s => s.id));
      const newServers: SpeedtestServer[] = [];
      
      // Fetch servers from multiple regions in parallel (batch of 5)
      // DO NOT limit by server count - fetch ALL regions for global coverage
      const regions = BenchmarkService.SEARCH_REGIONS;
      const batchSize = 5;
      
      for (let i = 0; i < regions.length; i += batchSize) {
        const batch = regions.slice(i, i + batchSize);
        const batchPromises = batch.map(async (region) => {
          try {
            const searchParam = `&search=${encodeURIComponent(region)}`;
            const serversJson = await exec(
              `curl -s --connect-timeout 3 --max-time 5 'https://www.speedtest.net/api/js/servers?engine=js&limit=2${searchParam}' 2>/dev/null`
            );
            const parsed = JSON.parse(serversJson);
            if (Array.isArray(parsed)) {
              return parsed.map(server => ({
                ...server,
                region: region,
                failCount: 0,
                latencyFailCount: 0,
                lastTested: undefined
              }));
            }
          } catch {}
          return [];
        });
        
        const results = await Promise.all(batchPromises);
        for (const servers of results) {
          for (const server of servers) {
            if (!seenIds.has(server.id)) {
              seenIds.add(server.id);
              newServers.push(server);
            }
          }
        }
      }
      
      console.log(`[Benchmark] Fetched ${newServers.length} new servers from Speedtest.net API`);
      
      // Merge with existing cached servers
      speedtestServers = [...speedtestServers, ...newServers];
      
      // Save to cache
      BenchmarkService.serverCache = {
        servers: speedtestServers,
        lastUpdated: Date.now()
      };
      BenchmarkService.saveCache(BenchmarkService.serverCache);
      
      onProgress?.({ phase: 'network', message: `Cached ${speedtestServers.length} servers from ${BenchmarkService.SEARCH_REGIONS.length} regions`, percent: 78 });
    }

    // Fallback: try alternative API if no servers found
    if (speedtestServers.length === 0) {
      try {
        const serversXml = await exec(
          `curl -s 'https://c.speedtest.net/speedtest-servers-static.php' 2>/dev/null | grep -oP '<server[^>]+>' | head -20`
        );
        // Parse XML servers
        const serverMatches = serversXml.matchAll(
          /url="([^"]+)".*?lat="([^"]+)".*?lon="([^"]+)".*?name="([^"]+)".*?country="([^"]+)".*?sponsor="([^"]+)".*?id="([^"]+)"/g
        );
        for (const match of serverMatches) {
          speedtestServers.push({
            id: match[7],
            url: match[1],
            lat: match[2],
            lon: match[3],
            name: match[4],
            country: match[5],
            sponsor: match[6],
            host: new URL(match[1]).host,
            region: 'global',
            failCount: 0,
            latencyFailCount: 0
          });
        }
      } catch {}
    }

    onProgress?.({ phase: 'network', message: 'Testing latency to servers...', percent: 78 });

    // Pre-select servers from each region to ensure global coverage
    // Instead of testing first 40 servers (which may all be from nearby regions)
    const serversToTest: typeof speedtestServers = [];
    const regionServerCount: { [region: string]: number } = {};
    
    // First, pick 2-3 servers from each search region
    for (const server of speedtestServers) {
      const region = server.region || 'Other';
      regionServerCount[region] = (regionServerCount[region] || 0) + 1;
      if (regionServerCount[region] <= 3) {
        serversToTest.push(server);
      }
    }
    
    console.log(`[Benchmark] Pre-selected ${serversToTest.length} servers from ${Object.keys(regionServerCount).length} regions for latency test`);

    // Test latency to each server and pick best ones per region
    const serverLatencies: Array<{
      server: typeof speedtestServers[0];
      latency: number;
    }> = [];

    for (const server of serversToTest) {
      try {
        // Extract hostname from URL (more reliable than host field)
        // host field may have ooklaserver.net domain which may not resolve
        let hostname = '';
        try {
          const urlObj = new URL(server.url);
          hostname = urlObj.hostname;
        } catch {
          // Fallback to host field, strip port
          hostname = (server.host || '').split(':')[0];
        }
        
        if (!hostname) {
          BenchmarkService.markLatencyFailed(server.id);
          continue;
        }
        
        const pingResult = await exec(`ping -c 1 -W 1 ${hostname} 2>/dev/null | grep 'time=' | sed 's/.*time=\\([0-9.]*\\).*/\\1/'`);
        const latency = parseFloat(pingResult.trim());
        if (!isNaN(latency) && latency > 0) {
          serverLatencies.push({ server, latency });
        } else {
          // Ping failed - mark latency failure
          BenchmarkService.markLatencyFailed(server.id);
        }
      } catch {
        // Ping exception - mark latency failure  
        BenchmarkService.markLatencyFailed(server.id);
      }
    }
    
    console.log(`[Benchmark] Got latency for ${serverLatencies.length} servers out of ${serversToTest.length} tested`);

    onProgress?.({ phase: 'network', message: 'Running speed tests on multi-region servers...', percent: 82 });

    // Group servers by geographic region based on their search region
    const regionGroups: { [region: string]: typeof serverLatencies } = {
      'Vietnam': [],
      'Southeast Asia': [],
      'East Asia': [],
      'South Asia': [],
      'Oceania': [],
      'Europe': [],
      'North America': [],
      'South America': [],
      'Africa': [],
      'Middle East': [],
      'Russia': [],
    };
    
    // Map search regions to geographic groups
    const regionMapping: { [key: string]: string } = {
      'Hanoi': 'Vietnam', 'Ho Chi Minh': 'Vietnam', 'Da Nang': 'Vietnam',
      'Singapore': 'Southeast Asia', 'Bangkok': 'Southeast Asia', 'Jakarta': 'Southeast Asia',
      'Kuala Lumpur': 'Southeast Asia', 'Manila': 'Southeast Asia', 'Phnom Penh': 'Southeast Asia', 'Yangon': 'Southeast Asia',
      'Tokyo': 'East Asia', 'Hong Kong': 'East Asia', 'Seoul': 'East Asia', 'Taipei': 'East Asia',
      'Beijing': 'East Asia', 'Shanghai': 'East Asia', 'Shenzhen': 'East Asia',
      'Mumbai': 'South Asia', 'Delhi': 'South Asia', 'Bangalore': 'South Asia',
      'Sydney': 'Oceania', 'Melbourne': 'Oceania', 'Auckland': 'Oceania', 'Brisbane': 'Oceania',
      'London': 'Europe', 'Frankfurt': 'Europe', 'Paris': 'Europe', 'Amsterdam': 'Europe',
      'Stockholm': 'Europe', 'Madrid': 'Europe', 'Milan': 'Europe',
      'Los Angeles': 'North America', 'New York': 'North America', 'Chicago': 'North America',
      'Toronto': 'North America', 'Vancouver': 'North America', 'Miami': 'North America',
      'Seattle': 'North America', 'Dallas': 'North America',
      'Sao Paulo': 'South America', 'Buenos Aires': 'South America', 'Santiago': 'South America',
      'Lima': 'South America', 'Bogota': 'South America',
      'Johannesburg': 'Africa', 'Cape Town': 'Africa', 'Lagos': 'Africa', 'Cairo': 'Africa', 'Nairobi': 'Africa',
      'Dubai': 'Middle East', 'Tel Aviv': 'Middle East', 'Riyadh': 'Middle East',
      'Moscow': 'Russia', 'Saint Petersburg': 'Russia', 'Almaty': 'Russia',
    };
    
    // Sort all servers by latency first
    serverLatencies.sort((a, b) => a.latency - b.latency);
    
    // Group servers into regions
    for (const entry of serverLatencies) {
      const geoRegion = regionMapping[entry.server.region] || 'Other';
      if (regionGroups[geoRegion]) {
        regionGroups[geoRegion].push(entry);
      }
    }
    
    // Select servers: 1-2 best from each region (sorted by latency within region)
    const selectedServers: typeof serverLatencies = [];
    const seenCountries = new Set<string>();
    
    // Priority order: nearby regions first, then far regions
    const regionOrder = [
      'Vietnam', 'Southeast Asia', 'East Asia', 'South Asia', 'Oceania',
      'Europe', 'North America', 'South America', 'Africa', 'Middle East', 'Russia'
    ];
    
    for (const region of regionOrder) {
      const regionServers = regionGroups[region] || [];
      let addedFromRegion = 0;
      
      for (const entry of regionServers) {
        // Add up to 2 servers per region (prefer different countries)
        if (addedFromRegion < 2 && !seenCountries.has(entry.server.country)) {
          selectedServers.push(entry);
          seenCountries.add(entry.server.country);
          addedFromRegion++;
        }
        if (addedFromRegion >= 2) break;
      }
    }
    
    // If we still need more, add any remaining servers
    if (selectedServers.length < 15) {
      for (const entry of serverLatencies) {
        if (!selectedServers.includes(entry) && selectedServers.length < 20) {
          selectedServers.push(entry);
        }
      }
    }

    console.log(`[Benchmark] Selected ${selectedServers.length} servers for testing:`, 
      selectedServers.map(s => `${s.server.sponsor} (${s.server.country})`).join(', '));

    // Test download/upload on selected servers
    for (const { server, latency } of selectedServers) {
      try {
        // Build download URL - Speedtest uses /download?size=xxx or /random4000x4000.jpg
        const baseUrl = server.url.replace(/\/upload.*$/, '');
        const downloadUrl = `${baseUrl}/random4000x4000.jpg`;
        
        // Download test (4000x4000 ~= 30MB image)
        const downloadResult = await exec(
          `curl -o /dev/null -w '%{speed_download}' -s --connect-timeout 5 --max-time 15 '${downloadUrl}' 2>/dev/null`
        );
        const downloadBps = parseFloat(downloadResult.trim());
        
        // If download failed, mark server as failed
        if (isNaN(downloadBps) || downloadBps === 0) {
          BenchmarkService.markServerFailed(server.id);
          continue;
        }
        
        const downloadMbps = (downloadBps * 8 / 1000000).toFixed(0);

        // Upload test (POST data to upload.php)
        let uploadMbps = 'N/A';
        try {
          const uploadUrl = server.url; // Already ends with /upload.php
          // Generate random data and upload using multipart form
          // Speedtest upload uses form data with content0, content1, etc.
          const uploadResult = await exec(
            `dd if=/dev/urandom bs=256K count=4 2>/dev/null | curl -o /dev/null -w '%{speed_upload}' -s --connect-timeout 5 --max-time 15 -X POST -F "content0=<-" '${uploadUrl}' 2>/dev/null`
          );
          const uploadBps = parseFloat(uploadResult.trim());
          if (!isNaN(uploadBps) && uploadBps > 0) {
            uploadMbps = `${(uploadBps * 8 / 1000000).toFixed(0)} Mbps`;
          }
        } catch {}

        // Update last tested time
        server.lastTested = Date.now();

        tests.push({
          server: server.sponsor || server.name,
          location: `${server.name}, ${server.country}`,
          download: `${downloadMbps} Mbps`,
          upload: uploadMbps,
          latency: `${latency.toFixed(2)} ms`
        });
      } catch {
        // Mark server as failed
        BenchmarkService.markServerFailed(server.id);
      }
    }
    
    // Save updated cache with test results
    if (BenchmarkService.serverCache) {
      BenchmarkService.saveCache(BenchmarkService.serverCache);
    }

    return { tests, provider, publicIp, location };
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
