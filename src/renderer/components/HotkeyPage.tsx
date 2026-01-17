import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export interface HotkeyEntry {
  id: string;
  key: string;  // Single character like 'a', 'b', '1', '2', etc.
  command: string;
  description?: string;
}

// Reserved hotkeys used by the application - cannot be overridden
// descriptionKey is the translation key to use
export const RESERVED_HOTKEYS: { key: string; descriptionKey: string; shortcut: string }[] = [
  { key: 'a', descriptionKey: 'reservedAddNewHost', shortcut: 'Ctrl/⌘+Shift+A' },
  { key: 'c', descriptionKey: 'reservedCopy', shortcut: 'Ctrl/⌘+Shift+C' },
  { key: 'l', descriptionKey: 'reservedToggleLAN', shortcut: 'Ctrl/⌘+Shift+L' },
  { key: 'o', descriptionKey: 'reservedSwitchTerminalSFTP', shortcut: 'Ctrl/⌘+Shift+O' },
  { key: 't', descriptionKey: 'reservedLocalTerminal', shortcut: 'Ctrl/⌘+Shift+T' },
  { key: 'v', descriptionKey: 'reservedPaste', shortcut: 'Ctrl/⌘+Shift+V' },
];

// Get list of reserved keys (lowercase)
export const getReservedKeys = (): string[] => RESERVED_HOTKEYS.map(h => h.key.toLowerCase());

interface Props {
  appTheme: 'dark' | 'light';
}

