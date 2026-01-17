import React, { useEffect, useRef } from 'react';
import { ipcRenderer } from 'electron';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { getThemeByName } from '../themes';

interface Props {
  connectionId: string;
  theme?: string;
}

// Global registry to persist terminals across React lifecycle
const terminals = new Map<string, {
  xterm: XTerm;
  fitAddon: FitAddon;
  container: HTMLDivElement;
  isShellReady: boolean;
}>();

const Terminal: React.FC<Props> = ({ connectionId, theme = 'Dracula' }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Check if terminal already exists
    let terminal = terminals.get(connectionId);
    
    if (terminal) {
      // Reattach existing terminal
      console.log('[Terminal] Reattaching existing terminal:', connectionId);
      mountRef.current.appendChild(terminal.container);
      
      // Update theme if needed
      const selectedTheme = getThemeByName(theme);
      terminal.xterm.options.theme = selectedTheme;
      
      // Refit
      setTimeout(() => terminal!.fitAddon.fit(), 100);
      
      return () => {
        // Detach but don't destroy
        if (terminal!.container.parentElement) {
          terminal!.container.parentElement.removeChild(terminal!.container);
        }
      };
    }

    // Create new terminal
    console.log('[Terminal] Creating new terminal:', connectionId);
    const selectedTheme = getThemeByName(theme);
    
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      lineHeight: 1.5,
      theme: selectedTheme,
      scrollback: 10000,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    // Create container
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    mountRef.current.appendChild(container);
    
    xterm.open(container);
    setTimeout(() => fitAddon.fit(), 100);

    // Store terminal
    terminal = {
      xterm,
      fitAddon,
      container,
      isShellReady: false
    };
    terminals.set(connectionId, terminal);

    // Setup IPC listeners
    const handleData = (_: any, connId: string, data: string) => {
      if (connId === connectionId) {
        xterm.write(data);
      }
    };

    const handleClose = (_: any, connId: string) => {
      if (connId === connectionId) {
        xterm.writeln('\r\n\x1b[33mConnection closed\x1b[0m');
        const t = terminals.get(connectionId);
        if (t) t.isShellReady = false;
      }
    };

    ipcRenderer.on('ssh:shellData', handleData);
    ipcRenderer.on('ssh:shellClose', handleClose);

    // Handle user input
    const onDataDisposable = xterm.onData(async (data) => {
      const t = terminals.get(connectionId);
      if (t && t.isShellReady) {
        await ipcRenderer.invoke('ssh:writeShell', connectionId, data);
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      const t = terminals.get(connectionId);
      if (t && t.isShellReady) {
        ipcRenderer.invoke('ssh:resizeShell', connectionId, xterm.cols, xterm.rows);
      }
    };
    window.addEventListener('resize', handleResize);

    // Initialize shell
    const initShell = async () => {
      try {
        const result = await ipcRenderer.invoke('ssh:createShell', connectionId, xterm.cols, xterm.rows);
        if (result.success) {
          terminal!.isShellReady = true;
          console.log('[Terminal] Shell ready for:', connectionId);
        } else {
          xterm.writeln(`\x1b[31mShell creation failed: ${result.error}\x1b[0m`);
        }
      } catch (err: any) {
        xterm.writeln(`\x1b[31mError: ${err.message}\x1b[0m`);
      }
    };
    initShell();

    return () => {
      // Cleanup on unmount
      ipcRenderer.removeListener('ssh:shellData', handleData);
      ipcRenderer.removeListener('ssh:shellClose', handleClose);
      onDataDisposable.dispose();
      window.removeEventListener('resize', handleResize);
      
      // Detach container
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }
    };
  }, [connectionId, theme]);

  return <div ref={mountRef} className="w-full h-full" />;
};

// Cleanup when session is closed
export const disposeTerminal = (connectionId: string) => {
  const terminal = terminals.get(connectionId);
  if (terminal) {
    console.log('[Terminal] Disposing:', connectionId);
    terminal.xterm.dispose();
    terminals.delete(connectionId);
  }
};

export default Terminal;
