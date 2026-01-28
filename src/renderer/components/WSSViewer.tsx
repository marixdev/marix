import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getThemeSync, getTheme } from '../themeService';
import { ITheme } from '@xterm/xterm';
import ThemeSelector from './ThemeSelector';
import { useLanguage } from '../contexts/LanguageContext';

const { ipcRenderer } = window.electron;

interface WSSViewerProps {
  connectionId: string;
  serverName?: string;
  url: string;
  theme?: string;
  initialStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  initialError?: string;
  onThemeChange?: (theme: string) => void;
  onConnect?: () => void;
  onClose?: () => void;
  onError?: (error: string) => void;
}

interface Message {
  id: number;
  type: 'sent' | 'received';
  content: string;
  timestamp: Date;
}

const WSSViewer: React.FC<WSSViewerProps> = ({
  connectionId,
  serverName,
  url,
  theme = 'Dracula',
  initialStatus = 'connecting',
  initialError,
  onThemeChange,
  onConnect,
  onClose,
  onError,
}) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(initialStatus);
  const [currentConnectionId, setCurrentConnectionId] = useState(connectionId);
  const [errorMessage, setErrorMessage] = useState<string>(initialError || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [loadedTheme, setLoadedTheme] = useState<ITheme | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);

  // Load theme data
  useEffect(() => {
    // First set sync theme
    setLoadedTheme(getThemeSync(currentTheme));
    // Then load async
    getTheme(currentTheme).then(setLoadedTheme);
  }, [currentTheme]);

  // Handle theme change
  const handleThemeChange = (newTheme: string) => {
    setCurrentTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  // Get theme colors
  const themeColors = useMemo(() => {
    const t = loadedTheme || getThemeSync('Dracula');
    return {
      background: t.background || '#282a36',
      foreground: t.foreground || '#f8f8f2',
      cursor: t.cursor || '#f8f8f2',
      selectionBackground: t.selectionBackground || '#44475a',
      black: t.black || '#21222c',
      red: t.red || '#ff5555',
      green: t.green || '#50fa7b',
      yellow: t.yellow || '#f1fa8c',
      blue: t.blue || '#bd93f9',
      magenta: t.magenta || '#ff79c6',
      cyan: t.cyan || '#8be9fd',
      white: t.white || '#f8f8f2',
    };
  }, [loadedTheme]);

  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    console.log('[WSSViewer] Setting up listeners for connectionId:', currentConnectionId);
    
    // Note: preload strips the event parameter, so handlers receive args directly
    const handleConnect = (receivedId: string) => {
      console.log('[WSSViewer] Connect event - received:', receivedId, 'expected:', currentConnectionId);
      if (receivedId === currentConnectionId) {
        console.log('[WSSViewer] Connected event matched!');
        setStatus('connected');
        setErrorMessage('');
        onConnect?.();
      }
    };

    const handleMessage = (receivedId: string, message: string) => {
      console.log('[WSSViewer] Message event - received:', receivedId, 'expected:', currentConnectionId);
      if (receivedId === currentConnectionId) {
        console.log('[WSSViewer] Message matched:', message.substring(0, 100));
        // Try to parse as JSON for better formatting
        let content = message;
        try {
          const parsed = JSON.parse(message);
          content = JSON.stringify(parsed, null, 2);
        } catch {
          // Keep as is if not JSON
        }
        
        setMessages(prev => [...prev, {
          id: messageIdRef.current++,
          type: 'received',
          content,
          timestamp: new Date(),
        }]);
      }
    };

    // Note: preload strips the event parameter
    const handleClose = (receivedId: string) => {
      if (receivedId === currentConnectionId) {
        console.log('[WSSViewer] Close event received:', receivedId);
        setStatus('disconnected');
      }
    };

    // Note: preload strips the event parameter  
    const handleError = (receivedId: string, error: string) => {
      if (receivedId === currentConnectionId) {
        console.log('[WSSViewer] Error event received:', receivedId, error);
        setStatus('error');
        setErrorMessage(error);
        onError?.(error);
      }
    };

    // Use specific event names with handler references for proper cleanup
    ipcRenderer.on('wss:connect', handleConnect);
    ipcRenderer.on('wss:message', handleMessage);
    ipcRenderer.on('wss:close', handleClose);
    ipcRenderer.on('wss:error', handleError);

    return () => {
      // Remove only our handlers, not all listeners
      ipcRenderer.removeListener('wss:connect', handleConnect);
      ipcRenderer.removeListener('wss:message', handleMessage);
      ipcRenderer.removeListener('wss:close', handleClose);
      ipcRenderer.removeListener('wss:error', handleError);
    };
  }, [currentConnectionId, onConnect, onClose, onError]);

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    console.log('[WSSViewer] Sending message via connectionId:', currentConnectionId);
    const result = await ipcRenderer.invoke('wss:send', currentConnectionId, inputMessage);
    if (result.success) {
      setMessages(prev => [...prev, {
        id: messageIdRef.current++,
        type: 'sent',
        content: inputMessage,
        timestamp: new Date(),
      }]);
      setInputMessage('');
    } else {
      console.log('[WSSViewer] Send failed:', result.error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDisconnect = () => {
    ipcRenderer.invoke('wss:disconnect', currentConnectionId);
  };

  const handleReconnect = async () => {
    // Disconnect existing if any
    await ipcRenderer.invoke('wss:disconnect', currentConnectionId);
    
    // Create new connection ID
    const newConnectionId = `wss-${Date.now()}`;
    setCurrentConnectionId(newConnectionId);
    setStatus('connecting');
    setErrorMessage('');
    
    console.log('[WSSViewer] Reconnecting with new ID:', newConnectionId);
    
    const result = await ipcRenderer.invoke('wss:connect', newConnectionId, { url });
    if (result.success) {
      setStatus('connected');
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Connection failed');
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  // Derive darker shade for header/input areas
  const darkenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  const headerBg = darkenColor(themeColors.background, 5);
  const inputBg = darkenColor(themeColors.background, 3);

  return (
    <div 
      className="flex-1 flex flex-col h-full"
      style={{ backgroundColor: themeColors.background, color: themeColors.foreground }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ backgroundColor: headerBg, borderColor: themeColors.black }}
      >
        <div className="flex items-center gap-3">
          {/* WSS Protocol Icon */}
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium" style={{ color: themeColors.foreground }}>{serverName || 'WebSocket'}</h3>
            <p className="text-xs truncate max-w-md" style={{ color: themeColors.cyan }}>{url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSelector
            currentTheme={currentTheme}
            onThemeChange={handleThemeChange}
            direction="down"
          />
          <span 
            className="text-xs px-2 py-1 rounded"
            style={{ 
              backgroundColor: status === 'connected' ? `${themeColors.green}33` :
                              status === 'connecting' ? `${themeColors.yellow}33` :
                              status === 'error' ? `${themeColors.red}33` : `${themeColors.white}33`,
              color: status === 'connected' ? themeColors.green :
                     status === 'connecting' ? themeColors.yellow :
                     status === 'error' ? themeColors.red : themeColors.white
            }}
          >
            {status === 'connected' ? t('connected') :
             status === 'connecting' ? t('connecting') :
             status === 'disconnected' ? t('disconnected') : t('error')}
          </span>
          <button
            onClick={clearMessages}
            className="p-2 rounded transition hover:opacity-80"
            style={{ color: themeColors.foreground }}
            title="Clear messages"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          {status === 'connected' || status === 'connecting' ? (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 text-white text-xs font-medium rounded transition hover:opacity-80"
              style={{ backgroundColor: themeColors.red }}
            >
              {t('disconnect')}
            </button>
          ) : (
            <button
              onClick={handleReconnect}
              className="px-3 py-1.5 text-white text-xs font-medium rounded transition hover:opacity-80"
              style={{ backgroundColor: themeColors.cyan, color: themeColors.background }}
            >
              {t('reconnect')}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
        {status === 'connecting' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div 
                className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3"
                style={{ borderColor: themeColors.cyan }}
              ></div>
              <p style={{ color: themeColors.foreground }}>{t('connecting')}...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3" style={{ color: themeColors.red }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="mb-4" style={{ color: themeColors.red }}>{errorMessage || t('wssConnectionError')}</p>
              <button
                onClick={handleReconnect}
                className="px-4 py-2 rounded font-medium transition hover:opacity-80"
                style={{ backgroundColor: themeColors.cyan, color: themeColors.background }}
              >
                {t('reconnect')}
              </button>
            </div>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3" style={{ color: themeColors.yellow }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a5 5 0 000-7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <p className="mb-4" style={{ color: themeColors.foreground }}>{t('disconnected')}</p>
              <button
                onClick={handleReconnect}
                className="px-4 py-2 rounded font-medium transition hover:opacity-80"
                style={{ backgroundColor: themeColors.cyan, color: themeColors.background }}
              >
                {t('reconnect')}
              </button>
            </div>
          </div>
        )}

        {status === 'connected' && messages.length === 0 && (
          <div className="flex items-center justify-center h-full" style={{ color: themeColors.white + '80' }}>
            {t('wssNoMessages')}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg border ${msg.type === 'sent' ? 'ml-8' : 'mr-8'}`}
            style={{
              backgroundColor: msg.type === 'sent' ? `${themeColors.green}15` : `${themeColors.black}80`,
              borderColor: msg.type === 'sent' ? `${themeColors.green}40` : themeColors.black
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span 
                className="text-xs font-medium"
                style={{ color: msg.type === 'sent' ? themeColors.green : themeColors.magenta }}
              >
                {msg.type === 'sent' ? `↑ ${t('wssSent')}` : `↓ ${t('wssReceived')}`}
              </span>
              <span className="text-xs" style={{ color: themeColors.white + '60' }}>{formatTime(msg.timestamp)}</span>
            </div>
            <pre 
              className="whitespace-pre-wrap break-all text-xs"
              style={{ color: themeColors.foreground }}
            >{msg.content}</pre>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {status === 'connected' && (
        <div className="p-4 border-t" style={{ borderColor: themeColors.black }}>
          <div className="flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('wssTypeMessage')}
              className="flex-1 rounded-lg px-4 py-3 text-sm resize-none font-mono focus:outline-none"
              style={{ 
                backgroundColor: inputBg, 
                color: themeColors.foreground,
                borderWidth: 1,
                borderColor: themeColors.black
              }}
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim()}
              className="px-6 font-medium rounded-lg transition disabled:opacity-50"
              style={{ 
                backgroundColor: inputMessage.trim() ? themeColors.cyan : themeColors.black,
                color: inputMessage.trim() ? themeColors.black : themeColors.white + '60'
              }}
            >
              {t('wssSend')}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: themeColors.foreground + 'aa' }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
                style={{ accentColor: themeColors.cyan }}
              />
              {t('wssAutoScroll')}
            </label>
            <span className="text-xs" style={{ color: themeColors.foreground + '80' }}>{messages.length} {t('wssMessages')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WSSViewer;
