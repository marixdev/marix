import React, { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { useLanguage } from '../contexts/LanguageContext';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  protocol?: 'ssh' | 'ftp' | 'ftps' | 'rdp' | 'wss' | 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite';
}

interface PortForward {
  id: string;
  name: string;
  type: 'local' | 'remote' | 'dynamic';
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  serverId: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: string;
  bytesIn?: number;
  bytesOut?: number;
  connections?: number;
}

interface Props {
  appTheme: 'dark' | 'light';
  servers: Server[];
}

const PortForwardingPage: React.FC<Props> = ({ appTheme, servers }) => {
  const { t } = useLanguage();
  const [forwards, setForwards] = useState<PortForward[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'local' as 'local' | 'remote' | 'dynamic',
    localHost: '127.0.0.1',
    localPort: 8080,
    remoteHost: '127.0.0.1',
    remotePort: 80,
    serverId: ''
  });

  // Load saved forwards
  useEffect(() => {
    const saved = localStorage.getItem('port_forwards');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForwards(parsed.map((f: PortForward) => ({ ...f, status: 'disconnected' })));
      } catch (e) {
        console.error('Failed to load port forwards:', e);
      }
    }
  }, []);

  // Save forwards
  const saveForwards = useCallback((newForwards: PortForward[]) => {
    const toSave = newForwards.map(({ id, name, type, localHost, localPort, remoteHost, remotePort, serverId }) => 
      ({ id, name, type, localHost, localPort, remoteHost, remotePort, serverId }));
    localStorage.setItem('port_forwards', JSON.stringify(toSave));
  }, []);

  // Listen for status updates
  useEffect(() => {
    const handleStatus = (_event: any, config: any) => {
      setForwards(prev => prev.map(f => 
        f.id === config.id 
          ? { ...f, status: config.status, error: config.error, bytesIn: config.bytesIn, bytesOut: config.bytesOut, connections: config.connections }
          : f
      ));
    };

    ipcRenderer.on('portforward:status', handleStatus);
    return () => {
      ipcRenderer.removeListener('portforward:status', handleStatus);
    };
  }, []);

  // Start forward
  const handleStart = async (forward: PortForward) => {
    const server = servers.find(s => s.id === forward.serverId);
    if (!server) {
      alert(t('serverNotFound') || 'Server not found');
      return;
    }

    setForwards(prev => prev.map(f => f.id === forward.id ? { ...f, status: 'connecting' } : f));

    try {
      await ipcRenderer.invoke('portforward:create', {
        id: forward.id,
        name: forward.name,
        type: forward.type,
        localHost: forward.localHost,
        localPort: forward.localPort,
        remoteHost: forward.remoteHost,
        remotePort: forward.remotePort,
        sshHost: server.host,
        sshPort: server.port,
        sshUsername: server.username,
        sshPassword: server.password,
        sshPrivateKey: server.privateKey
      });
    } catch (err: any) {
      setForwards(prev => prev.map(f => 
        f.id === forward.id ? { ...f, status: 'error', error: err.message } : f
      ));
    }
  };

  // Stop forward
  const handleStop = async (forward: PortForward) => {
    try {
      await ipcRenderer.invoke('portforward:stop', forward.id);
      setForwards(prev => prev.map(f => 
        f.id === forward.id ? { ...f, status: 'disconnected', connections: 0 } : f
      ));
    } catch (err: any) {
      console.error('Failed to stop forward:', err);
    }
  };

  // Add new forward
  const handleAdd = () => {
    if (!formData.serverId) {
      alert(t('selectServer') || 'Please select a server');
      return;
    }

    const newForward: PortForward = {
      id: Date.now().toString(),
      name: formData.name || `Forward ${forwards.length + 1}`,
      type: formData.type,
      localHost: formData.localHost,
      localPort: formData.localPort,
      remoteHost: formData.remoteHost,
      remotePort: formData.remotePort,
      serverId: formData.serverId,
      status: 'disconnected'
    };

    const newForwards = [...forwards, newForward];
    setForwards(newForwards);
    saveForwards(newForwards);
    resetForm();
    setShowAddForm(false);
  };

  // Update forward
  const handleUpdate = () => {
    if (!editingId) return;

    const newForwards = forwards.map(f => 
      f.id === editingId 
        ? { ...f, ...formData, name: formData.name || f.name }
        : f
    );
    setForwards(newForwards);
    saveForwards(newForwards);
    resetForm();
    setEditingId(null);
  };

  // Delete forward
  const handleDelete = async (forward: PortForward) => {
    if (!confirm(t('confirmDelete') || 'Are you sure you want to delete this port forward?')) return;
    
    if (forward.status === 'connected') {
      await handleStop(forward);
    }
    
    const newForwards = forwards.filter(f => f.id !== forward.id);
    setForwards(newForwards);
    saveForwards(newForwards);
  };

  // Edit forward
  const handleEdit = (forward: PortForward) => {
    if (forward.status === 'connected') {
      alert(t('stopBeforeEdit') || 'Please stop the forward before editing');
      return;
    }
    setFormData({
      name: forward.name,
      type: forward.type,
      localHost: forward.localHost,
      localPort: forward.localPort,
      remoteHost: forward.remoteHost,
      remotePort: forward.remotePort,
      serverId: forward.serverId
    });
    setEditingId(forward.id);
    setShowAddForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'local',
      localHost: '127.0.0.1',
      localPort: 8080,
      remoteHost: '127.0.0.1',
      remotePort: 80,
      serverId: ''
    });
  };

  // Format bytes
  const formatBytes = (bytes: number = 0): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  // Get type label
  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'local': return t('localForward') || 'Local (-L)';
      case 'remote': return t('remoteForward') || 'Remote (-R)';
      case 'dynamic': return t('dynamicForward') || 'Dynamic SOCKS (-D)';
      default: return type;
    }
  };

  // Get type color
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'local': return 'bg-blue-500';
      case 'remote': return 'bg-green-500';
      case 'dynamic': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return appTheme === 'light' ? 'text-gray-500' : 'text-gray-400';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h1 className={`text-xl font-bold ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {t('portForwarding') || 'Port Forwarding'}
              </h1>
              <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('portForwardingDescription') || 'SSH tunnel port forwarding (Local, Remote, Dynamic SOCKS)'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => { resetForm(); setEditingId(null); setShowAddForm(!showAddForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 !text-white rounded-lg font-medium transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('add') || 'Add'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className={`rounded-xl p-6 mb-6 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
            <h3 className={`text-lg font-medium mb-4 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {editingId ? (t('editPortForward') || 'Edit Port Forward') : (t('addPortForward') || 'Add Port Forward')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t('name') || 'Name'}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('forwardNamePlaceholder') || 'e.g., MySQL Tunnel'}
                  className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                />
              </div>

              {/* Type */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t('type') || 'Type'}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                >
                  <option value="local">{t('localForward') || 'Local Forward (-L)'}</option>
                  <option value="remote">{t('remoteForward') || 'Remote Forward (-R)'}</option>
                  <option value="dynamic">{t('dynamicForward') || 'Dynamic SOCKS (-D)'}</option>
                </select>
              </div>

              {/* Server */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t('sshServer') || 'SSH Server'}
                </label>
                <select
                  value={formData.serverId}
                  onChange={(e) => setFormData({ ...formData, serverId: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                >
                  <option value="">{t('selectServer') || '-- Select Server --'}</option>
                  {servers.filter(s => s.protocol === 'ssh' || !s.protocol).map(server => (
                    <option key={server.id} value={server.id}>
                      {server.name} ({server.host}:{server.port})
                    </option>
                  ))}
                </select>
              </div>

              {/* Local Host */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t('localHost') || 'Local Host'}
                </label>
                <input
                  type="text"
                  value={formData.localHost}
                  onChange={(e) => setFormData({ ...formData, localHost: e.target.value })}
                  placeholder="127.0.0.1"
                  className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                />
              </div>

              {/* Local Port */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t('localPort') || 'Local Port'}
                </label>
                <input
                  type="number"
                  value={formData.localPort}
                  onChange={(e) => setFormData({ ...formData, localPort: parseInt(e.target.value) || 0 })}
                  placeholder="8080"
                  className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                />
              </div>

              {/* Remote fields - not shown for dynamic */}
              {formData.type !== 'dynamic' && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                      {t('remoteHost') || 'Remote Host'}
                    </label>
                    <input
                      type="text"
                      value={formData.remoteHost}
                      onChange={(e) => setFormData({ ...formData, remoteHost: e.target.value })}
                      placeholder="127.0.0.1"
                      className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                      {t('remotePort') || 'Remote Port'}
                    </label>
                    <input
                      type="number"
                      value={formData.remotePort}
                      onChange={(e) => setFormData({ ...formData, remotePort: parseInt(e.target.value) || 0 })}
                      placeholder="80"
                      className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Type explanation */}
            <div className={`p-3 rounded-lg mb-4 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-navy-900 border border-navy-800'}`}>
              <p className={`text-sm ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                {formData.type === 'local' && (t('localForwardDesc') || 'Local Forward: Access remote services through local port. E.g., connect to remote MySQL at 127.0.0.1:3306')}
                {formData.type === 'remote' && (t('remoteForwardDesc') || 'Remote Forward: Expose local service to remote server. E.g., let remote server access your local web app')}
                {formData.type === 'dynamic' && (t('dynamicForwardDesc') || 'Dynamic SOCKS: Create a SOCKS5 proxy through SSH. Route traffic through the SSH server')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                disabled={!formData.serverId}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? (t('update') || 'Update') : (t('add') || 'Add')}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }}
                className={`px-6 py-2.5 rounded-lg font-medium transition ${appTheme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-navy-700 text-gray-300 hover:bg-navy-600'}`}
              >
                {t('cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Forwards List */}
        {forwards.length === 0 ? (
          <div className={`rounded-xl p-12 text-center ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
            <svg className={`w-16 h-16 mx-auto mb-4 ${appTheme === 'light' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <h3 className={`text-lg font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              {t('noPortForwards') || 'No port forwards configured'}
            </h3>
            <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
              {t('addPortForwardDesc') || 'Create SSH tunnels to securely forward ports'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {forwards.map((forward) => {
              const server = servers.find(s => s.id === forward.serverId);
              
              return (
                <div
                  key={forward.id}
                  className={`rounded-xl p-4 transition ${appTheme === 'light' ? 'bg-white border border-gray-200 hover:border-cyan-300 shadow-sm' : 'bg-navy-800 border border-navy-700 hover:border-cyan-500'}`}
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Info */}
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <div className={`w-3 h-3 rounded-full ${forward.status === 'connected' ? 'bg-green-500 animate-pulse' : forward.status === 'connecting' ? 'bg-yellow-500 animate-pulse' : forward.status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
                      
                      {/* Type badge */}
                      <span className={`px-2 py-1 text-xs font-medium text-white rounded ${getTypeColor(forward.type)}`}>
                        {getTypeLabel(forward.type)}
                      </span>
                      
                      {/* Name & Details */}
                      <div>
                        <p className={`font-medium ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                          {forward.name}
                        </p>
                        <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {forward.type === 'dynamic' 
                            ? `SOCKS5 @ ${forward.localHost}:${forward.localPort}`
                            : forward.type === 'local'
                              ? `${forward.localHost}:${forward.localPort} → ${forward.remoteHost}:${forward.remotePort}`
                              : `${forward.remoteHost}:${forward.remotePort} → ${forward.localHost}:${forward.localPort}`
                          }
                          {server && ` via ${server.name}`}
                        </p>
                      </div>
                    </div>

                    {/* Right: Stats & Actions */}
                    <div className="flex items-center gap-4">
                      {/* Stats */}
                      {forward.status === 'connected' && (
                        <div className={`flex items-center gap-4 text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            {formatBytes(forward.bytesIn)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            {formatBytes(forward.bytesOut)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {forward.connections || 0}
                          </span>
                        </div>
                      )}

                      {/* Error */}
                      {forward.status === 'error' && forward.error && (
                        <span className="text-sm text-red-500 max-w-xs truncate" title={forward.error}>
                          {forward.error}
                        </span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {forward.status === 'connected' || forward.status === 'connecting' ? (
                          <button
                            onClick={() => handleStop(forward)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg transition"
                            title={t('stop') || 'Stop'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStart(forward)}
                            disabled={!server}
                            className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-lg transition disabled:opacity-50"
                            title={t('start') || 'Start'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleEdit(forward)}
                          disabled={forward.status === 'connected'}
                          className={`p-2 rounded-lg transition ${appTheme === 'light' ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-navy-700 text-gray-400'} disabled:opacity-50`}
                          title={t('edit') || 'Edit'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleDelete(forward)}
                          className={`p-2 rounded-lg transition ${appTheme === 'light' ? 'hover:bg-red-50 text-red-500' : 'hover:bg-red-500/20 text-red-400'}`}
                          title={t('delete') || 'Delete'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <div className={`mt-6 p-4 rounded-xl ${appTheme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-navy-900 border border-navy-800'}`}>
          <h4 className={`text-sm font-medium mb-3 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            {t('portForwardingHelp') || 'Port Forwarding Types'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className={`font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Local (-L):</span>
              <p className={appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}>
                {t('localForwardHelp') || 'Forward local port to remote destination through SSH server'}
              </p>
            </div>
            <div>
              <span className={`font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Remote (-R):</span>
              <p className={appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}>
                {t('remoteForwardHelp') || 'Forward remote port on SSH server to local destination'}
              </p>
            </div>
            <div>
              <span className={`font-medium ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Dynamic (-D):</span>
              <p className={appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}>
                {t('dynamicForwardHelp') || 'Create SOCKS5 proxy for dynamic port forwarding'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortForwardingPage;
