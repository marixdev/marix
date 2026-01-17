import React, { useEffect, useRef, useState } from 'react';
import { ipcRenderer } from 'electron';
import { useTerminalContext } from '../contexts/TerminalContext';
import { terminalThemes } from '../themes';
import '@xterm/xterm/css/xterm.css';

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
