import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { Server } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import PortKnockingGuideModal from './PortKnockingGuideModal';

interface SSHKeyInfo {
  id: string;
  name: string;
  type: string;
  fingerprint: string;
}

interface Props {
  server?: Server | null;  // If provided, we're editing
  existingTags?: string[];  // All existing tags for autocomplete
  onSave: (data: any) => void;
  onClose: () => void;
}

const AddServerModal: React.FC<Props> = ({ server, existingTags = [], onSave, onClose }) => {
  const isEditing = !!server;
  const { t } = useLanguage();
  
  const [data, setData] = useState({
    id: '',
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    icon: 'linux',
    protocol: 'ssh' as 'ssh' | 'ftp' | 'ftps' | 'rdp' | 'wss' | 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite',
    authType: 'password' as 'password' | 'key',
    privateKey: '',
    passphrase: '',
    domain: '',  // Windows domain for RDP
    wssUrl: '',  // Full WebSocket URL for WSS
    tags: [] as string[],  // Tags for organizing servers
    sshKeyId: '',  // Selected SSH key from Keychain
    knockEnabled: false,  // Port knocking enabled
    knockSequence: [] as number[],  // Port knocking sequence
    // Database-specific fields
    database: '',  // Database name
    sslEnabled: false,  // SSL for database
    mongoUri: '',  // MongoDB connection URI
    sqliteFile: '',  // SQLite file path
  });
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [sshKeys, setSSHKeys] = useState<SSHKeyInfo[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [knockInput, setKnockInput] = useState('');
  const [showKnockGuide, setShowKnockGuide] = useState(false);

  // Load SSH keys from Keychain
  useEffect(() => {
    const loadSSHKeys = async () => {
      setLoadingKeys(true);
      try {
        const keys = await ipcRenderer.invoke('sshkey:list');
        setSSHKeys(keys || []);
      } catch (err) {
        console.error('Failed to load SSH keys:', err);
      }
      setLoadingKeys(false);
    };
    loadSSHKeys();
  }, []);

  // Load server data when editing
  useEffect(() => {
    if (server) {
      setData({
        id: server.id,
        name: server.name,
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password || '',
        icon: server.icon || 'linux',
        protocol: server.protocol || 'ssh',
        authType: server.authType || 'password',
        privateKey: server.privateKey || '',
        passphrase: server.passphrase || '',
        domain: server.domain || '',
        wssUrl: server.wssUrl || '',
        tags: server.tags || [],
        sshKeyId: (server as any).sshKeyId || '',
        knockEnabled: server.knockEnabled || false,
        knockSequence: server.knockSequence || [],
        // Database-specific fields
        database: (server as any).database || '',
        sslEnabled: (server as any).sslEnabled || false,
        mongoUri: (server as any).mongoUri || '',
        sqliteFile: (server as any).sqliteFile || '',
      });
      
      // Set knock input string
      if (server.knockSequence && server.knockSequence.length > 0) {
        setKnockInput(server.knockSequence.join(', '));
      }
    }
  }, [server]);

  // Add tag
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !data.tags.includes(trimmedTag)) {
      setData(prev => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  // Filter suggestions
  const filteredSuggestions = existingTags.filter(
    tag => tag.toLowerCase().includes(tagInput.toLowerCase()) && !data.tags.includes(tag)
  );

  const handleProtocolChange = (protocol: 'ssh' | 'ftp' | 'ftps' | 'rdp' | 'wss' | 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite') => {
    let defaultPort = 22;
    let defaultIcon = data.icon;
    
    if (protocol === 'ftp') {
      defaultPort = 21;
      defaultIcon = 'ftp';
    } else if (protocol === 'ftps') {
      defaultPort = 990;
      defaultIcon = 'sftp';
    } else if (protocol === 'rdp') {
      defaultPort = 3389;
      defaultIcon = 'windows';
    } else if (protocol === 'wss') {
      defaultPort = 443;
      defaultIcon = 'wss';
    } else if (protocol === 'mysql') {
      defaultPort = 3306;
      defaultIcon = 'mysql';
    } else if (protocol === 'postgresql') {
      defaultPort = 5432;
      defaultIcon = 'postgresql';
    } else if (protocol === 'mongodb') {
      defaultPort = 27017;
      defaultIcon = 'mongodb';
    } else if (protocol === 'redis') {
      defaultPort = 6379;
      defaultIcon = 'redis';
    } else if (protocol === 'sqlite') {
      defaultPort = 0;
      defaultIcon = 'sqlite';
    } else if (data.icon === 'ftp' || data.icon === 'sftp' || data.icon === 'windows' || data.icon === 'wss' || data.icon === 'mysql' || data.icon === 'postgresql' || data.icon === 'mongodb' || data.icon === 'redis' || data.icon === 'sqlite') {
      // Reset to linux if switching to SSH
      defaultIcon = 'linux';
    }
    
    setData(prev => ({
      ...prev,
      protocol,
      port: defaultPort,
      icon: defaultIcon,
      authType: protocol !== 'ssh' ? 'password' : prev.authType,
    }));
  };

  const handleKeyFileSelect = async () => {
    try {
      const result = await ipcRenderer.invoke('sshkey:selectFile');
      
      if (result && result.success && result.content) {
        setData(prev => ({ ...prev, privateKey: result.content }));
      }
    } catch (err) {
      console.error('Failed to read key file:', err);
    }
  };

  // Handle RDP file import
  const handleRdpFileImport = async () => {
    try {
      const result = await ipcRenderer.invoke('dialog:openFile', {
        title: 'Import RDP File',
        filters: [
          { name: 'RDP Files', extensions: ['rdp'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      
      if (result && result.content) {
        // Parse RDP file content
        const lines = result.content.split('\n');
        let host = '';
        let port = 3389;
        let username = '';
        let domain = '';
        let name = '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('full address:s:')) {
            const addr = trimmed.replace('full address:s:', '');
            if (addr.includes(':')) {
              const parts = addr.split(':');
              host = parts[0];
              port = parseInt(parts[1]) || 3389;
            } else {
              host = addr;
            }
          } else if (trimmed.startsWith('username:s:')) {
            username = trimmed.replace('username:s:', '');
          } else if (trimmed.startsWith('domain:s:')) {
            domain = trimmed.replace('domain:s:', '');
          }
        }
        
        // Use filename as server name if available
        if (result.path) {
          const fileName = result.path.split('/').pop()?.replace('.rdp', '') || result.path.split('\\').pop()?.replace('.rdp', '');
          name = fileName || host;
        } else {
          name = host;
        }
        
        setData(prev => ({
          ...prev,
          name: name || prev.name,
          host: host || prev.host,
          port: port,
          username: username || prev.username,
          domain: domain || prev.domain,
          protocol: 'rdp',
          icon: 'windows',
        }));
      }
    } catch (err) {
      console.error('Failed to import RDP file:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // WSS only requires URL and name
    if (data.protocol === 'wss') {
      if (!data.wssUrl.trim()) {
        alert('WebSocket URL is required');
        return;
      }
      if (!data.name.trim()) {
        alert('Display name is required');
        return;
      }
      // Extract host from URL for storage
      try {
        const url = new URL(data.wssUrl);
        data.host = url.hostname;
        data.port = parseInt(url.port) || 443;
      } catch {
        // Keep empty if URL parsing fails
      }
      onSave(data);
      return;
    }
    
    if (!data.host.trim()) {
      alert('Host address is required');
      return;
    }
    
    if (!data.username.trim()) {
      alert('Username is required');
      return;
    }
    
    if (data.port < 1 || data.port > 65535) {
      alert('Port must be between 1 and 65535');
      return;
    }
    
    if (data.authType === 'key' && !data.privateKey.trim()) {
      alert('Private key is required');
      return;
    }
    
    // Validate port knocking sequence if enabled
    if (data.knockEnabled && data.protocol === 'ssh') {
      if (data.knockSequence.length < 3) {
        alert('Port knocking requires at least 3 ports in the sequence');
        return;
      }
    }
    
    // Auto-save private key to SSH Key Manager if it's not from keychain
    if (data.authType === 'key' && data.privateKey && !data.sshKeyId) {
      try {
        // Check if this key is already in the keychain by checking all keys
        const existingKeys = sshKeys;
        let keyAlreadyExists = false;
        
        for (const key of existingKeys) {
          const existingPrivateKey = await ipcRenderer.invoke('sshkey:getPrivate', key.id);
          if (existingPrivateKey && existingPrivateKey.trim() === data.privateKey.trim()) {
            keyAlreadyExists = true;
            data.sshKeyId = key.id; // Link to existing key
            break;
          }
        }
        
        // If key doesn't exist, import it
        if (!keyAlreadyExists) {
          const keyName = `${data.name || data.host}-key-${Date.now()}`;
          const result = await ipcRenderer.invoke('sshkey:import', keyName, data.privateKey, `Imported from ${data.name || data.host}`);
          
          if (result.success && result.key) {
            data.sshKeyId = result.key.id;
            console.log('[AddServerModal] Auto-saved private key to keychain:', result.key.id);
          }
        }
      } catch (err) {
        console.error('[AddServerModal] Failed to auto-save key:', err);
        // Continue anyway - key will still work for this server
      }
    }
    
    onSave(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 22 : value,
    }));
  };

  // Handle knock sequence input
  const handleKnockInputChange = (value: string) => {
    setKnockInput(value);
    
    // Parse comma or space separated ports
    const parts = value.split(/[,\s]+/).map(p => p.trim()).filter(p => p);
    const ports: number[] = [];
    
    for (const part of parts) {
      const port = parseInt(part, 10);
      if (!isNaN(port) && port >= 1 && port <= 65535) {
        ports.push(port);
      }
    }
    
    setData(prev => ({ ...prev, knockSequence: ports }));
  };

  // Generate random knock sequence
  const handleGenerateKnockSequence = async () => {
    try {
      const ports = await ipcRenderer.invoke('portknock:generateSequence', 4);
      setData(prev => ({ ...prev, knockSequence: ports }));
      setKnockInput(ports.join(', '));
    } catch (err) {
      console.error('Failed to generate knock sequence:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Slide-in Panel */}
      <div className="w-full max-w-md bg-navy-800 border-l border-navy-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-5 border-b border-navy-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{isEditing ? t('editServer') : t('addServer')}</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-navy-700 rounded-lg transition text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Protocol Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('protocol')}</label>
            <select
              value={data.protocol}
              onChange={(e) => handleProtocolChange(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition cursor-pointer"
            >
              <optgroup label="Remote Access">
                <option value="ssh">SSH (Secure Shell)</option>
                <option value="rdp">RDP (Windows Remote Desktop)</option>
                <option value="wss">WSS (WebSocket Secure)</option>
              </optgroup>
              <optgroup label="File Transfer">
                <option value="ftp">FTP (File Transfer Protocol)</option>
                <option value="ftps">FTPS (FTP over SSL/TLS)</option>
              </optgroup>
              <optgroup label="Databases">
                <option value="mysql">{t('dbMysql')}</option>
                <option value="postgresql">{t('dbPostgresql')}</option>
                <option value="mongodb">{t('dbMongodb')}</option>
                <option value="redis">{t('dbRedis')}</option>
                <option value="sqlite">{t('dbSqlite')}</option>
              </optgroup>
            </select>
          </div>

          {/* Import RDP file button */}
          {data.protocol === 'rdp' && (
            <button
              type="button"
              onClick={handleRdpFileImport}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t('importRdpFile')}
            </button>
          )}

          {/* WSS URL field - required for WSS */}
          {data.protocol === 'wss' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">WebSocket URL <span className="text-red-400">*</span></label>
              <input
                type="text"
                name="wssUrl"
                value={data.wssUrl}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition font-mono"
                placeholder="wss://1.2.3.4:1234/"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter the full WebSocket URL including protocol and port</p>
            </div>
          )}

          {/* MongoDB URI field */}
          {data.protocol === 'mongodb' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('dbMongoUri')} <span className="text-gray-500">({t('optional')})</span></label>
              <input
                type="text"
                name="mongoUri"
                value={data.mongoUri}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition font-mono"
                placeholder="mongodb://user:pass@host:port/database"
              />
              <p className="text-xs text-gray-500 mt-1">Use full URI or fill in host/port/credentials below</p>
            </div>
          )}

          {/* SQLite file field */}
          {data.protocol === 'sqlite' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('dbSqliteFile')} <span className="text-red-400">*</span></label>
              <input
                type="text"
                name="sqliteFile"
                value={data.sqliteFile}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition font-mono"
                placeholder="/path/to/database.db"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{data.protocol === 'wss' ? t('displayName') : t('hostName')}</label>
            <input
              type="text"
              name="name"
              value={data.name}
              onChange={handleChange}
              className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              placeholder="My Server"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('tags')}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {data.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-white transition"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition"
                placeholder="Type a tag and press Enter..."
              />
              {showTagSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-navy-800 border border-navy-600 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                  {filteredSuggestions.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onMouseDown={() => handleAddTag(tag)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-navy-700 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Press Enter to add a tag, or select from suggestions</p>
          </div>

          {/* Address & Port (not for WSS - WSS uses URL) */}
          {data.protocol !== 'wss' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('hostIp')}</label>
                <input
                  type="text"
                  name="host"
                  value={data.host}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  placeholder="192.168.1.100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('port')}</label>
                <input
                  type="number"
                  name="port"
                  value={data.port}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  required
                />
              </div>
            </div>
          )}

          {/* Port Knocking (SSH only) */}
          {data.protocol === 'ssh' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">{t('portKnocking')}</label>
                  <p className="text-xs text-gray-500 mt-1">{t('portKnockingDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, knockEnabled: !prev.knockEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    data.knockEnabled ? 'bg-teal-600' : 'bg-navy-700'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    data.knockEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              
              {data.knockEnabled && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={knockInput}
                      onChange={(e) => handleKnockInputChange(e.target.value)}
                      placeholder="7000, 8000, 9000, 10000"
                      className="flex-1 px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateKnockSequence}
                      className="px-3 py-2 bg-navy-700 hover:bg-navy-600 border border-navy-600 rounded-lg text-xs text-gray-300 hover:text-white transition flex items-center gap-1.5"
                      title={t('generateRandom')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {t('random')}
                    </button>
                  </div>
                  
                  {data.knockSequence.length > 0 && (
                    <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                      <p className="text-xs text-teal-400">
                        ✓ {t('knockSequence')}: {data.knockSequence.join(' → ')} ({data.knockSequence.length} {t('ports')})
                      </p>
                    </div>
                  )}
                  
                  {data.knockSequence.length < 3 && data.knockSequence.length > 0 && (
                    <p className="text-xs text-amber-400">⚠ {t('knockMinPorts')}</p>
                  )}
                  
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-400 leading-relaxed">
                      <strong>{t('knockServerSetup')}:</strong> {t('knockSetupDesc')} 
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setShowKnockGuide(true); }}
                        className="underline hover:text-blue-300 ml-1 transition-colors"
                      >
                        {t('learnMore')}
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Username (not for WSS) */}
          {data.protocol !== 'wss' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('username')}</label>
              <input
                type="text"
                name="username"
                value={data.username}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                placeholder="root"
              />
            </div>
          )}

          {/* Auth Type (SSH only) */}
          {data.protocol === 'ssh' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('authType')}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, authType: 'password' }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    data.authType === 'password'
                      ? 'bg-teal-600 text-white'
                      : 'bg-navy-900 text-gray-400 hover:text-white hover:bg-navy-700 border border-navy-600'
                  }`}
                >
                  {t('authPassword')}
                </button>
                <button
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, authType: 'key' }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    data.authType === 'key'
                      ? 'bg-teal-600 text-white'
                      : 'bg-navy-900 text-gray-400 hover:text-white hover:bg-navy-700 border border-navy-600'
                  }`}
                >
                  {t('authKey')}
                </button>
              </div>
            </div>
          )}

          {/* Password field (not for WSS) */}
          {(data.authType === 'password' || data.protocol !== 'ssh') && data.protocol !== 'wss' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('password')}</label>
              <input
                type="password"
                name="password"
                value={data.password}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Domain field (RDP only) */}
          {data.protocol === 'rdp' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('domain')} ({t('optional')})</label>
              <input
                type="text"
                name="domain"
                value={data.domain}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                placeholder="WORKGROUP or DOMAIN"
              />
            </div>
          )}

          {/* Database name field (for database protocols) */}
          {['mysql', 'postgresql', 'mongodb'].includes(data.protocol) && (
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('dbName')} <span className="text-gray-500">({t('optional')})</span></label>
              <input
                type="text"
                name="database"
                value={data.database}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                placeholder={data.protocol === 'mongodb' ? 'admin' : data.protocol === 'postgresql' ? 'postgres' : 'mysql'}
              />
            </div>
          )}

          {/* SSL toggle for database protocols */}
          {['mysql', 'postgresql', 'mongodb', 'redis'].includes(data.protocol) && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sslEnabled"
                checked={data.sslEnabled}
                onChange={(e) => setData(prev => ({ ...prev, sslEnabled: e.target.checked }))}
                className="w-4 h-4 rounded bg-navy-900 border-navy-600 text-teal-500 focus:ring-teal-500"
              />
              <label htmlFor="sslEnabled" className="text-sm text-gray-300">{t('dbSslEnabled')}</label>
            </div>
          )}

          {/* Private Key fields (SSH only) */}
          {data.protocol === 'ssh' && data.authType === 'key' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('privateKey')}</label>
                <div className="space-y-3">
                  {/* Keychain Dropdown */}
                  {sshKeys.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">{t('selectFromKeychain')}</p>
                      <select
                        value={data.sshKeyId}
                        onChange={async (e) => {
                          const keyId = e.target.value;
                          if (keyId) {
                            const privateKey = await ipcRenderer.invoke('sshkey:getPrivate', keyId);
                            if (privateKey) {
                              setData(prev => ({ ...prev, privateKey, sshKeyId: keyId }));
                            }
                          } else {
                            setData(prev => ({ ...prev, sshKeyId: '' }));
                          }
                        }}
                        className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition cursor-pointer"
                      >
                        <option value="">{t('selectKeyFromKeychain')}</option>
                        {sshKeys.map(key => (
                          <option key={key.id} value={key.id}>
                            {key.name} ({key.type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Divider */}
                  {sshKeys.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-navy-600"></div>
                      <span className="text-xs text-gray-500">{t('orSelectFile')}</span>
                      <div className="flex-1 h-px bg-navy-600"></div>
                    </div>
                  )}
                  
                  {/* File selection */}
                  <button
                    type="button"
                    onClick={() => {
                      setData(prev => ({ ...prev, sshKeyId: '' }));  // Clear keychain selection
                      handleKeyFileSelect();
                    }}
                    className="w-full py-2 px-3 bg-navy-900 border border-navy-600 rounded-lg text-sm text-gray-300 hover:text-white hover:border-teal-500 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {data.privateKey && !data.sshKeyId ? t('keyLoaded') + ' ✓' : t('selectKeyFile')}
                  </button>
                  
                  {/* Paste manually - always visible */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{t('orPasteManually')}</p>
                    <textarea
                      name="privateKey"
                      value={data.privateKey}
                      onChange={(e) => {
                        setData(prev => ({ ...prev, privateKey: e.target.value, sshKeyId: '' }));
                      }}
                      rows={4}
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition resize-none"
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('passphrase')} ({t('optional')})</label>
                <input
                  type="password"
                  name="passphrase"
                  value={data.passphrase}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  placeholder="Leave empty if key has no passphrase"
                />
              </div>
            </>
          )}
        </form>
        
        {/* Footer with main action */}
        <div className="p-5 border-t border-navy-700 bg-navy-800">
          <button
            type="submit"
            form="add-server-form"
            onClick={handleSubmit}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition shadow-sm flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isEditing ? t('update') : t('create')}
          </button>
        </div>
      </div>
      
      {/* Port Knocking Guide Modal */}
      {showKnockGuide && <PortKnockingGuideModal onClose={() => setShowKnockGuide(false)} />}
    </div>
  );
};

export default AddServerModal;
