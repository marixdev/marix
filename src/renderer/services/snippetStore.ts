/**
 * Command Snippets Store
 * 
 * Unified system combining Snippets + Hotkeys
 * - Snippets are the single source of truth
 * - Hotkeys are optional accelerators attached to snippets
 * - Local storage only, no cloud sync
 */

export interface CommandSnippet {
  id: string;
  name: string;           // Short title
  command: string;        // Shell command text
  description?: string;   // Optional explanation
  scope: 'global' | 'host' | 'group';  // Where snippet applies
  scopeId?: string;       // Host ID or Group ID if scope is not global
  hotkey?: string;        // Optional hotkey (single char, used with Ctrl+Shift)
  tags?: string[];        // Optional tags for organization
  category?: string;      // Category for grouping (e.g., "System", "Docker", "Git")
  createdAt: number;      // Timestamp
  updatedAt: number;      // Timestamp
}

// Reserved hotkeys that cannot be used for snippets
export const RESERVED_HOTKEYS: { key: string; description: string; shortcut: string }[] = [
  { key: 'a', description: 'Add New Host', shortcut: 'Ctrl/⌘+Shift+A' },
  { key: 'c', description: 'Copy', shortcut: 'Ctrl/⌘+Shift+C' },
  { key: 'l', description: 'Toggle LAN', shortcut: 'Ctrl/⌘+Shift+L' },
  { key: 'o', description: 'Switch Terminal/SFTP', shortcut: 'Ctrl/⌘+Shift+O' },
  { key: 't', description: 'Local Terminal', shortcut: 'Ctrl/⌘+Shift+T' },
  { key: 'v', description: 'Paste', shortcut: 'Ctrl/⌘+Shift+V' },
];

export const getReservedKeys = (): string[] => RESERVED_HOTKEYS.map(h => h.key.toLowerCase());

// Default categories
export const DEFAULT_CATEGORIES = [
  'System',
  'Docker',
  'Git',
  'Network',
  'Files',
  'Database',
  'Custom',
];

// Storage keys
const STORAGE_KEY = 'command_snippets';
const LEGACY_HOTKEY_KEY = 'custom_hotkeys';

// Legacy hotkey format for migration
interface LegacyHotkey {
  id: string;
  key: string;
  command: string;
  description?: string;
}

