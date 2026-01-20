/**
 * Snippet Panel Component - PROFESSIONAL DESIGN
 * 
 * Side panel for terminal sessions with high contrast light mode
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { snippetStore, CommandSnippet, DEFAULT_CATEGORIES } from '../services/snippetStore';

interface SnippetPanelProps {
  theme: 'dark' | 'light';
  hostId?: string;
  groupId?: string;
  onInsertCommand: (command: string) => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SnippetPanel: React.FC<SnippetPanelProps> = ({
  theme,
  hostId,
  groupId,
  onInsertCommand,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  
  // Detect macOS for correct hotkey display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierDisplay = isMac ? '⌘⇧' : 'Ctrl+Shift+';
  
  const [snippets, setSnippets] = useState<CommandSnippet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Load snippets
  useEffect(() => {
    const loadSnippets = () => {
      const allSnippets = snippetStore.getForContext(hostId, groupId);
      setSnippets(allSnippets);
    };
    
    loadSnippets();
    const unsubscribe = snippetStore.subscribe(loadSnippets);
    return () => unsubscribe();
  }, [hostId, groupId]);

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

  // Group by category
  const groupedSnippets = useMemo(() => {
    const groups: Record<string, CommandSnippet[]> = {};
    filteredSnippets.forEach(s => {
      const cat = s.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return groups;
  }, [filteredSnippets]);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'General': '⚡',
      'System': '🖥️',
      'Network': '🌐',
      'Docker': '🐳',
      'Git': '📦',
      'Database': '🗄️',
      'Custom': '✨'
    };
    return icons[category] || '⚡';
  };

  // Handle snippet click
  const handleInsert = useCallback((snippet: CommandSnippet) => {
    onInsertCommand(snippet.command);
  }, [onInsertCommand]);

  // Collapsed state
  if (isCollapsed) {
    return (
      <div 
        className="flex flex-col items-center py-4 px-1"
        style={{ 
          backgroundColor: isDark ? '#1e293b' : '#1e40af',
          borderLeft: isDark ? '1px solid #334155' : '1px solid #1e3a8a'
        }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg transition hover:bg-white/10"
          style={{ color: 'white' }}
          title={t('snippetShowPanel') || 'Show Snippets'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
        <span 
          className="text-xs mt-2 font-bold"
          style={{ writingMode: 'vertical-rl', color: 'white' }}
        >
          Snippets
        </span>
      </div>
    );
  }

  return (
    <div 
      className="w-72 flex flex-col h-full"
      style={{ 
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        borderLeft: isDark ? '1px solid #334155' : '3px solid #3b82f6'
      }}
    >
      {/* Header - Blue for light, dark for dark */}
      <div 
        className="flex items-center justify-between px-3 py-3"
        style={{ 
          backgroundColor: isDark ? '#0f172a' : '#2563eb',
          borderBottom: isDark ? '1px solid #334155' : '1px solid #1d4ed8'
        }}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" style={{ color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span className="text-sm font-bold" style={{ color: 'white' }}>
            {t('snippets') || 'Snippets'}
          </span>
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            {filteredSnippets.length}
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg transition hover:bg-white/20"
          style={{ color: 'white' }}
          title={t('snippetHidePanel') || 'Collapse'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div 
        className="px-3 py-3"
        style={{ 
          backgroundColor: isDark ? '#1e293b' : 'white',
          borderBottom: isDark ? '1px solid #334155' : '2px solid #e2e8f0'
        }}
      >
        <div className="relative">
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: isDark ? '#64748b' : '#64748b' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('snippetSearch') || 'Search snippets...'}
            className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2"
            style={{ 
              backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
              border: isDark ? '1px solid #334155' : '2px solid #cbd5e1',
              color: isDark ? 'white' : '#0f172a',
              fontWeight: 500
            }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div 
        className="flex flex-wrap gap-2 px-3 py-3"
        style={{ 
          backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
          borderBottom: isDark ? '1px solid #334155' : '2px solid #e2e8f0'
        }}
      >
        <button
          onClick={() => setSelectedCategory(null)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={selectedCategory === null ? {
            backgroundColor: '#2563eb',
            color: 'white',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)'
          } : {
            backgroundColor: isDark ? '#334155' : '#e2e8f0',
            color: isDark ? '#94a3b8' : '#475569'
          }}
        >
          All
        </button>
        {DEFAULT_CATEGORIES.slice(0, 4).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className="px-2.5 py-1.5 rounded-lg text-sm transition-all"
            style={selectedCategory === cat ? {
              backgroundColor: '#2563eb',
              color: 'white',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)'
            } : {
              backgroundColor: isDark ? '#334155' : '#e2e8f0',
              color: isDark ? '#94a3b8' : '#475569'
            }}
          >
            {getCategoryIcon(cat)}
          </button>
        ))}
      </div>

      {/* Snippets List */}
      <div 
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ backgroundColor: isDark ? '#1e293b' : 'white' }}
      >
        {snippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg 
              className="w-12 h-12 mb-3" 
              style={{ color: isDark ? '#475569' : '#94a3b8' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <p 
              className="text-sm font-bold"
              style={{ color: isDark ? '#64748b' : '#475569' }}
            >
              {t('snippetNoSnippets') || 'No snippets yet'}
            </p>
            <p 
              className="text-xs mt-1"
              style={{ color: isDark ? '#475569' : '#64748b' }}
            >
              {t('snippetAddFromMenu') || 'Add from Snippets menu'}
            </p>
          </div>
        ) : filteredSnippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p 
              className="text-sm font-bold"
              style={{ color: isDark ? '#64748b' : '#475569' }}
            >
              {t('snippetNoResults') || 'No matches found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedSnippets).map(([category, categorySnippets]) => (
              <div key={category}>
                {/* Category header */}
                <div 
                  className="flex items-center gap-2 px-2 py-2 mb-2 rounded-lg"
                  style={{ 
                    backgroundColor: isDark ? '#0f172a' : '#dbeafe',
                    borderLeft: '3px solid #3b82f6'
                  }}
                >
                  <span className="text-sm">{getCategoryIcon(category)}</span>
                  <span 
                    className="text-xs font-black uppercase tracking-wider"
                    style={{ color: isDark ? '#94a3b8' : '#1e40af' }}
                  >
                    {category}
                  </span>
                </div>
                
                {/* Snippets in category */}
                {categorySnippets.map(snippet => (
                  <button
                    key={snippet.id}
                    onClick={() => handleInsert(snippet)}
                    className="w-full text-left px-3 py-3 rounded-xl mb-2 transition-all"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      border: isDark ? '1px solid #334155' : '2px solid #cbd5e1',
                      boxShadow: isDark ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#dbeafe';
                      e.currentTarget.style.borderColor = isDark ? '#475569' : '#3b82f6';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? '#0f172a' : '#f8fafc';
                      e.currentTarget.style.borderColor = isDark ? '#334155' : '#cbd5e1';
                    }}
                    title={snippet.description || t('snippetClickToInsert') || 'Click to insert'}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span 
                        className="text-sm font-black truncate"
                        style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}
                      >
                        {snippet.name}
                      </span>
                      {snippet.hotkey && (
                        <span 
                          className="flex-shrink-0 ml-2 px-2 py-1 rounded-md text-xs font-mono font-black"
                          style={{ 
                            backgroundColor: '#2563eb',
                            color: 'white',
                            boxShadow: '0 2px 4px -1px rgba(37, 99, 235, 0.4)'
                          }}
                        >
                          {modifierDisplay}{snippet.hotkey.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div 
                      className="px-2.5 py-2 rounded-lg"
                      style={{ backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}
                    >
                      <code 
                        className="text-xs font-mono font-bold block truncate"
                        style={{ color: isDark ? '#34d399' : '#047857' }}
                      >
                        {snippet.command}
                      </code>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div 
        className="px-3 py-3 text-center"
        style={{ 
          backgroundColor: isDark ? '#0f172a' : '#2563eb',
          borderTop: isDark ? '1px solid #334155' : 'none'
        }}
      >
        <p 
          className="text-xs font-bold"
          style={{ color: 'white' }}
        >
          {t('snippetClickHint') || 'Click to insert • Press Enter to run'}
        </p>
      </div>
    </div>
  );
};

export default SnippetPanel;