const HotkeyPage: React.FC<Props> = ({ appTheme }) => {
  const { t } = useLanguage();
  const [hotkeys, setHotkeys] = useState<HotkeyEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [keyInput, setKeyInput] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  
  // Load saved hotkeys from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('custom_hotkeys');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHotkeys(parsed);
      } catch (e) {
        console.error('Failed to load hotkeys:', e);
      }
    }
  }, []);

  // Save hotkeys to localStorage
  const saveHotkeys = (newHotkeys: HotkeyEntry[]) => {
    setHotkeys(newHotkeys);
    localStorage.setItem('custom_hotkeys', JSON.stringify(newHotkeys));
  };

  // Add new hotkey
  const handleAddHotkey = () => {
    if (!keyInput.trim() || !commandInput.trim()) {
      alert(t('pleaseEnterKeyAndCommand') || 'Please enter both key and command');
      return;
    }
    
    // Validate key is single character
    const key = keyInput.trim().toLowerCase();
    if (key.length !== 1) {
      alert(t('hotkeyMustBeSingleChar') || 'Hotkey must be a single character');
      return;
    }
    
    // Check for reserved keys
    const reservedKeys = getReservedKeys();
    if (reservedKeys.includes(key)) {
      const reserved = RESERVED_HOTKEYS.find(h => h.key === key);
      const reservedDesc = reserved ? (t(reserved.descriptionKey as any) || reserved.descriptionKey) : '';
      alert((t('hotkeyReserved') || 'This key is reserved for:') + ` ${reservedDesc} (${reserved?.shortcut})`);
      return;
    }
    
    // Check for duplicate key
    if (hotkeys.some(h => h.key === key)) {
      alert(t('hotkeyAlreadyExists') || 'This hotkey already exists');
      return;
    }
    
    const newHotkey: HotkeyEntry = {
      id: Date.now().toString(),
      key: key,
      command: commandInput.trim(),
      description: descriptionInput.trim() || undefined,
    };
    
    saveHotkeys([...hotkeys, newHotkey]);
    
    // Reset form
    setKeyInput('');
    setCommandInput('');
    setDescriptionInput('');
    setShowAddForm(false);
  };

  // Delete hotkey
  const handleDeleteHotkey = (id: string) => {
    if (confirm(t('confirmDeleteHotkey') || 'Are you sure you want to delete this hotkey?')) {
      saveHotkeys(hotkeys.filter(h => h.id !== id));
    }
  };

  // Start editing
  const handleStartEdit = (hotkey: HotkeyEntry) => {
    setEditingId(hotkey.id);
    setKeyInput(hotkey.key);
    setCommandInput(hotkey.command);
    setDescriptionInput(hotkey.description || '');
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!keyInput.trim() || !commandInput.trim()) {
      alert(t('pleaseEnterKeyAndCommand') || 'Please enter both key and command');
      return;
    }
    
    const key = keyInput.trim().toLowerCase();
    if (key.length !== 1) {
      alert(t('hotkeyMustBeSingleChar') || 'Hotkey must be a single character');
      return;
    }
    
    // Check for reserved keys
    const reservedKeys = getReservedKeys();
    if (reservedKeys.includes(key)) {
      const reserved = RESERVED_HOTKEYS.find(h => h.key === key);
      const reservedDesc = reserved ? (t(reserved.descriptionKey as any) || reserved.descriptionKey) : '';
      alert((t('hotkeyReserved') || 'This key is reserved for:') + ` ${reservedDesc} (${reserved?.shortcut})`);
      return;
    }
    
    // Check for duplicate key (excluding current one)
    if (hotkeys.some(h => h.key === key && h.id !== editingId)) {
      alert(t('hotkeyAlreadyExists') || 'This hotkey already exists');
      return;
    }
    
    saveHotkeys(hotkeys.map(h => 
      h.id === editingId 
        ? { ...h, key, command: commandInput.trim(), description: descriptionInput.trim() || undefined }
        : h
    ));
    
    // Reset form
    setEditingId(null);
    setKeyInput('');
    setCommandInput('');
    setDescriptionInput('');
  };

  // Cancel edit/add
  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setKeyInput('');
    setCommandInput('');
    setDescriptionInput('');
  };

  return (
    <div className={`h-full overflow-auto ${appTheme === 'light' ? 'bg-gray-50' : 'bg-navy-900'}`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {t('customHotkeys') || 'Custom Hotkeys'}
            </h1>
            <p className={`text-sm mt-1 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('hotkeyDescription') || 'Create keyboard shortcuts to quickly execute commands in SSH terminal'}
            </p>
          </div>
          {!showAddForm && !editingId && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('addHotkey') || 'Add Hotkey'}
            </button>
          )}
        </div>

        {/* Info box */}
        <div className={`p-4 rounded-xl mb-6 ${appTheme === 'light' ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-800'}`}>
          <div className="flex items-start gap-3">
            <svg className={`w-5 h-5 mt-0.5 ${appTheme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className={`text-sm ${appTheme === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>
                {t('hotkeyUsage') || 'Press'} <kbd className={`px-2 py-0.5 rounded font-mono text-xs ${appTheme === 'light' ? 'bg-blue-100 text-blue-800' : 'bg-blue-800 text-blue-200'}`}>Ctrl/⌘+Shift+[key]</kbd> {t('hotkeyUsage2') || 'in SSH terminal to execute the command'}
              </p>
              <p className={`text-xs mt-1 ${appTheme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>
                💡 {t('hotkeyMacNote') || 'Mac: Use ⌘ (Cmd) instead of Ctrl'}
              </p>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <div className={`rounded-xl p-5 mb-6 ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {editingId ? (t('editHotkey') || 'Edit Hotkey') : (t('addNewHotkey') || 'Add New Hotkey')}
            </h3>
            <div className="space-y-4">
              {/* Key input */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t('hotkeyKey') || 'Hotkey'} <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-2 rounded-lg font-mono text-sm ${appTheme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-navy-900 text-gray-400'}`}>
                    Ctrl/⌘+Shift+
                  </span>
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value.slice(-1))} // Only keep last character
                    maxLength={1}
                    placeholder="A"
                    className={`w-16 px-3 py-2 rounded-lg text-center font-mono text-lg uppercase focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      appTheme === 'light' 
                        ? 'bg-gray-50 border border-gray-300 text-gray-900' 
                        : 'bg-navy-900 border border-navy-600 text-white'
                    }`}
                  />
                </div>
                <p className={`text-xs mt-1 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {t('hotkeyKeyHint') || 'Enter a single character (A-Z, 0-9)'}
                </p>
              </div>

              {/* Command input */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t('command') || 'Command'} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="ls -la"
                  className={`w-full px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    appTheme === 'light' 
                      ? 'bg-gray-50 border border-gray-300 text-gray-900' 
                      : 'bg-navy-900 border border-navy-600 text-white'
                  }`}
                />
                <p className={`text-xs mt-1 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {t('commandHint') || 'The command will be typed and executed automatically'}
                </p>
              </div>

              {/* Description input (optional) */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t('hotkeyDescriptionLabel') || 'Description (Optional)'}
                </label>
                <input
                  type="text"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="List all files"
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    appTheme === 'light' 
                      ? 'bg-gray-50 border border-gray-300 text-gray-900' 
                      : 'bg-navy-900 border border-navy-600 text-white'
                  }`}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCancel}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    appTheme === 'light' 
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                      : 'bg-navy-700 text-gray-300 hover:bg-navy-600'
                  }`}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  onClick={editingId ? handleSaveEdit : handleAddHotkey}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition"
                >
                  {editingId ? (t('save') || 'Save') : (t('add') || 'Add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hotkeys list */}
        {hotkeys.length === 0 && !showAddForm ? (
          <div className={`text-center py-16 rounded-xl ${appTheme === 'light' ? 'bg-white border border-gray-200' : 'bg-navy-800 border border-navy-700'}`}>
            <svg className={`w-16 h-16 mx-auto mb-4 ${appTheme === 'light' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className={`text-lg font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              {t('noHotkeysYet') || 'No hotkeys configured yet'}
            </p>
            <p className={`text-sm ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
              {t('clickAddHotkey') || 'Click "Add Hotkey" to create your first custom shortcut'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {hotkeys.map(hotkey => (
              <div
                key={hotkey.id}
                className={`rounded-xl p-4 transition ${
                  editingId === hotkey.id
                    ? appTheme === 'light'
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-teal-600/10 border-2 border-teal-500'
                    : appTheme === 'light'
                      ? 'bg-white border border-gray-200 hover:border-gray-300'
                      : 'bg-navy-800 border border-navy-700 hover:border-navy-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Hotkey badge */}
                    <div className={`px-3 py-2 rounded-lg font-mono text-sm font-medium ${
                      appTheme === 'light'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-purple-600/20 text-purple-400'
                    }`}>
                      Ctrl/⌘+Shift+{hotkey.key.toUpperCase()}
                    </div>
                    
                    {/* Command and description */}
                    <div>
                      <code className={`font-mono text-sm ${appTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        {hotkey.command}
                      </code>
                      {hotkey.description && (
                        <p className={`text-xs mt-0.5 ${appTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {hotkey.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(hotkey)}
                      className={`p-2 rounded-lg transition ${
                        appTheme === 'light'
                          ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                          : 'text-gray-400 hover:text-blue-400 hover:bg-blue-600/20'
                      }`}
                      title={t('edit') || 'Edit'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteHotkey(hotkey.id)}
                      className={`p-2 rounded-lg transition ${
                        appTheme === 'light'
                          ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          : 'text-gray-400 hover:text-red-400 hover:bg-red-600/20'
                      }`}
                      title={t('delete') || 'Delete'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tips section */}
        {hotkeys.length > 0 && (
          <div className={`mt-6 p-4 rounded-xl ${appTheme === 'light' ? 'bg-gray-100' : 'bg-navy-800/50'}`}>
            <h4 className={`text-sm font-medium mb-2 ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              💡 {t('tips') || 'Tips'}
            </h4>
            <ul className={`text-sm space-y-1 ${appTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              <li>• {t('hotkeyTip1') || 'Hotkeys only work when focused in SSH terminal'}</li>
              <li>• {t('hotkeyTip2') || 'Commands are sent as-is (with Enter key at the end)'}</li>
              <li>• {t('hotkeyTip3') || 'Use hotkeys for frequently used commands like "ls -la", "docker ps", etc.'}</li>
            </ul>
          </div>
        )}

        {/* Reserved Hotkeys section */}
        <div className={`mt-6 p-4 rounded-xl ${appTheme === 'light' ? 'bg-amber-50 border border-amber-200' : 'bg-amber-900/20 border border-amber-800'}`}>
          <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${appTheme === 'light' ? 'text-amber-800' : 'text-amber-300'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {t('reservedHotkeys') || 'Reserved Hotkeys (Cannot be used)'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RESERVED_HOTKEYS.map((hotkey) => (
              <div 
                key={hotkey.key}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  appTheme === 'light' ? 'bg-white/60' : 'bg-navy-800/50'
                }`}
              >
                <span className={`text-sm ${appTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {t(hotkey.descriptionKey as any) || hotkey.descriptionKey}
                </span>
                <kbd className={`px-2 py-0.5 rounded font-mono text-xs ${
                  appTheme === 'light' ? 'bg-amber-100 text-amber-800' : 'bg-amber-800/50 text-amber-300'
                }`}>
                  {hotkey.shortcut}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotkeyPage;

// Export function to get hotkeys (used by terminal)
export function getCustomHotkeys(): HotkeyEntry[] {
  try {
    const saved = localStorage.getItem('custom_hotkeys');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load hotkeys:', e);
  }
  return [];
}
