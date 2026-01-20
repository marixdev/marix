/**
 * Command Snippets Page
 * 
 * Full management UI for command snippets with hotkey support.
 * Professional design matching PortForwardingPage and SSHKeyManager.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { snippetStore, CommandSnippet, DEFAULT_CATEGORIES, RESERVED_HOTKEYS, getReservedKeys } from '../services/snippetStore';

interface Props {
  appTheme: 'dark' | 'light';
}

const SnippetPage: React.FC<Props> = ({ appTheme }) => {
  const { t } = useLanguage();
  const isDark = appTheme === 'dark';
  
  // Detect macOS for correct hotkey display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? '⌘' : 'Ctrl';
  const modifierDisplay = isMac ? '⌘+Shift+' : 'Ctrl+Shift+';
  
  const [snippets, setSnippets] = useState<CommandSnippet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedSnippet, setSelectedSnippet] = useState<CommandSnippet | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    command: '',
    description: '',
    category: 'General',
    hotkey: '',
    tags: ''
  });

  // Load snippets
  useEffect(() => {
    const loadSnippets = () => {
      setSnippets(snippetStore.getAll());
    };
    loadSnippets();
    const unsubscribe = snippetStore.subscribe(loadSnippets);
    return () => unsubscribe();
  }, []);

  // Filter snippets
  const filteredSnippets = useMemo(() => {
    let result = snippets;
    
    if (selectedCategory) {
      result = result.filter(s => s.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.command.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    
    return result;
  }, [snippets, selectedCategory, searchQuery]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({ name: '', command: '', description: '', category: 'General', hotkey: '', tags: '' });
    setFormError(null);
    setEditingId(null);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!formData.name.trim()) {
      setFormError(t('snippetErrorName') || 'Please enter a name');
      return;
    }
    if (!formData.command.trim()) {
      setFormError(t('snippetErrorCommand') || 'Please enter a command');
      return;
    }
    
    // Validate hotkey
    if (formData.hotkey) {
      const key = formData.hotkey.toUpperCase();
      if (key.length !== 1) {
        setFormError(t('hotkeyMustBeSingleChar') || 'Hotkey must be a single character');
        return;
      }
      if (getReservedKeys().includes(key.toLowerCase())) {
        setFormError(t('hotkeyReserved') || 'This key is reserved');
        return;
      }
      // Check for duplicate
      const existing = snippets.find(s => s.hotkey?.toUpperCase() === key && s.id !== editingId);
      if (existing) {
        setFormError(t('hotkeyAlreadyExists') || 'This hotkey already exists');
        return;
      }
    }
    
    const snippet: Omit<CommandSnippet, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name.trim(),
      command: formData.command.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category || 'General',
      hotkey: formData.hotkey.trim().toUpperCase() || undefined,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      scope: 'global'
    };
    
    if (editingId) {
      snippetStore.update(editingId, snippet);
    } else {
      snippetStore.add(snippet);
    }
    
    resetForm();
    setShowForm(false);
    setSelectedSnippet(null);
  }, [formData, editingId, snippets, t, resetForm]);

  // Handle edit
  const handleEdit = useCallback((snippet: CommandSnippet) => {
    setFormData({
      name: snippet.name,
      command: snippet.command,
      description: snippet.description || '',
      category: snippet.category || 'General',
      hotkey: snippet.hotkey || '',
      tags: snippet.tags?.join(', ') || ''
    });
    setEditingId(snippet.id);
    setShowForm(true);
    setSelectedSnippet(null);
  }, []);

  // Handle delete
  const handleDelete = useCallback((id: string, name: string) => {
    if (confirm(`${t('snippetConfirmDelete') || 'Delete snippet'} "${name}"?`)) {
      snippetStore.delete(id);
      if (selectedSnippet?.id === id) setSelectedSnippet(null);
    }
  }, [t, selectedSnippet]);

  // Handle import
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as CommandSnippet[];
        const count = snippetStore.import(parsed);
        alert(`${t('snippetImported') || 'Imported'} ${count} ${t('snippets') || 'snippets'}`);
      } catch (err) {
        alert(t('snippetImportError') || 'Failed to import snippets');
      }
    };
    input.click();
  }, [t]);

  // Handle export
  const handleExport = useCallback(() => {
    const data = snippetStore.export();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snippets-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Get category icon and color
  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; text: string; icon: string }> = {
      'General': { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '⚡' },
      'System': { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🖥️' },
      'Network': { bg: 'bg-green-500/20', text: 'text-green-400', icon: '🌐' },
      'Docker': { bg: 'bg-sky-500/20', text: 'text-sky-400', icon: '🐳' },
      'Git': { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '📦' },
      'Database': { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '🗄️' },
      'Custom': { bg: 'bg-pink-500/20', text: 'text-pink-400', icon: '✨' }
    };
    return styles[category] || styles['General'];
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('commandSnippets') || 'Command Snippets'}
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('snippetDescription') || 'Quick commands for SSH sessions with optional hotkeys'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                isDark ? 'bg-navy-700 hover:bg-navy-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t('import') || 'Import'}
            </button>
            <button
              onClick={handleExport}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                isDark ? 'bg-navy-700 hover:bg-navy-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('exportSnippets') || 'Export'}
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); setSelectedSnippet(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 !text-white rounded-lg font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('add') || 'Add'}
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className={`flex items-center gap-4 p-4 rounded-xl mb-6 ${isDark ? 'bg-navy-800 border border-navy-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
          {/* Search */}
          <div className="relative flex-1">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('snippetSearch') || 'Search snippets...'}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-navy-900 border border-navy-600 text-white placeholder-gray-500' : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === ''
                  ? 'bg-indigo-600 !text-white'
                  : isDark ? 'bg-navy-700 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('allCategories') || 'All'}
            </button>
            {DEFAULT_CATEGORIES.slice(0, 5).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 !text-white'
                    : isDark ? 'bg-navy-700 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                {getCategoryStyle(cat).icon} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Snippets List */}
          <div className="flex-1 min-w-0">
            {snippets.length === 0 && !showForm ? (
              // Empty state
              <div className={`text-center py-16 rounded-xl ${isDark ? 'bg-navy-800 border border-navy-700' : 'bg-white border border-gray-200'}`}>
                <svg className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <p className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('noSnippetsYet') || 'No snippets yet'}
                </p>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {t('clickAddSnippet') || 'Create your first command snippet'}
                </p>
                <button
                  onClick={() => { resetForm(); setShowForm(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 !text-white rounded-lg font-medium transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('snippetAddFirst') || 'Add First Snippet'}
                </button>
              </div>
            ) : filteredSnippets.length === 0 ? (
              // No results
              <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-navy-800 border border-navy-700' : 'bg-white border border-gray-200'}`}>
                <svg className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('snippetNoResults') || 'No matching snippets'}
                </p>
              </div>
            ) : (
              // Snippets grid
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSnippets.map(snippet => {
                  const catStyle = getCategoryStyle(snippet.category || 'General');
                  return (
                    <div
                      key={snippet.id}
                      onClick={() => { setSelectedSnippet(snippet); setShowForm(false); }}
                      className={`rounded-xl p-4 cursor-pointer transition group ${
                        selectedSnippet?.id === snippet.id
                          ? isDark 
                            ? 'bg-indigo-600/20 border-2 border-indigo-500' 
                            : 'bg-indigo-50 border-2 border-indigo-500'
                          : isDark
                            ? 'bg-navy-800 border border-navy-700 hover:border-indigo-500'
                            : 'bg-white border border-gray-200 hover:border-indigo-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${catStyle.bg}`}>
                            <span className="text-lg">{catStyle.icon}</span>
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {snippet.name}
                            </p>
                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                              {snippet.category}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {snippet.hotkey && (
                            <span className={`px-2.5 py-1 rounded text-sm font-mono font-bold ${
                              isDark ? 'bg-indigo-500/30 text-indigo-300' : 'bg-indigo-200 text-indigo-800'
                            }`}>
                              {modifierDisplay}{snippet.hotkey.toUpperCase()}
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(snippet); }}
                            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition ${
                              isDark ? 'text-gray-400 hover:text-white hover:bg-navy-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(snippet.id, snippet.name); }}
                            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition ${
                              isDark ? 'text-red-400 hover:bg-red-600/20' : 'text-red-500 hover:bg-red-50'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-lg ${isDark ? 'bg-navy-900' : 'bg-gray-100'}`}>
                        <code className={`text-xs font-mono block truncate ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          {snippet.command}
                        </code>
                      </div>
                      {snippet.description && (
                        <p className={`text-xs mt-2 truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                          {snippet.description}
                        </p>
                      )}
                      {snippet.tags && snippet.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {snippet.tags.slice(0, 3).map(tag => (
                            <span key={tag} className={`px-1.5 py-0.5 rounded text-xs ${
                              isDark ? 'bg-navy-700 text-gray-400' : 'bg-gray-200 text-gray-700'
                            }`}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel - Form or Detail */}
          {(showForm || selectedSnippet) && (
            <div className={`w-96 flex-shrink-0 rounded-xl p-5 ${isDark ? 'bg-navy-800 border border-navy-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
              {showForm ? (
                // Add/Edit Form
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {editingId ? (t('snippetEdit') || 'Edit Snippet') : (t('snippetAdd') || 'Add Snippet')}
                    </h3>
                    <button
                      onClick={() => { setShowForm(false); resetForm(); }}
                      className={`p-1.5 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-navy-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {formError && (
                    <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {t('name') || 'Name'} *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Disk Usage"
                        className={`w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-navy-900 border border-navy-600 text-white' : 'bg-gray-50 border border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>

                    {/* Command */}
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {t('command') || 'Command'} *
                      </label>
                      <textarea
                        value={formData.command}
                        onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                        placeholder="e.g., df -h"
                        rows={3}
                        className={`w-full px-3 py-2.5 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-navy-900 border border-navy-600 text-emerald-400' : 'bg-gray-50 border border-gray-300 text-emerald-600'
                        }`}
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {t('snippetCategory') || 'Category'}
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-navy-900 border border-navy-600 text-white' : 'bg-gray-50 border border-gray-300 text-gray-900'
                        }`}
                      >
                        {DEFAULT_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{getCategoryStyle(cat).icon} {cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Hotkey */}
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {t('snippetHotkey') || 'Hotkey'} <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>({t('optional') || 'optional'})</span>
                      </label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {modifierDisplay}
                        </span>
                        <input
                          type="text"
                          value={formData.hotkey}
                          onChange={(e) => setFormData({ ...formData, hotkey: e.target.value.slice(-1).toUpperCase() })}
                          maxLength={1}
                          placeholder="D"
                          className={`w-full pl-24 pr-3 py-2.5 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? 'bg-navy-900 border border-navy-600 text-white' : 'bg-gray-50 border border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {t('hotkeyDescriptionLabel') || 'Description'}
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder={t('snippetDescriptionPlaceholder') || 'Optional description'}
                        className={`w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-navy-900 border border-navy-600 text-white' : 'bg-gray-50 border border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {t('snippetTags') || 'Tags'}
                      </label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder={t('snippetTagsPlaceholder') || 'Comma separated: disk, storage'}
                        className={`w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-navy-900 border border-navy-600 text-white' : 'bg-gray-50 border border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => { setShowForm(false); resetForm(); }}
                      className={`flex-1 py-2.5 rounded-lg font-medium transition ${
                        isDark ? 'bg-navy-700 text-gray-300 hover:bg-navy-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t('cancel') || 'Cancel'}
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 py-2.5 rounded-lg font-medium bg-indigo-600 !text-white hover:bg-indigo-700 transition"
                    >
                      {editingId ? (t('save') || 'Save') : (t('add') || 'Add')}
                    </button>
                  </div>
                </div>
              ) : selectedSnippet && (
                // Detail View
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryStyle(selectedSnippet.category || 'General').bg}`}>
                        <span className="text-lg">{getCategoryStyle(selectedSnippet.category || 'General').icon}</span>
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {selectedSnippet.name}
                        </h3>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {selectedSnippet.category || 'General'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSnippet(null)}
                      className={`p-1.5 rounded-lg ${isDark ? 'text-gray-400 hover:text-white hover:bg-navy-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Command */}
                  <div className="mb-4">
                    <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Command
                    </label>
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-navy-900' : 'bg-gray-50'}`}>
                      <code className={`text-sm font-mono whitespace-pre-wrap break-all ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {selectedSnippet.command}
                      </code>
                    </div>
                  </div>

                  {/* Hotkey */}
                  {selectedSnippet.hotkey && (
                    <div className="mb-4">
                      <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Hotkey
                      </label>
                      <div className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                        <kbd className={`px-2.5 py-1 rounded text-sm font-mono font-medium ${isDark ? 'bg-navy-900 text-gray-300' : 'bg-white text-gray-700 shadow-sm'}`}>{modifierKey}</kbd>
                        <span className={`text-lg ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
                        <kbd className={`px-2.5 py-1 rounded text-sm font-mono font-medium ${isDark ? 'bg-navy-900 text-gray-300' : 'bg-white text-gray-700 shadow-sm'}`}>Shift</kbd>
                        <span className={`text-lg ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
                        <kbd className={`px-2.5 py-1 rounded text-sm font-mono font-bold ${isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'}`}>{selectedSnippet.hotkey.toUpperCase()}</kbd>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedSnippet.description && (
                    <div className="mb-4">
                      <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Description
                      </label>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {selectedSnippet.description}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedSnippet.tags && selectedSnippet.tags.length > 0 && (
                    <div className="mb-4">
                      <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSnippet.tags.map(tag => (
                          <span key={tag} className={`px-2 py-1 rounded-full text-xs ${isDark ? 'bg-navy-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className={`flex gap-3 mt-6 pt-4 border-t ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
                    <button
                      onClick={() => handleEdit(selectedSnippet)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition ${
                        isDark ? 'bg-navy-700 text-gray-300 hover:bg-navy-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t('edit') || 'Edit'}
                    </button>
                    <button
                      onClick={() => handleDelete(selectedSnippet.id, selectedSnippet.name)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition ${
                        isDark ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {t('delete') || 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Usage Info Footer */}
        <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-navy-800/50 border border-navy-700' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('tips') || 'Tips'}
              </h4>
              <ul className={`text-xs space-y-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                <li>• {t('snippetUsageTip1') || 'Click a snippet in the terminal panel to insert it'}</li>
                <li>• {t('snippetUsageTip2') || 'Commands are NOT auto-executed - press Enter to run'}</li>
                <li>• {t('snippetUsageTip3') || 'Hotkeys work with Ctrl+Shift+[Key] (or ⌘+Shift on Mac)'}</li>
              </ul>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                <span className="font-medium">{t('snippetReservedKeys') || 'Reserved keys:'}</span>{' '}
                {RESERVED_HOTKEYS.map(h => h.key.toUpperCase()).join(', ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnippetPage;
