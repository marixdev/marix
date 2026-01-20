import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const { ipcRenderer } = window.require('electron');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInstallComplete: () => void;
  theme?: 'dark' | 'light';
}

interface DependencyStatus {
  xfreerdp3: boolean;
  xdotool: boolean;
  distro: 'debian' | 'fedora' | 'arch' | 'unknown';
}

const RDPDepsInstaller: React.FC<Props> = ({ isOpen, onClose, onInstallComplete, theme = 'dark' }) => {
  const [deps, setDeps] = useState<DependencyStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installComplete, setInstallComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Initialize xterm
  useEffect(() => {
    if (!isOpen || !terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: false,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
      theme: theme === 'dark' ? {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        black: '#45475a',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#f5c2e7',
        cyan: '#94e2d5',
        white: '#bac2de',
      } : {
        background: '#ffffff',
        foreground: '#1e1e2e',
        cursor: '#1e1e2e',
        black: '#45475a',
        red: '#d20f39',
        green: '#40a02b',
        yellow: '#df8e1d',
        blue: '#1e66f5',
        magenta: '#ea76cb',
        cyan: '#179299',
        white: '#4c4f69',
      },
      convertEol: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    setTimeout(() => fitAddon.fit(), 100);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleResize = () => {
      setTimeout(() => fitAddon.fit(), 100);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [isOpen, theme]);

  // Check dependencies when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setChecking(true);
    setInstalling(false);
    setInstallComplete(false);
    setError(null);

    const checkDeps = async () => {
      try {
        const result = await ipcRenderer.invoke('rdp:checkDeps');
        if (result.success) {
          setDeps(result.deps);
          
          // If all deps installed, notify and close
          if (result.deps.xfreerdp3 && result.deps.xdotool) {
            onInstallComplete();
          }
        } else {
          setError(result.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setChecking(false);
      }
    };

    checkDeps();
  }, [isOpen]);

  // Listen for installation output
  useEffect(() => {
    const handleOutput = (_event: any, data: string) => {
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    };

    ipcRenderer.on('rdp:installOutput', handleOutput);

    return () => {
      ipcRenderer.removeListener('rdp:installOutput', handleOutput);
    };
  }, []);

  const handleInstall = async () => {
    if (!deps) return;

    setInstalling(true);
    setError(null);

    // Clear terminal
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.writeln('\x1b[33m🚀 Installing RDP dependencies...\x1b[0m\n');
    }

    try {
      const result = await ipcRenderer.invoke('rdp:installDeps');
      
      if (result.success) {
        setInstallComplete(true);
        if (xtermRef.current) {
          xtermRef.current.writeln('\n\x1b[32m✓ Installation complete! You can now connect to RDP servers.\x1b[0m');
        }
        
        // Re-check dependencies
        const checkResult = await ipcRenderer.invoke('rdp:checkDeps');
        if (checkResult.success) {
          setDeps(checkResult.deps);
        }
      } else {
        setError(result.error || 'Installation failed');
        if (xtermRef.current) {
          xtermRef.current.writeln(`\n\x1b[31m✗ Installation failed: ${result.error}\x1b[0m`);
        }
      }
    } catch (err: any) {
      setError(err.message);
      if (xtermRef.current) {
        xtermRef.current.writeln(`\n\x1b[31m✗ Error: ${err.message}\x1b[0m`);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleContinue = () => {
    onInstallComplete();
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  // Get distro display name
  const getDistroName = (distro: string) => {
    switch (distro) {
      case 'debian': return 'Debian/Ubuntu';
      case 'fedora': return 'Fedora/RHEL';
      case 'arch': return 'Arch Linux';
      default: return 'Linux';
    }
  };

  // Get package names for display
  const getPackageNames = () => {
    if (!deps) return '';
    const packages: string[] = [];
    if (!deps.xfreerdp3) {
      packages.push(deps.distro === 'debian' ? 'freerdp3-x11' : 'freerdp');
    }
    if (!deps.xdotool) {
      packages.push('xdotool');
    }
    return packages.join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`relative w-[700px] max-h-[80vh] rounded-xl shadow-2xl border overflow-hidden ${
        isDark 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                RDP Dependencies Required
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {deps ? getDistroName(deps.distro) : 'Linux'} detected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={installing}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-gray-700 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-500'
            } ${installing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {checking ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                  Checking dependencies...
                </span>
              </div>
            </div>
          ) : error && !installing ? (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          ) : deps && (!deps.xfreerdp3 || !deps.xdotool) ? (
            <>
              {/* Dependency status */}
              <div className="space-y-3 mb-4">
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  The following packages are required for RDP connections:
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* xfreerdp3 */}
                  <div className={`p-3 rounded-lg border ${
                    isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {deps.xfreerdp3 ? (
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 text-green-400">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-amber-400">
                            <path d="M12 9v2m0 4h.01" />
                          </svg>
                        </div>
                      )}
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        xfreerdp3
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      FreeRDP client for RDP connections
                    </p>
                  </div>

                  {/* xdotool */}
                  <div className={`p-3 rounded-lg border ${
                    isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {deps.xdotool ? (
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 text-green-400">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-amber-400">
                            <path d="M12 9v2m0 4h.01" />
                          </svg>
                        </div>
                      )}
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        xdotool
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Window automation for RDP focus
                    </p>
                  </div>
                </div>

                {!installComplete && (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Click "Install" to automatically install: <code className={`px-1.5 py-0.5 rounded text-xs ${
                      isDark ? 'bg-gray-800 text-cyan-400' : 'bg-gray-100 text-cyan-600'
                    }`}>{getPackageNames()}</code>
                  </p>
                )}
              </div>

              {/* Terminal output */}
              <div className={`rounded-lg border overflow-hidden ${
                isDark ? 'border-gray-700' : 'border-gray-300'
              }`}>
                <div ref={terminalRef} className="h-[250px]" />
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-green-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                All Dependencies Installed
              </h3>
              <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                You're ready to connect to RDP servers!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${
          isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'
        }`}>
          <button
            onClick={onClose}
            disabled={installing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDark 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } ${installing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>
          
          {deps && (!deps.xfreerdp3 || !deps.xdotool) && !installComplete ? (
            <button
              onClick={handleInstall}
              disabled={installing || checking}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                installing 
                  ? 'bg-blue-600/50 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500'
              } text-white`}
            >
              {installing && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {installing ? 'Installing...' : 'Install Dependencies'}
            </button>
          ) : installComplete || (deps?.xfreerdp3 && deps?.xdotool) ? (
            <button
              onClick={handleContinue}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors"
            >
              Continue to Connect
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RDPDepsInstaller;
