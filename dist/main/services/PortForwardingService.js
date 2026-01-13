"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.portForwardingService = exports.PortForwardingService = void 0;
const ssh2_1 = require("ssh2");
const net = __importStar(require("net"));
const events_1 = require("events");
class PortForwardingService {
    constructor() {
        this.tunnels = new Map();
        this.eventEmitter = new events_1.EventEmitter();
    }
    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }
    off(event, listener) {
        this.eventEmitter.off(event, listener);
    }
    emit(event, ...args) {
        this.eventEmitter.emit(event, ...args);
    }
    /**
     * Create a local port forward (-L)
     * Listens on local port and forwards to remote host through SSH
     */
    async createLocalForward(config) {
        if (this.tunnels.has(config.id)) {
            throw new Error('Tunnel with this ID already exists');
        }
        const tunnel = {
            config: { ...config, status: 'connecting', bytesIn: 0, bytesOut: 0, connections: 0 },
            client: new ssh2_1.Client(),
            activeConnections: new Set(),
            emitter: new events_1.EventEmitter()
        };
        this.tunnels.set(config.id, tunnel);
        this.emit('status', tunnel.config);
        return new Promise((resolve, reject) => {
            const connectConfig = {
                host: config.sshHost,
                port: config.sshPort,
                username: config.sshUsername,
                password: config.sshPassword,
                privateKey: config.sshPrivateKey,
                readyTimeout: 30000,
                keepaliveInterval: 10000,
            };
            tunnel.client.on('ready', () => {
                console.log(`[PortForward] SSH connected for tunnel ${config.id}`);
                // Create local TCP server
                tunnel.server = net.createServer((socket) => {
                    tunnel.activeConnections.add(socket);
                    tunnel.config.connections = tunnel.activeConnections.size;
                    this.emit('status', tunnel.config);
                    // Forward connection through SSH tunnel
                    tunnel.client.forwardOut(socket.remoteAddress || '127.0.0.1', socket.remotePort || 0, config.remoteHost, config.remotePort, (err, stream) => {
                        if (err) {
                            console.error(`[PortForward] Forward error:`, err.message);
                            socket.end();
                            return;
                        }
                        // Pipe data bidirectionally
                        socket.pipe(stream);
                        stream.pipe(socket);
                        // Track bytes
                        socket.on('data', (data) => {
                            tunnel.config.bytesOut = (tunnel.config.bytesOut || 0) + data.length;
                        });
                        stream.on('data', (data) => {
                            tunnel.config.bytesIn = (tunnel.config.bytesIn || 0) + data.length;
                        });
                        const cleanup = () => {
                            tunnel.activeConnections.delete(socket);
                            tunnel.config.connections = tunnel.activeConnections.size;
                            this.emit('status', tunnel.config);
                        };
                        socket.on('close', cleanup);
                        socket.on('error', cleanup);
                        stream.on('close', () => socket.end());
                        stream.on('error', () => socket.end());
                    });
                });
                tunnel.server.listen(config.localPort, config.localHost, () => {
                    console.log(`[PortForward] Local forward listening on ${config.localHost}:${config.localPort}`);
                    tunnel.config.status = 'connected';
                    this.emit('status', tunnel.config);
                    resolve();
                });
                tunnel.server.on('error', (err) => {
                    console.error(`[PortForward] Server error:`, err.message);
                    tunnel.config.status = 'error';
                    tunnel.config.error = err.message;
                    this.emit('status', tunnel.config);
                });
            });
            tunnel.client.on('error', (err) => {
                console.error(`[PortForward] SSH error:`, err.message);
                tunnel.config.status = 'error';
                tunnel.config.error = err.message;
                this.emit('status', tunnel.config);
                this.tunnels.delete(config.id);
                reject(err);
            });
            tunnel.client.on('close', () => {
                console.log(`[PortForward] SSH connection closed for ${config.id}`);
                if (tunnel.config.status === 'connected') {
                    tunnel.config.status = 'disconnected';
                    this.emit('status', tunnel.config);
                }
            });
            try {
                tunnel.client.connect(connectConfig);
            }
            catch (err) {
                tunnel.config.status = 'error';
                tunnel.config.error = err.message;
                this.emit('status', tunnel.config);
                this.tunnels.delete(config.id);
                reject(err);
            }
        });
    }
    /**
     * Create a remote port forward (-R)
     * SSH server listens on remote port and forwards to local host
     */
    async createRemoteForward(config) {
        if (this.tunnels.has(config.id)) {
            throw new Error('Tunnel with this ID already exists');
        }
        const tunnel = {
            config: { ...config, status: 'connecting', bytesIn: 0, bytesOut: 0, connections: 0 },
            client: new ssh2_1.Client(),
            activeConnections: new Set(),
            emitter: new events_1.EventEmitter()
        };
        this.tunnels.set(config.id, tunnel);
        this.emit('status', tunnel.config);
        return new Promise((resolve, reject) => {
            const connectConfig = {
                host: config.sshHost,
                port: config.sshPort,
                username: config.sshUsername,
                password: config.sshPassword,
                privateKey: config.sshPrivateKey,
                readyTimeout: 30000,
                keepaliveInterval: 10000,
            };
            tunnel.client.on('ready', () => {
                console.log(`[PortForward] SSH connected for remote tunnel ${config.id}`);
                // Request remote port forwarding
                tunnel.client.forwardIn(config.remoteHost, config.remotePort, (err) => {
                    if (err) {
                        console.error(`[PortForward] Remote forward error:`, err.message);
                        tunnel.config.status = 'error';
                        tunnel.config.error = err.message;
                        this.emit('status', tunnel.config);
                        reject(err);
                        return;
                    }
                    console.log(`[PortForward] Remote forward active on ${config.remoteHost}:${config.remotePort}`);
                    tunnel.config.status = 'connected';
                    this.emit('status', tunnel.config);
                    resolve();
                });
            });
            // Handle incoming TCP connections from remote forward
            tunnel.client.on('tcp connection', (details, accept, reject) => {
                console.log(`[PortForward] Incoming connection from ${details.srcIP}:${details.srcPort}`);
                const stream = accept();
                tunnel.config.connections = (tunnel.config.connections || 0) + 1;
                this.emit('status', tunnel.config);
                // Connect to local target
                const localSocket = net.connect(config.localPort, config.localHost, () => {
                    // Pipe data bidirectionally
                    stream.pipe(localSocket);
                    localSocket.pipe(stream);
                    stream.on('data', (data) => {
                        tunnel.config.bytesIn = (tunnel.config.bytesIn || 0) + data.length;
                    });
                    localSocket.on('data', (data) => {
                        tunnel.config.bytesOut = (tunnel.config.bytesOut || 0) + data.length;
                    });
                });
                localSocket.on('error', (err) => {
                    console.error(`[PortForward] Local connection error:`, err.message);
                    stream.end();
                });
                stream.on('close', () => {
                    localSocket.end();
                    tunnel.config.connections = Math.max(0, (tunnel.config.connections || 1) - 1);
                    this.emit('status', tunnel.config);
                });
            });
            tunnel.client.on('error', (err) => {
                console.error(`[PortForward] SSH error:`, err.message);
                tunnel.config.status = 'error';
                tunnel.config.error = err.message;
                this.emit('status', tunnel.config);
                this.tunnels.delete(config.id);
                reject(err);
            });
            tunnel.client.on('close', () => {
                console.log(`[PortForward] SSH connection closed for ${config.id}`);
                if (tunnel.config.status === 'connected') {
                    tunnel.config.status = 'disconnected';
                    this.emit('status', tunnel.config);
                }
            });
            try {
                tunnel.client.connect(connectConfig);
            }
            catch (err) {
                tunnel.config.status = 'error';
                tunnel.config.error = err.message;
                this.emit('status', tunnel.config);
                this.tunnels.delete(config.id);
                reject(err);
            }
        });
    }
    /**
     * Create a dynamic SOCKS proxy (-D)
     */
    async createDynamicForward(config) {
        if (this.tunnels.has(config.id)) {
            throw new Error('Tunnel with this ID already exists');
        }
        const tunnel = {
            config: { ...config, status: 'connecting', bytesIn: 0, bytesOut: 0, connections: 0 },
            client: new ssh2_1.Client(),
            activeConnections: new Set(),
            emitter: new events_1.EventEmitter()
        };
        this.tunnels.set(config.id, tunnel);
        this.emit('status', tunnel.config);
        return new Promise((resolve, reject) => {
            const connectConfig = {
                host: config.sshHost,
                port: config.sshPort,
                username: config.sshUsername,
                password: config.sshPassword,
                privateKey: config.sshPrivateKey,
                readyTimeout: 30000,
                keepaliveInterval: 10000,
            };
            tunnel.client.on('ready', () => {
                console.log(`[PortForward] SSH connected for SOCKS proxy ${config.id}`);
                // Create SOCKS5 proxy server
                tunnel.server = net.createServer((socket) => {
                    tunnel.activeConnections.add(socket);
                    tunnel.config.connections = tunnel.activeConnections.size;
                    this.emit('status', tunnel.config);
                    let connected = false;
                    socket.once('data', (rawData) => {
                        const data = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData);
                        // SOCKS5 greeting
                        if (data[0] !== 0x05) {
                            socket.end();
                            return;
                        }
                        // No auth required
                        socket.write(Buffer.from([0x05, 0x00]));
                        socket.once('data', (rawData2) => {
                            const data2 = Buffer.isBuffer(rawData2) ? rawData2 : Buffer.from(rawData2);
                            if (data2[0] !== 0x05 || data2[1] !== 0x01) {
                                socket.write(Buffer.from([0x05, 0x07])); // Command not supported
                                socket.end();
                                return;
                            }
                            let targetHost;
                            let targetPort;
                            let addrLen;
                            // Parse address type
                            switch (data2[3]) {
                                case 0x01: // IPv4
                                    targetHost = `${data2[4]}.${data2[5]}.${data2[6]}.${data2[7]}`;
                                    targetPort = data2.readUInt16BE(8);
                                    break;
                                case 0x03: // Domain
                                    addrLen = data2[4];
                                    targetHost = data2.slice(5, 5 + addrLen).toString();
                                    targetPort = data2.readUInt16BE(5 + addrLen);
                                    break;
                                case 0x04: // IPv6
                                    const ipv6Bytes = data2.slice(4, 20);
                                    const parts = [];
                                    for (let i = 0; i < 16; i += 2) {
                                        parts.push(ipv6Bytes.readUInt16BE(i).toString(16));
                                    }
                                    targetHost = parts.join(':');
                                    targetPort = data2.readUInt16BE(20);
                                    break;
                                default:
                                    socket.write(Buffer.from([0x05, 0x08])); // Address type not supported
                                    socket.end();
                                    return;
                            }
                            // Forward through SSH
                            tunnel.client.forwardOut(socket.remoteAddress || '127.0.0.1', socket.remotePort || 0, targetHost, targetPort, (err, stream) => {
                                if (err) {
                                    socket.write(Buffer.from([0x05, 0x01])); // General failure
                                    socket.end();
                                    return;
                                }
                                // Success response
                                socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
                                connected = true;
                                // Pipe data
                                socket.pipe(stream);
                                stream.pipe(socket);
                                socket.on('data', (d) => {
                                    tunnel.config.bytesOut = (tunnel.config.bytesOut || 0) + d.length;
                                });
                                stream.on('data', (d) => {
                                    tunnel.config.bytesIn = (tunnel.config.bytesIn || 0) + d.length;
                                });
                                const cleanup = () => {
                                    tunnel.activeConnections.delete(socket);
                                    tunnel.config.connections = tunnel.activeConnections.size;
                                    this.emit('status', tunnel.config);
                                };
                                socket.on('close', cleanup);
                                stream.on('close', () => socket.end());
                            });
                        });
                    });
                    socket.on('error', () => {
                        tunnel.activeConnections.delete(socket);
                        tunnel.config.connections = tunnel.activeConnections.size;
                        this.emit('status', tunnel.config);
                    });
                });
                tunnel.server.listen(config.localPort, config.localHost, () => {
                    console.log(`[PortForward] SOCKS5 proxy listening on ${config.localHost}:${config.localPort}`);
                    tunnel.config.status = 'connected';
                    this.emit('status', tunnel.config);
                    resolve();
                });
                tunnel.server.on('error', (err) => {
                    console.error(`[PortForward] SOCKS server error:`, err.message);
                    tunnel.config.status = 'error';
                    tunnel.config.error = err.message;
                    this.emit('status', tunnel.config);
                });
            });
            tunnel.client.on('error', (err) => {
                console.error(`[PortForward] SSH error:`, err.message);
                tunnel.config.status = 'error';
                tunnel.config.error = err.message;
                this.emit('status', tunnel.config);
                this.tunnels.delete(config.id);
                reject(err);
            });
            tunnel.client.on('close', () => {
                if (tunnel.config.status === 'connected') {
                    tunnel.config.status = 'disconnected';
                    this.emit('status', tunnel.config);
                }
            });
            try {
                tunnel.client.connect(connectConfig);
            }
            catch (err) {
                tunnel.config.status = 'error';
                tunnel.config.error = err.message;
                this.emit('status', tunnel.config);
                this.tunnels.delete(config.id);
                reject(err);
            }
        });
    }
    /**
     * Stop a tunnel
     */
    async stopTunnel(tunnelId) {
        const tunnel = this.tunnels.get(tunnelId);
        if (!tunnel)
            return;
        // Close all active connections
        for (const socket of tunnel.activeConnections) {
            socket.destroy();
        }
        tunnel.activeConnections.clear();
        // Close local server
        if (tunnel.server) {
            tunnel.server.close();
        }
        // Close SSH connection
        tunnel.client.end();
        tunnel.config.status = 'disconnected';
        tunnel.config.connections = 0;
        this.emit('status', tunnel.config);
        this.tunnels.delete(tunnelId);
    }
    /**
     * Get tunnel status
     */
    getTunnel(tunnelId) {
        return this.tunnels.get(tunnelId)?.config;
    }
    /**
     * Get all tunnels
     */
    getAllTunnels() {
        return Array.from(this.tunnels.values()).map(t => t.config);
    }
    /**
     * Close all tunnels
     */
    closeAll() {
        for (const [id] of this.tunnels) {
            this.stopTunnel(id);
        }
    }
}
exports.PortForwardingService = PortForwardingService;
exports.portForwardingService = new PortForwardingService();
//# sourceMappingURL=PortForwardingService.js.map