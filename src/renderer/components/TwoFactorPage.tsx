import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface TOTPEntry {
  id: string;
  name: string;
  secret: string;
  code: string;
  valid: boolean;
}

interface Props {
  appTheme: 'dark' | 'light';
}

// Base32 decode function
function base32Decode(secret: string): Uint8Array | null {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanSecret = secret.toUpperCase().replace(/\s/g, '').replace(/=/g, '');
  
  if (cleanSecret.length === 0) return null;
  
  // Validate characters
  for (const char of cleanSecret) {
    if (!base32chars.includes(char)) return null;
  }
  
  let bits = '';
  for (const char of cleanSecret) {
    const val = base32chars.indexOf(char);
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  
  return new Uint8Array(bytes);
}

// Generate TOTP code
async function generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): Promise<string | null> {
  try {
    const secretBytes = base32Decode(secret);
    if (!secretBytes || secretBytes.length === 0) return null;
    
    const counter = Math.floor(Date.now() / 1000 / timeStep);
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(4, counter, false);
    
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, counterBuffer);
    const hash = new Uint8Array(signature);
    
    const offset = hash[hash.length - 1] & 0x0f;
    const code = (
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    ) % Math.pow(10, digits);
    
    return code.toString().padStart(digits, '0');
  } catch (error) {
    console.error('TOTP generation error:', error);
    return null;
  }
}

