import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ipcRenderer } from 'electron';
import { useTerminalContext } from '../contexts/TerminalContext';
import { terminalThemes } from '../themes';
import '@xterm/xterm/css/xterm.css';
import { getCustomHotkeys } from '../services/snippetStore';
import SnippetPanel from './SnippetPanel';

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
      console.log('[XTermTerminal] Snippet inserted:', command);
      // Focus back to terminal
      instance.xterm.focus();
    }
  }, [connectionId]);

  // Get background color from theme
  useEffect(() => {
    const found = terminalThemes.find(t => t.name === theme);
    if (found?.theme?.background) {
      setBgColor(found.theme.background);
    }
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

  return (
    <div className="flex w-full h-full" style={{ backgroundColor: bgColor }}>
      {/* Terminal Container */}
      <div 
        ref={wrapperRef}
        className="flex-1 h-full p-2 min-w-0"
      >
        <div 
          ref={containerRef} 
          className="w-full h-full"
        />
      </div>
      
      {/* Snippet Panel */}
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
