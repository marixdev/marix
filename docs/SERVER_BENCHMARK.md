# Server Benchmark

Test and measure your server's performance directly from the SSH terminal with comprehensive system, disk, and network benchmarks.

## Overview

The Server Benchmark feature provides a complete performance analysis of your remote server, including:

- **System Information**: Hardware and software details
- **Disk Performance**: Sequential read/write speeds, I/O latency, and random IOPS
- **Network Speed**: Multi-region speed tests with download, upload, and latency measurements

## How to Use

### Starting a Benchmark

1. Connect to a server via SSH
2. Click the **📊 Benchmark** button in the terminal footer
3. (Optional) Check **"Upload to paste.dev"** to share results online
4. Click **Start Benchmark**

### Benchmark Phases

The benchmark runs in 4 phases:

| Phase | Description | Duration |
|-------|-------------|----------|
| 1. System Info | Collects OS, CPU, RAM, disk info | ~2 seconds |
| 2. Disk Test | Runs dd, ioping, and fio tests | ~45 seconds |
| 3. Network Test | Tests speed to 18 global regions | ~3-5 minutes |
| 4. Complete | Shows results and export options | - |

## Benchmark Details

### System Information

Collected data includes:

| Field | Description |
|-------|-------------|
| OS | Operating system name and version |
| Kernel | Linux kernel version |
| Architecture | CPU architecture (x86_64, arm64, etc.) |
| Hostname | Server hostname |
| CPU Model | Processor name and specifications |
| CPU Cores | Number of CPU cores |
| CPU Frequency | Current CPU frequency |
| Memory | Used / Total RAM |
| Swap | Used / Total swap space |
| Disk | Used / Total disk space |
| Uptime | Server uptime |
| Load Average | 1/5/15 minute load averages |
| Virtualization | VM type (KVM, VMware, OpenVZ, etc.) |

### Disk Performance

#### Sequential Write/Read (dd)

- **Method**: `dd if=/dev/zero of=test bs=64k count=16k conv=fdatasync`
- **Runs**: 3 times, averaged for accuracy
- **Test Location**: Home directory (not /tmp to avoid tmpfs)
- **Measures**: Sequential throughput in MB/s or GB/s

#### I/O Latency (ioping)

- **Method**: `ioping -c 10 -q /`
- **Measures**: Disk I/O response time in microseconds
- **Target**: Root filesystem for real disk latency

#### Random 4K IOPS (fio)

- **Method**: fio with 4K random read/write, 64 queue depth
- **Runtime**: 30 seconds
- **Measures**: 
  - Read IOPS
  - Write IOPS
  - Read Bandwidth
  - Write Bandwidth

> **Note**: If `fio` or `ioping` are not installed, the benchmark will attempt to install them automatically.

### Network Speed

Tests are performed against Speedtest.net servers in 18 global regions:

| Region | Locations |
|--------|-----------|
| Asia | Singapore, Tokyo, Hong Kong, Seoul, Mumbai |
| Europe | London, Frankfurt, Paris, Amsterdam |
| Americas | Los Angeles, New York, Chicago, Toronto, São Paulo |
| Oceania | Sydney, Auckland |
| Middle East/Africa | Dubai, Johannesburg |

For each server, the benchmark measures:
- **Download Speed**: MB/s or Gbps
- **Upload Speed**: MB/s or Gbps
- **Latency**: Round-trip time in milliseconds

## Export Options

After the benchmark completes, you can export results in multiple formats:

### 🌐 HTML

Standalone HTML file with styled layout. Features:
- Dark theme design
- Responsive layout
- All benchmark data in cards
- Footer with marix.dev and GitHub links

### 📋 JSON

Structured JSON data with:
- Complete benchmark results
- Timestamps
- Meta object with website and GitHub links
- Machine-readable format for automation

### 🖼️ PNG

High-resolution image screenshot:
- 2x scale for retina displays
- RGB colors (html2canvas compatible)
- All sections included
- Footer with branding

### 📄 TXT

ASCII art formatted text file:
- Box-drawing characters for tables
- Copy-paste friendly
- Terminal-style output
- Footer with links

## paste.dev Integration

Share your benchmark results online with one click:

### How It Works