class SnippetStore {
  private snippets: CommandSnippet[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  /**
   * Load snippets from localStorage
   * Also migrates legacy hotkeys if needed
   */
  private load(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.snippets = JSON.parse(saved);
      } else {
        // Check for legacy hotkeys to migrate
        this.migrateFromLegacyHotkeys();
      }
    } catch (e) {
      console.error('[SnippetStore] Failed to load snippets:', e);
      this.snippets = [];
    }
  }

  /**
   * Migrate from old custom_hotkeys format to new snippets format
   */
  private migrateFromLegacyHotkeys(): void {
    try {
      const legacy = localStorage.getItem(LEGACY_HOTKEY_KEY);
      if (!legacy) return;

      const legacyHotkeys: LegacyHotkey[] = JSON.parse(legacy);
      if (legacyHotkeys.length === 0) return;

      console.log('[SnippetStore] Migrating', legacyHotkeys.length, 'legacy hotkeys to snippets');

      this.snippets = legacyHotkeys.map(h => ({
        id: h.id,
        name: h.description || `Hotkey ${h.key.toUpperCase()}`,
        command: h.command,
        description: h.description,
        scope: 'global' as const,
        hotkey: h.key.toLowerCase(),
        category: 'Custom',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      this.save();
      
      // Keep legacy for backup but mark as migrated
      localStorage.setItem(LEGACY_HOTKEY_KEY + '_migrated', legacy);
      console.log('[SnippetStore] Migration complete');
    } catch (e) {
      console.error('[SnippetStore] Migration failed:', e);
    }
  }

  /**
   * Save snippets to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snippets));
      this.notifyListeners();
    } catch (e) {
      console.error('[SnippetStore] Failed to save snippets:', e);
    }
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get all snippets
   */
  getAll(): CommandSnippet[] {
    return [...this.snippets];
  }

  /**
   * Get snippets for a specific context (global + host/group specific)
   */
  getForContext(hostId?: string, groupId?: string): CommandSnippet[] {
    return this.snippets.filter(s => {
      if (s.scope === 'global') return true;
      if (s.scope === 'host' && s.scopeId === hostId) return true;
      if (s.scope === 'group' && s.scopeId === groupId) return true;
      return false;
    });
  }

  /**
   * Get snippet by ID
   */
  getById(id: string): CommandSnippet | undefined {
    return this.snippets.find(s => s.id === id);
  }

  /**
   * Get snippet by hotkey
   */
  getByHotkey(key: string): CommandSnippet | undefined {
    return this.snippets.find(s => s.hotkey?.toLowerCase() === key.toLowerCase());
  }

  /**
   * Search snippets by name, command, or tags
   */
  search(query: string): CommandSnippet[] {
    const q = query.toLowerCase();
    return this.snippets.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.command.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.tags?.some(t => t.toLowerCase().includes(q)) ||
      s.category?.toLowerCase().includes(q)
    );
  }

  /**
   * Get snippets by category
   */
  getByCategory(category: string): CommandSnippet[] {
    return this.snippets.filter(s => s.category === category);
  }

  /**
   * Get all used categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.snippets.forEach(s => {
      if (s.category) categories.add(s.category);
    });
    return Array.from(categories);
  }

  /**
   * Add a new snippet
   */
  add(snippet: Omit<CommandSnippet, 'id' | 'createdAt' | 'updatedAt'>): CommandSnippet {
    // Validate hotkey if provided
    if (snippet.hotkey) {
      const key = snippet.hotkey.toLowerCase();
      if (key.length !== 1) {
        throw new Error('Hotkey must be a single character');
      }
      if (getReservedKeys().includes(key)) {
        throw new Error(`Hotkey "${key}" is reserved`);
      }
      if (this.snippets.some(s => s.hotkey?.toLowerCase() === key)) {
        throw new Error(`Hotkey "${key}" is already in use`);
      }
    }

    const now = Date.now();
    const newSnippet: CommandSnippet = {
      ...snippet,
      id: now.toString(),
      hotkey: snippet.hotkey?.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    this.snippets.push(newSnippet);
    this.save();
    return newSnippet;
  }

  /**
   * Update an existing snippet
   */
  update(id: string, updates: Partial<Omit<CommandSnippet, 'id' | 'createdAt'>>): CommandSnippet | null {
    const index = this.snippets.findIndex(s => s.id === id);
    if (index === -1) return null;

    // Validate hotkey if changing
    if (updates.hotkey !== undefined && updates.hotkey !== this.snippets[index].hotkey) {
      if (updates.hotkey) {
        const key = updates.hotkey.toLowerCase();
        if (key.length !== 1) {
          throw new Error('Hotkey must be a single character');
        }
        if (getReservedKeys().includes(key)) {
          throw new Error(`Hotkey "${key}" is reserved`);
        }
        if (this.snippets.some(s => s.id !== id && s.hotkey?.toLowerCase() === key)) {
          throw new Error(`Hotkey "${key}" is already in use`);
        }
        updates.hotkey = key;
      }
    }

    this.snippets[index] = {
      ...this.snippets[index],
      ...updates,
      updatedAt: Date.now(),
    };

    this.save();
    return this.snippets[index];
  }

  /**
   * Delete a snippet
   */
  delete(id: string): boolean {
    const index = this.snippets.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.snippets.splice(index, 1);
    this.save();
    return true;
  }

  /**
   * Reorder snippets
   */
  reorder(ids: string[]): void {
    const reordered: CommandSnippet[] = [];
    ids.forEach(id => {
      const snippet = this.snippets.find(s => s.id === id);
      if (snippet) reordered.push(snippet);
    });
    // Add any remaining snippets not in the ids array
    this.snippets.forEach(s => {
      if (!ids.includes(s.id)) reordered.push(s);
    });
    this.snippets = reordered;
    this.save();
  }

  /**
   * Import snippets (merge with existing)
   */
  import(snippets: CommandSnippet[], replace = false): number {
    if (replace) {
      this.snippets = snippets;
    } else {
      // Merge, skip duplicates by ID
      const existingIds = new Set(this.snippets.map(s => s.id));
      const newSnippets = snippets.filter(s => !existingIds.has(s.id));
      this.snippets.push(...newSnippets);
    }
    this.save();
    return snippets.length;
  }

  /**
   * Export all snippets
   */
  export(): CommandSnippet[] {
    return [...this.snippets];
  }

  /**
   * Get all snippets with hotkeys (for backward compatibility)
   */
  getHotkeys(): { id: string; key: string; command: string; description?: string }[] {
    return this.snippets
      .filter(s => s.hotkey)
      .map(s => ({
        id: s.id,
        key: s.hotkey!,
        command: s.command,
        description: s.description,
      }));
  }
}

// Singleton instance
export const snippetStore = new SnippetStore();

// Helper function for backward compatibility with existing code
export function getCustomHotkeys(): { id: string; key: string; command: string; description?: string }[] {
  return snippetStore.getHotkeys();
}

// React hook for using snippets
export function useSnippets() {
  const [snippets, setSnippets] = React.useState<CommandSnippet[]>(snippetStore.getAll());

  React.useEffect(() => {
    const unsubscribe = snippetStore.subscribe(() => {
      setSnippets(snippetStore.getAll());
    });
    return unsubscribe;
  }, []);

  return {
    snippets,
    add: snippetStore.add.bind(snippetStore),
    update: snippetStore.update.bind(snippetStore),
    delete: snippetStore.delete.bind(snippetStore),
    search: snippetStore.search.bind(snippetStore),
    getForContext: snippetStore.getForContext.bind(snippetStore),
    getByHotkey: snippetStore.getByHotkey.bind(snippetStore),
    getCategories: snippetStore.getCategories.bind(snippetStore),
    export: snippetStore.export.bind(snippetStore),
    import: snippetStore.import.bind(snippetStore),
  };
}

// Need to import React for the hook
import React from 'react';
