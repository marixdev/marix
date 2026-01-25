import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTerminalContext } from '../contexts/TerminalContext';
import { getThemeSync, getTheme } from '../themeService';
import '@xterm/xterm/css/xterm.css';
import { getCustomHotkeys } from '../services/snippetStore';
import { commandRecallStore } from '../services/commandRecallStore';
import SnippetPanel from './SnippetPanel';
import CommandRecallPanel from './CommandRecallPanel';

const { ipcRenderer } = window.electron;

interface Props {
  connectionId: string;
  theme?: string;
  server?: {
    id?: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    groupId?: string;
  };
  showSnippetPanel?: boolean;
}

const XTermTerminal: React.FC<Props> = ({ connectionId, theme = 'Dracula', server, showSnippetPanel = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { getTerminal, createTerminal, applyTheme } = useTerminalContext();
  const instanceRef = useRef<any>(null);
  const [bgColor, setBgColor] = useState('#282a36'); // Default Dracula background
  const [snippetPanelCollapsed, setSnippetPanelCollapsed] = useState(false);
  const [snippetPanelVisible, setSnippetPanelVisible] = useState(showSnippetPanel);
  
  // Command Recall Panel state
  const [commandRecallPanelVisible, setCommandRecallPanelVisible] = useState(true);
  const [commandRecallPanelCollapsed, setCommandRecallPanelCollapsed] = useState(true); // Start collapsed
  const inputBufferRef = useRef<string>('');

  // Determine if theme is dark based on background color luminance
  const isDarkTheme = useMemo(() => {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }, [bgColor]);

  // Handle inserting command from snippet panel (without execution)
  const handleInsertCommand = useCallback((command: string) => {
    const instance = instanceRef.current;
    if (instance && instance.isReady) {
      // Write command to terminal WITHOUT '\r' - user must press Enter to execute
      ipcRenderer.invoke('ssh:writeShell', connectionId, command);
      // Update input buffer for command recall
      inputBufferRef.current = command;
      console.log('[XTermTerminal] Snippet inserted:', command);
      // Focus back to terminal
      instance.xterm.focus();
    }
  }, [connectionId]);

  // Handle command recall selection
  const handleRecallCommand = useCallback((command: string) => {
    const instance = instanceRef.current;
    if (instance && instance.isReady) {
      // Clear current input first (if any)
      // Send Ctrl+U to clear line, then write command
      ipcRenderer.invoke('ssh:writeShell', connectionId, '\x15' + command);
      inputBufferRef.current = command;
      console.log('[XTermTerminal] Command recalled:', command);
      instance.xterm.focus();
    }
  }, [connectionId]);

  // Handle save command as snippet - navigate to snippet page with pre-filled command
  const handleSaveAsSnippet = useCallback((command: string) => {
    // Dispatch custom event to navigate to snippets page and open editor with pre-filled data
    window.dispatchEvent(new CustomEvent('navigateToSnippets'));
    // Small delay to allow navigation, then open the editor
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openSnippetEditor', {
        detail: {
          command,
          category: 'Custom',
        }
      }));
    }, 100);
    console.log('[XTermTerminal] Save as snippet requested:', command);
  }, []);

  // Handle right-click to paste directly
  const handleRightClickPaste = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const text = await navigator.clipboard.readText();
      if (text && instanceRef.current?.isReady) {
        ipcRenderer.invoke('ssh:writeShell', connectionId, text);
        // Update input buffer with pasted text
        for (const char of text) {
          if (char.charCodeAt(0) >= 32 && char !== '\n' && char !== '\r') {
            inputBufferRef.current += char;
          }
        }
        instanceRef.current.xterm.focus();
      }
    } catch (err) {
      console.error('[XTermTerminal] Paste error:', err);
    }
  }, [connectionId]);

  // Get background color from theme
  useEffect(() => {
    const themeData = getThemeSync(theme);
    if (themeData?.background) {
      setBgColor(themeData.background);
    }
    // Also try async load for non-inline themes
    getTheme(theme).then(data => {
      if (data?.background) {
        setBgColor(data.background);
      }
    });
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Check if terminal already exists
    let instance = getTerminal(connectionId);
    
    if (instance) {
      // Reattach existing terminal
      console.log('[XTermTerminal] Reattaching terminal:', connectionId);
      containerRef.current.appendChild(instance.element);
      
      // Refit and send size to SSH
      setTimeout(() => {
        instance!.fitAddon.fit();
        const { cols, rows } = instance!.xterm;
        console.log('[XTermTerminal] Refit size:', cols, 'x', rows);
        ipcRenderer.invoke('ssh:resizeShell', connectionId, cols, rows);
      }, 100);
      
      instanceRef.current = instance;
    } else {
      // Create new terminal with theme and config for auto-reconnect
      console.log('[XTermTerminal] Creating terminal:', connectionId);
      const config = server ? {
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password,
      } : undefined;
      instance = createTerminal(connectionId, containerRef.current, theme, config);
      instanceRef.current = instance;
    }

    // Handle window resize
    const handleResize = () => {
      if (instanceRef.current) {
        instanceRef.current.fitAddon.fit();
        if (instanceRef.current.isReady) {
          const { cols, rows } = instanceRef.current.xterm;
          ipcRenderer.invoke('ssh:resizeShell', connectionId, cols, rows);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Detach but don't destroy
      if (instanceRef.current && instanceRef.current.element.parentElement) {
        instanceRef.current.element.parentElement.removeChild(instanceRef.current.element);
      }
    };
  }, [connectionId]);

  // Apply theme when it changes
  useEffect(() => {
    if (theme && instanceRef.current) {
      applyTheme(connectionId, theme);
    }
  }, [theme, connectionId]);

  // Global hotkey handler for this terminal instance
  useEffect(() => {
    const handleGlobalHotkey = (e: KeyboardEvent) => {
      // Only handle if this terminal's container is in the DOM and visible
      if (!wrapperRef.current || !document.body.contains(wrapperRef.current)) return;
      
      // Check if terminal container or its children have focus
      const activeElement = document.activeElement;
      const isTerminalFocused = wrapperRef.current.contains(activeElement);
      
      // Tab key for Command Recall Panel toggle (when input is empty)
      // Allow Tab to work even if terminal isn't focused (as long as it's visible)
      if (e.key === 'Tab' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        // Only trigger if command recall is enabled and input buffer is empty
        if (commandRecallStore.isEnabled() && inputBufferRef.current.trim() === '') {
          e.preventDefault();
          e.stopPropagation();
          // Toggle panel expand/collapse
          if (commandRecallPanelCollapsed) {
            setCommandRecallPanelCollapsed(false);
          }
          // Re-focus terminal after toggle
          instanceRef.current?.xterm.focus();
          return;
        }
      }
      
      // For other hotkeys, require terminal to be focused
      if (!isTerminalFocused) return;
      
      // Check for Ctrl+Shift+[key] (Windows/Linux) or Cmd+Shift+[key] (Mac)
      const isModifierPressed = (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey;
      
      if (isModifierPressed) {
        const pressedKey = e.key.toLowerCase();
        const hotkeys = getCustomHotkeys();
        console.log('[XTermTerminal] Hotkey check:', pressedKey, 'available:', hotkeys.length);
        const hotkey = hotkeys.find(h => h.key.toLowerCase() === pressedKey);
        
        if (hotkey) {
          e.preventDefault();
          e.stopPropagation();
          
          const instance = instanceRef.current;
          console.log('[XTermTerminal] Found hotkey, terminal ready:', instance?.isReady);
          if (instance && instance.isReady) {
            // Send command to terminal (paste only, no Enter)
            ipcRenderer.invoke('ssh:writeShell', connectionId, hotkey.command);
            // Track in input buffer
            inputBufferRef.current += hotkey.command;
            console.log('[XTermTerminal] Hotkey pasted:', pressedKey, '->', hotkey.command);
          }
        }
      }
    };
    
    // Use capture phase to intercept before other handlers
    window.addEventListener('keydown', handleGlobalHotkey, true);
    console.log('[XTermTerminal] Global hotkey listener added for:', connectionId);
    
    return () => {
      window.removeEventListener('keydown', handleGlobalHotkey, true);
    };
  }, [connectionId]);

  // Command capture for Command Recall feature
  // Use xterm's onData event to capture actual terminal input
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !server?.id) return;

    const serverId = server.id;
    const xterm = instance.xterm;
    
    // Track input buffer using xterm's onData event
    // This captures what is actually sent to the terminal
    const onDataDispose = xterm.onData((data: string) => {
      // Enter key (carriage return)
      if (data === '\r' || data === '\n') {
        const command = inputBufferRef.current.trim();
        if (command && commandRecallStore.isEnabled()) {
          // Add command to recall history
          commandRecallStore.addCommand(serverId, command);
          console.log('[XTermTerminal] Command captured:', command);
        }
        // Clear buffer after command submission
        inputBufferRef.current = '';
      }
      // Backspace (DEL character \x7f or BS \x08)
      else if (data === '\x7f' || data === '\x08') {
        inputBufferRef.current = inputBufferRef.current.slice(0, -1);
      }
      // Ctrl+U (clear line) - \x15
      else if (data === '\x15') {
        inputBufferRef.current = '';
      }
      // Ctrl+C (interrupt) - \x03
      else if (data === '\x03') {
        inputBufferRef.current = '';
      }
      // Ctrl+W (delete word) - \x17
      else if (data === '\x17') {
        // Remove last word
        inputBufferRef.current = inputBufferRef.current.replace(/\S+\s*$/, '');
      }
      // Arrow keys and other control sequences (start with \x1b)
      else if (data.startsWith('\x1b')) {
        // Clear buffer on arrow up/down (history navigation breaks our tracking)
        if (data === '\x1b[A' || data === '\x1b[B') {
          inputBufferRef.current = '';
        }
        // Ignore other escape sequences (arrows, etc.)
      }
      // Tab (might trigger completion, don't add to buffer for now since we use Tab for recall)
      else if (data === '\t') {
        // Ignore tab
      }
      // Regular printable characters
      else if (data.length === 1 && data.charCodeAt(0) >= 32) {
        inputBufferRef.current += data;
      }
      // Pasted text (multiple characters at once)
      else if (data.length > 1 && !data.startsWith('\x1b')) {
        // Filter out control characters and add printable ones
        for (const char of data) {
          if (char.charCodeAt(0) >= 32) {
            inputBufferRef.current += char;
          }
        }
      }
    });
    
    return () => {
      onDataDispose.dispose();
    };
  }, [server?.id, instanceRef.current]);

  return (
    <div className="flex w-full h-full" style={{ backgroundColor: bgColor }}>
      {/* Command Recall Panel - Left side */}
      {server?.id && commandRecallPanelVisible && commandRecallStore.isEnabled() && (
        <CommandRecallPanel
          theme={isDarkTheme ? 'dark' : 'light'}
          serverId={server.id}
          onInsertCommand={handleRecallCommand}
          onSaveAsSnippet={handleSaveAsSnippet}
          isCollapsed={commandRecallPanelCollapsed}
          onToggleCollapse={() => setCommandRecallPanelCollapsed(!commandRecallPanelCollapsed)}
        />
      )}
      
      {/* Terminal Container */}
      <div 
        ref={wrapperRef}
        className="flex-1 h-full p-2 min-w-0"
        onContextMenu={handleRightClickPaste}
      >
        <div 
          ref={containerRef} 
          className="w-full h-full"
        />
      </div>
      
      {/* Snippet Panel - Right side */}
      {snippetPanelVisible && (
        <SnippetPanel
          theme={isDarkTheme ? 'dark' : 'light'}
          hostId={server?.id}
          groupId={server?.groupId}
          onInsertCommand={handleInsertCommand}
          onClose={() => setSnippetPanelVisible(false)}
          isCollapsed={snippetPanelCollapsed}
          onToggleCollapse={() => setSnippetPanelCollapsed(!snippetPanelCollapsed)}
        />
      )}
    </div>
  );
};

export default React.memo(XTermTerminal);