1. Check **"Upload to paste.dev"** before starting benchmark
2. Run the benchmark
3. After completion, results are automatically uploaded
4. A shareable link appears with **Copy** and **Open** buttons

### Features

- **Automatic Upload**: TXT format uploaded when benchmark completes
- **Copy Link**: Click 📋 Copy to copy URL to clipboard
- **Open Link**: Click 🔗 Open to view in browser
- **Public Sharing**: Anyone with the link can view results

### API Details

- **Endpoint**: `https://api.paste.ee/v1/pastes`
- **Format**: Plain text with syntax highlighting
- **Links**: Returns `paste.dev/p/{id}` URLs

## Requirements

### Server Requirements

| Tool | Purpose | Auto-Install |
|------|---------|--------------|
| `dd` | Disk write/read speed | Usually pre-installed |
| `ioping` | I/O latency measurement | ✅ Yes |
| `fio` | Random IOPS testing | ✅ Yes |
| `curl` | Network speed tests | Usually pre-installed |

### Supported Package Managers

Auto-installation works with:
- **apt** (Debian, Ubuntu)
- **yum** (CentOS, RHEL)
- **dnf** (Fedora)
- **pacman** (Arch Linux)
- **apk** (Alpine Linux)
- **zypper** (openSUSE)

## Troubleshooting

### Disk Test Shows Unrealistic Speeds (5+ GB/s)

**Cause**: `/tmp` is mounted as tmpfs (RAM disk)

**Solution**: The benchmark automatically detects this and uses the home directory instead.

### Network Test Takes Too Long

**Cause**: Some regions may be slow or unreachable

**Solution**: The benchmark tests multiple regions. Slow regions will timeout after 30 seconds.

### "Permission Denied" Installing Tools

**Cause**: User doesn't have sudo access

**Solution**: Ask your server administrator to install `fio` and `ioping`:

```bash
# Debian/Ubuntu
sudo apt install fio ioping

# CentOS/RHEL
sudo yum install fio ioping

# Fedora
sudo dnf install fio ioping
```

### PNG Export Error "oklch"

**Cause**: html2canvas doesn't support oklch color format

**Solution**: Fixed in v1.0.19. PNG now uses RGB hex colors.

## Example Output

### TXT Format Sample

```
════════════════════════════════════════════════════════════
  MARIX SERVER BENCHMARK - my-server.com
  1/29/2026, 10:30:45 AM
════════════════════════════════════════════════════════════

┌────────────────────────────────────────────────────────────┐
│                    SYSTEM INFORMATION                      │
└────────────────────────────────────────────────────────────┘
  OS            : Ubuntu 22.04.3 LTS
  CPU           : AMD EPYC 7B13 64-Core Processor
  CPU Cores     : 4
  Memory        : 2.1 GB / 8.0 GB (26%)
  Disk          : 45 GB / 160 GB (28%)
  Virtualization: KVM

┌────────────────────────────────────────────────────────────┐
│                    DISK PERFORMANCE                        │
└────────────────────────────────────────────────────────────┘
  Sequential Write : 580 MB/s
  Sequential Read  : 1.2 GB/s
  I/O Latency      : 227 µs

  Random 4K IOPS (fio):
    Read IOPS   : 45,230
    Write IOPS  : 15,076
    Read BW     : 176.7 MB/s
    Write BW    : 58.9 MB/s

┌────────────────────────────────────────────────────────────┐
│                    NETWORK SPEED                           │
└────────────────────────────────────────────────────────────┘
  Singapore    : ↓ 892 Mbps  ↑ 456 Mbps  (12ms)
  Tokyo        : ↓ 756 Mbps  ↑ 389 Mbps  (45ms)
  Frankfurt    : ↓ 234 Mbps  ↑ 178 Mbps  (156ms)
  ...

────────────────────────────────────────────────────────────
  marix.dev | https://github.com/marixdev/marix
  Generated by Marix SSH Client v1.0.19
────────────────────────────────────────────────────────────
```

## Security Notes

- Benchmark runs commands on the remote server via SSH
- No data is sent to external servers except Speedtest.net (for speed tests)
- paste.dev uploads are optional and user-initiated
- Temporary test files are automatically cleaned up after benchmark

## Related Features

