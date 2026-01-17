import React, { useEffect, useRef, useState } from 'react';
import { ipcRenderer } from 'electron';
import { useTerminalContext } from '../contexts/TerminalContext';
import { terminalThemes } from '../themes';
import '@xterm/xterm/css/xterm.css';
import { getCustomHotkeys } from './HotkeyPage';

interface Props {
  connectionId: string;
  theme?: string;
  server?: {
    host: string;
    port: number;
    username: string;
    password?: string;
  };
}

const XTermTerminal: React.FC<Props> = ({ connectionId, theme = 'Dracula', server }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { getTerminal, createTerminal, applyTheme } = useTerminalContext();
  const instanceRef = useRef<any>(null);
  const [bgColor, setBgColor] = useState('#282a36'); // Default Dracula background

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
            // Send command to terminal with Enter key
            ipcRenderer.invoke('ssh:writeShell', connectionId, hotkey.command + '\r');
            console.log('[XTermTerminal] Hotkey executed:', pressedKey, '->', hotkey.command);
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
    <div 
      ref={wrapperRef}
      className="w-full h-full p-2"
      style={{ backgroundColor: bgColor }}
    >
      <div 
        ref={containerRef} 
        className="w-full h-full"
      />
    </div>
  );
};

export default React.memo(XTermTerminal);
