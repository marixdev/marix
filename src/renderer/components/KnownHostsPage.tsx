import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useLanguage } from '../contexts/LanguageContext';

interface KnownHost {
  host: string;
  port: number;
  keyType: string;
  fingerprint: string;
  fullKey: string;
  addedAt: string;
}

interface Props {
  appTheme: 'dark' | 'light';
}

const KnownHostsPage: React.FC<Props> = ({ appTheme }) => {
  const { t } = useLanguage();
  const [hosts, setHosts] = useState<KnownHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKeyType, setFilterKeyType] = useState<string>('all');
  const [showImportInput, setShowImportInput] = useState(false);
  const [importHost, setImportHost] = useState('');
  const [importPort, setImportPort] = useState(22);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadHosts();
  }, []);

  const loadHosts = async () => {
    setLoading(true);
    try {
      const hostsList = await ipcRenderer.invoke('knownhosts:list');
      setHosts(hostsList || []);
    } catch (err) {
      console.error('Failed to load known hosts:', err);
    }
    setLoading(false);
  };

  const handleRemoveHost = async (host: string, port: number) => {
    if (!confirm(t('confirmRemoveHost').replace('{host}', `${host}:${port}`))) return;
    
    try {
      await ipcRenderer.invoke('knownhosts:remove', host, port);
      await loadHosts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleImportFromHost = async () => {
    if (!importHost.trim()) return;
    
    setImporting(true);
    try {
      const result = await ipcRenderer.invoke('knownhosts:check', importHost, importPort);
      if (result.status === 'new' || result.status === 'match') {
        await ipcRenderer.invoke('knownhosts:accept', importHost, importPort, result.keyType, result.fingerprint, result.fullKey);
        await loadHosts();
        setShowImportInput(false);
        setImportHost('');
        setImportPort(22);
      } else if (result.status === 'error') {
        alert(result.error || 'Failed to fetch host fingerprint');
      }
    } catch (err: any) {
      alert(err.message);
    }
    setImporting(false);
  };

  // Get unique key types for filter
  const keyTypes = Array.from(new Set(hosts.map(h => h.keyType)));

  // Filter hosts
  const filteredHosts = hosts.filter(host => {
    const matchesSearch = searchQuery === '' || 
      host.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      host.fingerprint.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterKeyType === 'all' || host.keyType === filterKeyType;
    return matchesSearch && matchesType;
  });

  const formatKeyType = (keyType: string) => {
    if (keyType.startsWith('ssh-')) return keyType.substring(4).toUpperCase();
    if (keyType.startsWith('ecdsa-')) return 'ECDSA';
    return keyType.toUpperCase();
  };

  const getKeyTypeColor = (keyType: string) => {
    if (keyType.includes('ed25519')) return 'bg-purple-500';
    if (keyType.includes('ecdsa')) return 'bg-blue-500';
    if (keyType.includes('rsa')) return 'bg-amber-500';
    return 'bg-gray-500';
  };

  return (
    <div className={`h-full overflow-auto p-6 ${appTheme === 'light' ? 'bg-gray-50' : ''}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${appTheme === 'light' ? 'bg-green-100' : 'bg-green-600/20'}`}>
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className={`text-xl font-bold ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {t('knownHosts')}
            </h1>
            <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('manageKnownHosts')}
            </p>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className={`rounded-xl p-4 mb-6 overflow-visible ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
          <div className="flex flex-wrap items-center gap-3 overflow-visible">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${appTheme === 'light' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchHostnameIpFingerprint')}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400' : 'bg-navy-900 border border-navy-600 text-white placeholder-gray-500'}`}
                />
              </div>
            </div>

            {/* Key Type Filter */}
            <select
              value={filterKeyType}
              onChange={(e) => setFilterKeyType(e.target.value)}
              className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-700' : 'bg-navy-900 border border-navy-600 text-white'}`}
            >
              <option value="all">{t('allKeyTypes')}</option>
              {keyTypes.map(type => (
                <option key={type} value={type}>{formatKeyType(type)}</option>
              ))}
            </select>

            {/* Host Count */}
            <div className={`px-3 py-2 rounded-lg text-sm ${appTheme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-navy-900 text-gray-400'}`}>
              {filteredHosts.length} {t('hostsCount').replace('{count}', filteredHosts.length.toString())}
            </div>

            {/* Import Button */}
            <div className="relative">
              <button
                onClick={() => setShowImportInput(!showImportInput)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 !text-white rounded-lg hover:bg-green-500 transition text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t('importFromHost')}
              </button>

              {/* Import Dropdown */}
              {showImportInput && (
                <div className={`absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg shadow-xl z-50 p-4 ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
                  <p className={`text-xs mb-3 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {t('importHostDesc')}
                  </p>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={importHost}
                      onChange={(e) => setImportHost(e.target.value)}
                      placeholder={t('importHostPlaceholder')}
                      className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                    />
                    <input
                      type="number"
                      value={importPort}
                      onChange={(e) => setImportPort(Number(e.target.value))}
                      min={1}
                      max={65535}
                      className={`w-16 px-2 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowImportInput(false)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm ${appTheme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-navy-700 text-gray-300 hover:bg-navy-600'}`}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={handleImportFromHost}
                      disabled={importing || !importHost.trim()}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500 disabled:opacity-50 transition"
                    >
                      {importing ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {t('importing')}
                        </span>
                      ) : t('import')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hosts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredHosts.length === 0 ? (
          <div className={`text-center py-16 rounded-xl ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
            <svg className={`w-16 h-16 mx-auto mb-4 ${appTheme === 'light' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className={`text-lg font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              {t('noKnownHosts')}
            </p>
            <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
              {searchQuery ? t('noHostsMatchSearch') : t('connectToServerToAddKnownHosts')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHosts.map((host, idx) => (
              <div
                key={`${host.host}:${host.port}`}
                className={`rounded-xl p-4 transition group ${appTheme === 'light' ? 'bg-white border border-gray-200 hover:border-green-300 shadow-sm' : 'bg-navy-800 border border-navy-700 hover:border-green-500'}`}
              >
                {/* Host Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${appTheme === 'light' ? 'bg-gray-100' : 'bg-navy-900'}`}>
                      <svg className={`w-5 h-5 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <p className={`font-medium ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        {host.host}
                      </p>
                      <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {host.host}:{host.port}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveHost(host.host, host.port)}
                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition ${appTheme === 'light' ? 'text-red-500 hover:bg-red-50' : 'text-red-400 hover:bg-red-600/20'}`}
                    title={t('removeHost')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Trusted Badge + Key Type */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-600 text-xs font-medium rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('trusted')}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full text-white ${getKeyTypeColor(host.keyType)}`}>
                    {formatKeyType(host.keyType)}
                  </span>
                </div>

                {/* Fingerprint */}
                <div className={`p-2 rounded-lg ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                  <p className={`text-xs font-mono truncate ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} title={host.fingerprint}>
                    {host.fingerprint}
                  </p>
                </div>

                {/* Added Date */}
                <p className={`text-xs mt-2 ${appTheme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Added {new Date(host.addedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnownHostsPage;