const TwoFactorPage: React.FC<Props> = ({ appTheme }) => {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<TOTPEntry[]>([]);
  const [secretInput, setSecretInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [remaining, setRemaining] = useState(30);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved entries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('totp_entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEntries(parsed.map((e: any) => ({ ...e, code: '', valid: true })));
      } catch (e) {
        console.error('Failed to load TOTP entries:', e);
      }
    }
  }, []);

  // Save entries to localStorage (without codes)
  const saveEntries = useCallback((newEntries: TOTPEntry[]) => {
    const toSave = newEntries.map(({ id, name, secret }) => ({ id, name, secret }));
    localStorage.setItem('totp_entries', JSON.stringify(toSave));
  }, []);

  // Refresh all codes
  const refreshCodes = useCallback(async () => {
    const updated = await Promise.all(
      entries.map(async (entry) => {
        const code = await generateTOTP(entry.secret);
        return { ...entry, code: code || '', valid: code !== null };
      })
    );
    setEntries(updated);
  }, [entries]);

  // Timer effect
  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const rem = 30 - (now % 30);
      setRemaining(rem);
      
      if (rem === 30) {
        refreshCodes();
      }
    };
    
    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshCodes]);

  // Initial code generation
  useEffect(() => {
    if (entries.length > 0 && entries.every(e => !e.code)) {
      refreshCodes();
    }
  }, [entries.length]);

  // Add new entry
  const handleAdd = async () => {
    const cleanSecret = secretInput.trim().replace(/\s/g, '');
    if (!cleanSecret) return;
    
    const code = await generateTOTP(cleanSecret);
    if (!code) {
      alert(t('invalidSecret') || 'Invalid secret key');
      return;
    }
    
    const newEntry: TOTPEntry = {
      id: Date.now().toString(),
      name: nameInput.trim() || `Account ${entries.length + 1}`,
      secret: cleanSecret,
      code,
      valid: true
    };
    
    const newEntries = [...entries, newEntry];
    setEntries(newEntries);
    saveEntries(newEntries);
    setSecretInput('');
    setNameInput('');
    setShowAddForm(false);
  };

  // Remove entry
  const handleRemove = (id: string) => {
    if (!confirm(t('confirmDelete') || 'Are you sure you want to delete this entry?')) return;
    const newEntries = entries.filter(e => e.id !== id);
    setEntries(newEntries);
    saveEntries(newEntries);
  };

  // Copy code
  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    // Visual feedback
    const btn = document.getElementById(`copy-btn-${id}`);
    if (btn) {
      btn.classList.add('bg-green-600');
      setTimeout(() => btn.classList.remove('bg-green-600'), 1000);
    }
  };

  // Edit entry name
  const handleEditSave = (id: string) => {
    const newEntries = entries.map(e => 
      e.id === id ? { ...e, name: editName.trim() || e.name } : e
    );
    setEntries(newEntries);
    saveEntries(newEntries);
    setEditingId(null);
    setEditName('');
  };

  // Bulk add from textarea
  const handleBulkAdd = async (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const newEntries: TOTPEntry[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Support format: name:secret or just secret
      let name = `Account ${entries.length + newEntries.length + 1}`;
      let secret = line;
      
      if (line.includes(':')) {
        const parts = line.split(':');
        name = parts[0].trim();
        secret = parts.slice(1).join(':').trim();
      }
      
      const cleanSecret = secret.replace(/\s/g, '');
      const code = await generateTOTP(cleanSecret);
      
      if (code) {
        newEntries.push({
          id: Date.now().toString() + i,
          name,
          secret: cleanSecret,
          code,
          valid: true
        });
      }
    }
    
    if (newEntries.length > 0) {
      const updated = [...entries, ...newEntries];
      setEntries(updated);
      saveEntries(updated);
    }
    
    setSecretInput('');
    setShowAddForm(false);
  };

  const progressPercent = (remaining / 30) * 100;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className={`max-w-4xl mx-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className={`text-xl font-bold ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {t('twoFactorAuth') || '2FA Authenticator'}
              </h1>
              <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('totpDescription') || 'Generate TOTP codes for two-factor authentication'}
              </p>
            </div>
          </div>
          
          {/* Timer */}
          <div className="flex items-center gap-3">
            <div className={`text-sm font-medium ${remaining <= 5 ? 'text-red-500' : appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              {remaining}s
            </div>
            <div className="w-32 h-2 bg-gray-200 dark:bg-navy-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${remaining <= 5 ? 'bg-red-500' : 'bg-purple-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('add') || 'Add'}
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className={`rounded-xl p-6 mb-6 ${appTheme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-navy-800 border border-navy-700'}`}>
            <h3 className={`text-lg font-medium mb-4 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {t('addNewEntry') || 'Add New Entry'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t('accountName') || 'Account Name'} ({t('optional') || 'optional'})
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={t('accountNamePlaceholder') || 'e.g., GitHub, AWS, Google...'}
                  className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t('secretKey') || 'Secret Key'}
                </label>
                <input
                  type="text"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder={t('secretPlaceholder') || 'Enter Base32 secret key...'}
                  className={`w-full px-4 py-2.5 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
                />
              </div>
            </div>
            
            {/* Bulk Add */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                {t('bulkAdd') || 'Bulk Add'} ({t('onePerLine') || 'one per line, format: name:secret or just secret'})
              </label>
              <textarea
                value={secretInput.includes('\n') ? secretInput : ''}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder={`GitHub:JBSWY3DPEHPK3PXP\nAWS:HXDMVJECJJWSRB3H\nKR3GWMTZGI2VCZJQ`}
                rows={4}
                className={`w-full px-4 py-2.5 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${appTheme === 'light' ? 'bg-gray-50 border border-gray-300 text-gray-900' : 'bg-navy-900 border border-navy-600 text-white'}`}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => secretInput.includes('\n') ? handleBulkAdd(secretInput) : handleAdd()}
                disabled={!secretInput.trim()}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {secretInput.includes('\n') ? (t('addAll') || 'Add All') : (t('add') || 'Add')}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setSecretInput(''); setNameInput(''); }}
                className={`px-6 py-2.5 rounded-lg font-medium transition ${appTheme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-navy-700 text-gray-300 hover:bg-navy-600'}`}
              >
                {t('cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Entries List */}
        {entries.length === 0 ? (
          <div className={`rounded-xl p-12 text-center ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
            <svg className={`w-16 h-16 mx-auto mb-4 ${appTheme === 'light' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className={`text-lg font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              {t('noTotpEntries') || 'No 2FA entries yet'}
            </h3>
            <p className={`text-sm mb-6 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
              {t('addTotpEntry') || 'Add your first TOTP secret key to get started'}
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
            >
              {t('addFirstEntry') || 'Add First Entry'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-xl p-4 transition group ${appTheme === 'light' ? 'bg-white border border-gray-200 hover:border-purple-300 shadow-sm' : 'bg-navy-800 border border-navy-700 hover:border-purple-500'}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  {editingId === entry.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleEditSave(entry.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSave(entry.id)}
                      autoFocus
                      className={`flex-1 px-2 py-1 rounded text-sm font-medium ${appTheme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-navy-700 text-white'}`}
                    />
                  ) : (
                    <div 
                      className={`font-medium truncate cursor-pointer hover:underline ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}
                      onClick={() => { setEditingId(entry.id); setEditName(entry.name); }}
                      title={t('clickToEdit') || 'Click to edit'}
                    >
                      {entry.name}
                    </div>
                  )}
                  <button
                    onClick={() => handleRemove(entry.id)}
                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition ${appTheme === 'light' ? 'hover:bg-red-100 text-red-500' : 'hover:bg-red-500/20 text-red-400'}`}
                    title={t('delete') || 'Delete'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Code Display */}
                <div className={`p-4 rounded-lg mb-3 ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
                  {entry.valid ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className={`font-mono text-3xl font-bold tracking-widest ${remaining <= 5 ? 'text-red-500' : 'text-purple-500'}`}>
                        {entry.code.slice(0, 3)} {entry.code.slice(3)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center text-red-500 font-medium">
                      {t('invalidKey') || 'Invalid Key'}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    id={`copy-btn-${entry.id}`}
                    onClick={() => handleCopy(entry.code, entry.id)}
                    disabled={!entry.valid}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {t('copy') || 'Copy'}
                  </button>
                  <div className={`px-3 py-2 rounded-lg text-sm font-mono ${appTheme === 'light' ? 'bg-gray-100 text-gray-500' : 'bg-navy-700 text-gray-400'}`}>
                    {entry.secret.slice(0, 4)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Footer */}
        <div className={`mt-6 p-4 rounded-xl ${appTheme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-navy-900 border border-navy-800'}`}>
          <div className="flex items-start gap-3">
            <svg className={`w-5 h-5 mt-0.5 ${appTheme === 'light' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className={`text-sm ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              <p className="font-medium mb-1">{t('securityNote') || 'Security Note'}</p>
              <p>{t('totpSecurityInfo') || 'Your TOTP secrets are stored locally in your browser and are never sent to any server. Codes refresh every 30 seconds.'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorPage;
