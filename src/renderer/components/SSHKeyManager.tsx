import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { useLanguage } from '../contexts/LanguageContext';

interface SSHKeyInfo {
  id: string;
  name: string;
  type: string;
  fingerprint: string;
  publicKey: string;
  createdAt: string;
  comment?: string;
}

interface Props {
  onClose: () => void;
  onSelectKey?: (keyId: string, privateKey: string) => void;
  selectMode?: boolean;
  inline?: boolean;
  appTheme?: 'dark' | 'light';
}

const SSHKeyManager: React.FC<Props> = ({ onClose, onSelectKey, selectMode = false, inline = false, appTheme = 'dark' }) => {
  const { t } = useLanguage();
  const [keys, setKeys] = useState<SSHKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Generate form
  const [genName, setGenName] = useState('');
  const [genType, setGenType] = useState<'ed25519' | 'rsa' | 'ecdsa'>('ed25519');
  const [genPassphrase, setGenPassphrase] = useState('');
  const [genComment, setGenComment] = useState('');
  
  // Import form
  const [impName, setImpName] = useState('');
  const [impPrivateKey, setImpPrivateKey] = useState('');
  const [impComment, setImpComment] = useState('');
  
  // Selected key for viewing
  const [selectedKey, setSelectedKey] = useState<SSHKeyInfo | null>(null);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [selectedPrivateKey, setSelectedPrivateKey] = useState<string>('');
  const [keyPassphrase, setKeyPassphrase] = useState<string | null>(null);
  
  // Export dropdown
  const [exportDropdownKey, setExportDropdownKey] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const keysList = await ipcRenderer.invoke('sshkey:list');
      setKeys(keysList || []);
    } catch (err) {
      console.error('Failed to load SSH keys:', err);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!genName.trim()) {
      alert(t('pleaseEnterKeyName'));
      return;
    }
    
    setGenerating(true);
    try {
      const result = await ipcRenderer.invoke('sshkey:generate', genName, genType, 4096, genPassphrase || undefined, genComment || undefined);
      if (result.success) {
        await loadKeys();
        setShowGenerate(false);
        setGenName('');
        setGenPassphrase('');
        setGenComment('');
      } else {
        alert(result.error || t('failedToGenerateKey'));
      }
    } catch (err: any) {
      alert(err.message);
    }
    setGenerating(false);
  };

  const handleImport = async () => {
    if (!impName.trim() || !impPrivateKey.trim()) {
      alert(t('pleaseEnterKeyNameAndPrivateKey'));
      return;
    }
    
    setImporting(true);
    try {
      const result = await ipcRenderer.invoke('sshkey:import', impName, impPrivateKey, impComment || undefined);
      if (result.success) {
        await loadKeys();
        setShowImport(false);
        setImpName('');
        setImpPrivateKey('');
        setImpComment('');
      } else {
        alert(result.error || t('failedToImportKey'));
      }
    } catch (err: any) {
      alert(err.message);
    }
    setImporting(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('confirmDeleteKey').replace('{name}', name))) return;
    
    try {
      await ipcRenderer.invoke('sshkey:delete', id);
      await loadKeys();
      if (selectedKey?.id === id) setSelectedKey(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportKey = async (key: SSHKeyInfo, includePrivate: boolean) => {
    try {
      const result = await ipcRenderer.invoke('sshkey:exportToFile', key.id, key.name, includePrivate);
      if (result.success) {
        if (includePrivate) {
          alert(t('keyExportedSuccessfully').replace('{path}', result.path));
        } else {
          alert(t('publicKeyExportedSuccessfully').replace('{path}', result.path));
        }
      } else if (!result.canceled) {
        alert(result.error || t('failedToExportKey'));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSelectFile = async () => {
    try {
      const result = await ipcRenderer.invoke('sshkey:selectFile');
      if (result.success) {
        setImpPrivateKey(result.content);
        // Auto-fill name from filename if name is empty
        if (!impName && result.fileName) {
          const nameWithoutExt = result.fileName.replace(/\.(pem|key|ppk)$/i, '');
          setImpName(nameWithoutExt);
        }
      } else if (!result.canceled && result.error) {
        alert(result.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSelect = async (key: SSHKeyInfo) => {
    if (selectMode && onSelectKey) {
      const privateKey = await ipcRenderer.invoke('sshkey:getPrivate', key.id);
      if (privateKey) {
        onSelectKey(key.id, privateKey);
      }
    } else {
      // Clear previous state first
      setSelectedPrivateKey('');
      setKeyPassphrase(null);
      setSelectedKey(key);
      
      // Load private key
      const privateKey = await ipcRenderer.invoke('sshkey:getPrivate', key.id);
      console.log('[SSHKeyManager] Loaded private key for', key.name, ':', privateKey ? 'success' : 'failed');
      setSelectedPrivateKey(privateKey || '');
      
      // Check if key has passphrase by looking for encryption header
      if (privateKey) {
        const hasPassphrase = privateKey.includes('ENCRYPTED') || privateKey.includes('Proc-Type: 4,ENCRYPTED');
        setKeyPassphrase(hasPassphrase ? '***' : null);
      } else {
        setKeyPassphrase(null);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(t('copiedToClipboard'));
  };

  // Inline mode renders without modal wrapper
  if (inline) {
    return (
      <div className={`h-full overflow-auto p-6 ${appTheme === 'light' ? 'bg-gray-50' : ''}`}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${appTheme === 'light' ? 'bg-teal-100' : 'bg-teal-600/20'}`}>
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h1 className={`text-xl font-bold ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {t('sshKeyManager')}
              </h1>
              <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('manageYourSSHKeys')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`rounded-xl p-4 mb-6 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => { setShowGenerate(true); setShowImport(false); setSelectedKey(null); }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition text-xs sm:text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('generateKey')}
              </button>
              <button
                onClick={() => { setShowImport(true); setShowGenerate(false); setSelectedKey(null); }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${appTheme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-navy-700 text-white hover:bg-navy-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t('importKey')}
              </button>
              <div className={`ml-auto px-3 py-2 rounded-lg text-xs sm:text-sm ${appTheme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-navy-900 text-gray-400'}`}>
                {keys.length} {keys.length === 1 ? t('key') : t('keys')}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Keys List */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : keys.length === 0 && !showGenerate && !showImport ? (
                <div className={`text-center py-16 rounded-xl ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
                  <svg className={`w-16 h-16 mx-auto mb-4 ${appTheme === 'light' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <p className={`text-lg font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    {t('noSSHKeysYet')}
                  </p>
                  <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {t('generateOrImportKey')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keys.map(key => (
                    <div
                      key={key.id}
                      onClick={() => { handleSelect(key); setShowGenerate(false); setShowImport(false); }}
                      className={`rounded-xl p-4 cursor-pointer transition group ${
                        selectedKey?.id === key.id
                          ? appTheme === 'light' 
                            ? 'bg-teal-50 border-2 border-teal-500' 
                            : 'bg-teal-600/20 border-2 border-teal-500'
                          : appTheme === 'light'
                            ? 'bg-white border border-gray-200 hover:border-teal-300 shadow-sm'
                            : 'bg-navy-800 border border-navy-700 hover:border-teal-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            key.type === 'ed25519' ? 'bg-purple-500/20 text-purple-400' :
                            key.type === 'ecdsa' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </div>
                          <div>
                            <p className={`font-medium ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                              {key.name}
                            </p>
                            <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                              {key.type.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Export dropdown */}
                          <div className="relative">
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setExportDropdownKey(exportDropdownKey === key.id ? null : key.id);
                              }}
                              className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition ${appTheme === 'light' ? 'text-teal-600 hover:bg-teal-50' : 'text-teal-400 hover:bg-teal-600/20'}`}
                              title={t('exportKey')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            {exportDropdownKey === key.id && (
                              <div 
                                className={`absolute right-0 top-8 w-48 rounded-lg shadow-xl z-50 py-1 ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-700 border border-navy-600'}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => { handleExportKey(key, false); setExportDropdownKey(null); }}
                                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-200 hover:bg-navy-600'}`}
                                >
                                  <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  {t('exportPublicKeyOnly')}
                                </button>
                                <button
                                  onClick={() => { handleExportKey(key, true); setExportDropdownKey(null); }}
                                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${appTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-200 hover:bg-navy-600'}`}
                                >
                                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                  {t('exportBothKeys')}
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Delete button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(key.id, key.name); }}
                            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition ${appTheme === 'light' ? 'text-red-500 hover:bg-red-50' : 'text-red-400 hover:bg-red-600/20'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                        <p className={`text-xs font-mono truncate ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} title={key.fingerprint}>
                          {key.fingerprint}
                        </p>
                      </div>
                      <p className={`text-xs mt-2 ${appTheme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t('createdAt')} {new Date(key.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            {(showGenerate || showImport || selectedKey) && (
              <div className={`w-full lg:w-96 flex-shrink-0 rounded-xl p-4 sm:p-5 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
                {showGenerate ? (
                  <div>
                    <h3 className={`text-lg font-semibold mb-4 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('generateNewKey')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('keyName')} *</label>
                        <input
                          type="text"
                          value={genName}
                          onChange={(e) => setGenName(e.target.value)}
                          placeholder="My SSH Key"
                          className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('keyType')}</label>
                        <select
                          value={genType}
                          onChange={(e) => setGenType(e.target.value as any)}
                          className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-700' : 'bg-navy-900 border border-navy-600 text-white'}`}
                        >
                          <option value="ed25519">Ed25519 ({t('recommended')})</option>
                          <option value="ecdsa">ECDSA</option>
                          <option value="rsa">RSA (4096 bits)</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('passphrase')} ({t('optional')})</label>
                        <input
                          type="password"
                          value={genPassphrase}
                          onChange={(e) => setGenPassphrase(e.target.value)}
                          placeholder={t('leaveEmptyForNoPassphrase')}
                          className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('comment')} ({t('optional')})</label>
                        <input
                          type="text"
                          value={genComment}
                          onChange={(e) => setGenComment(e.target.value)}
                          placeholder="user@hostname"
                          className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setShowGenerate(false)}
                          className={`flex-1 px-4 py-2 rounded-lg transition ${appTheme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-navy-700 text-gray-300 hover:bg-navy-600'}`}
                        >
                          {t('cancel')}
                        </button>
                        <button
                          onClick={handleGenerate}
                          disabled={generating}
                          className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition disabled:opacity-50"
                        >
                          {generating ? t('generating') : t('generate')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : showImport ? (
                  <div>
                    <h3 className={`text-lg font-semibold mb-4 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{t('importExistingKey')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('keyName')} *</label>
                        <input
                          type="text"
                          value={impName}
                          onChange={(e) => setImpName(e.target.value)}
                          placeholder="My Imported Key"
                          className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('privateKey')} *</label>
                        <textarea
                          value={impPrivateKey}
                          onChange={(e) => setImpPrivateKey(e.target.value)}
                          placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                          rows={6}
                          className={`w-full px-3 py-2 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                        />
                        <button
                          type="button"
                          onClick={handleSelectFile}
                          className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${appTheme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-navy-700 text-gray-300 hover:bg-navy-600'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          {t('browseFile')}
                        </button>
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('comment')} ({t('optional')})</label>
                        <input
                          type="text"
                          value={impComment}
                          onChange={(e) => setImpComment(e.target.value)}
                          placeholder="user@hostname"
                          className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setShowImport(false)}
                          className={`flex-1 px-4 py-2 rounded-lg transition ${appTheme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-navy-700 text-gray-300 hover:bg-navy-600'}`}
                        >
                          {t('cancel')}
                        </button>
                        <button
                          onClick={handleImport}
                          disabled={importing}
                          className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition disabled:opacity-50"
                        >
                          {importing ? t('importing') : t('import')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : selectedKey ? (
                  <div>
                    <h3 className={`text-lg font-semibold mb-4 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{selectedKey.name}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('keyType')}</label>
                        <p className={appTheme === 'light' ? 'text-gray-900' : 'text-white'}>{selectedKey.type.toUpperCase()}</p>
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('fingerprint')}</label>
                        <p className="text-amber-500 font-mono text-sm break-all">{selectedKey.fingerprint}</p>
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('createdAt')}</label>
                        <p className={appTheme === 'light' ? 'text-gray-900' : 'text-white'}>{new Date(selectedKey.createdAt).toLocaleString()}</p>
                      </div>
                      {keyPassphrase && (
                        <div>
                          <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('passphrase')}</label>
                          <p className="text-purple-600 font-mono text-sm">{keyPassphrase}</p>
                          <p className={`text-xs mt-1 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t('keyIsProtectedWithPassphrase')}</p>
                        </div>
                      )}
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('publicKey')}</label>
                        <div className="relative">
                          <textarea
                            readOnly
                            value={selectedKey.publicKey}
                            rows={4}
                            className={`w-full px-3 py-2 rounded-lg font-mono text-xs focus:outline-none ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                          />
                          <button
                            onClick={() => copyToClipboard(selectedKey.publicKey)}
                            className={`absolute top-2 right-2 p-1.5 rounded transition ${appTheme === 'light' ? 'bg-gray-200 text-gray-600 hover:text-gray-900' : 'bg-navy-700 text-gray-400 hover:text-white'}`}
                            title={t('copyToClipboard')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('privateKey')}</label>
                        <div className="relative">
                          <textarea
                            readOnly
                            value={selectedPrivateKey}
                            rows={8}
                            className={`w-full px-3 py-2 rounded-lg font-mono text-xs focus:outline-none ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                          />
                          <button
                            onClick={() => copyToClipboard(selectedPrivateKey)}
                            className={`absolute top-2 right-2 p-1.5 rounded transition ${appTheme === 'light' ? 'bg-gray-200 text-gray-600 hover:text-gray-900' : 'bg-navy-700 text-gray-400 hover:text-white'}`}
                            title={t('copyToClipboard')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className={`text-xs ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t('copyPublicKeyToServer')}</p>
                      
                      {/* Export buttons */}
                      <div className="pt-2 border-t border-gray-200 dark:border-navy-700">
                        <label className={`block text-sm mb-2 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t('exportKey')}</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleExportKey(selectedKey, false)}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition ${appTheme === 'light' ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200' : 'bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 border border-teal-600/30'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {t('publicKeyOnly')}
                          </button>
                          <button
                            onClick={() => handleExportKey(selectedKey, true)}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition ${appTheme === 'light' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            {t('bothKeys')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Modal mode (original behavior)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-navy-800 border border-navy-600 rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-navy-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t('sshKeyManager')}</h2>
              <p className="text-sm text-gray-400">{selectMode ? t('selectKeyToUse') : t('manageYourSSHKeys')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Key list */}
          <div className="w-1/2 border-r border-navy-700 flex flex-col">
            {/* Actions */}
            <div className="p-3 flex gap-2 border-b border-navy-700">
              <button
                onClick={() => { setShowGenerate(true); setShowImport(false); }}
                className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-500 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('generateKey')}
              </button>
              <button
                onClick={() => { setShowImport(true); setShowGenerate(false); }}
                className="flex-1 px-3 py-2 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-600 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t('importKey')}
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <p>{t('noSSHKeysYet')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {keys.map(key => (
                    <div
                      key={key.id}
                      onClick={() => handleSelect(key)}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        selectedKey?.id === key.id
                          ? 'bg-teal-600/20 border border-teal-600'
                          : 'bg-navy-900 hover:bg-navy-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            key.type === 'ed25519' ? 'bg-purple-600/20 text-purple-400' :
                            key.type === 'ecdsa' ? 'bg-blue-600/20 text-blue-400' :
                            'bg-amber-600/20 text-amber-400'
                          }`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-white font-medium">{key.name}</p>
                            <p className="text-xs text-gray-400">{key.type.toUpperCase()}</p>
                          </div>
                        </div>
                        {selectMode ? (
                          <button className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-500 transition">
                            {t('select')}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(key.id, key.name); }}
                            className="p-1.5 text-red-400 hover:bg-red-600/20 rounded transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-2 truncate">{key.fingerprint}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          <div className="w-1/2 p-4 overflow-y-auto">
            {showGenerate ? (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">{t('generateNewKey')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('keyName')} *</label>
                    <input
                      type="text"
                      value={genName}
                      onChange={(e) => setGenName(e.target.value)}
                      placeholder="My SSH Key"
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('keyType')}</label>
                    <select
                      value={genType}
                      onChange={(e) => setGenType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="ed25519">Ed25519 ({t('recommended')})</option>
                      <option value="ecdsa">ECDSA</option>
                      <option value="rsa">RSA (4096 bits)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('passphrase')} ({t('optional')})</label>
                    <input
                      type="password"
                      value={genPassphrase}
                      onChange={(e) => setGenPassphrase(e.target.value)}
                      placeholder={t('leaveEmptyForNoPassphrase')}
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('comment')} ({t('optional')})</label>
                    <input
                      type="text"
                      value={genComment}
                      onChange={(e) => setGenComment(e.target.value)}
                      placeholder="user@hostname"
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowGenerate(false)}
                      className="flex-1 px-4 py-2 bg-navy-700 text-gray-300 rounded-lg hover:bg-navy-600 transition"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition disabled:opacity-50"
                    >
                      {generating ? t('generating') : t('generate')}
                    </button>
                  </div>
                </div>
              </div>
            ) : showImport ? (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">{t('importExistingKey')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('keyName')} *</label>
                    <input
                      type="text"
                      value={impName}
                      onChange={(e) => setImpName(e.target.value)}
                      placeholder="My Imported Key"
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('privateKey')} *</label>
                    <textarea
                      value={impPrivateKey}
                      onChange={(e) => setImpPrivateKey(e.target.value)}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                      rows={8}
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleSelectFile}
                      className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-navy-700 text-gray-300 rounded-lg hover:bg-navy-600 transition text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {t('browseFile')}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('comment')} ({t('optional')})</label>
                    <input
                      type="text"
                      value={impComment}
                      onChange={(e) => setImpComment(e.target.value)}
                      placeholder="user@hostname"
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowImport(false)}
                      className="flex-1 px-4 py-2 bg-navy-700 text-gray-300 rounded-lg hover:bg-navy-600 transition"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition disabled:opacity-50"
                    >
                      {importing ? t('importing') : t('import')}
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedKey ? (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">{selectedKey.name}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('keyType')}</label>
                    <p className="text-white">{selectedKey.type.toUpperCase()}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('fingerprint')}</label>
                    <p className="text-amber-400 font-mono text-sm break-all">{selectedKey.fingerprint}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('createdAt')}</label>
                    <p className="text-white">{new Date(selectedKey.createdAt).toLocaleString()}</p>
                  </div>
                  {keyPassphrase && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">{t('passphrase')}</label>
                      <p className="text-purple-400 font-mono text-sm">{keyPassphrase}</p>
                      <p className="text-xs text-gray-500 mt-1">{t('keyIsProtectedWithPassphrase')}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('publicKey')}</label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={selectedKey.publicKey}
                        rows={4}
                        className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white font-mono text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(selectedKey.publicKey)}
                        className="absolute top-2 right-2 p-1.5 bg-navy-700 text-gray-400 hover:text-white rounded transition"
                        title={t('copyToClipboard')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('privateKey')}</label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={selectedPrivateKey}
                        rows={8}
                        className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white font-mono text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(selectedPrivateKey)}
                        className="absolute top-2 right-2 p-1.5 bg-navy-700 text-gray-400 hover:text-white rounded transition"
                        title={t('copyToClipboard')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{t('copyPublicKeyToServer')}</p>
                  
                  {/* Export buttons */}
                  <div className="pt-3 border-t border-navy-700">
                    <label className="block text-sm text-gray-400 mb-2">{t('exportKey')}</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportKey(selectedKey, false)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 border border-teal-600/30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('publicKeyOnly')}
                      </button>
                      <button
                        onClick={() => handleExportKey(selectedKey, true)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        {t('bothKeys')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <p>{t('selectKeyToViewDetails')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SSHKeyManager;
