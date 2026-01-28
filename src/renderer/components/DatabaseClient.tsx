import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import SQLEditor from './SQLEditor';
import ERDDiagram from './ERDDiagram';

const { ipcRenderer } = window.electron;

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface DatabaseClientProps {
  server: {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    protocol: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite';
    database?: string;
    sslEnabled?: boolean;
    mongoUri?: string;
    sqliteFile?: string;
  };
  connectionId: string;
  theme?: 'dark' | 'light';
  onClose?: () => void;
  onDbInfo?: (info: { version: string; ip: string; provider: string }) => void;
}

interface TableInfo {
  name: string;
  type: 'table' | 'view' | 'collection';
  columns?: ColumnInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key?: string;
  default?: string | null;
  extra?: string;
}

interface QueryResult {
  columns: string[];
  rows: any[];
  affectedRows?: number;
  insertId?: number;
  executionTime: number;
  error?: string;
  success?: boolean;
}

type TabType = 'data' | 'query' | 'structure' | 'erd' | 'import-export';

// =============================================================================
// SVG ICONS - Unified Database Icon
// =============================================================================

// Unified database cylinder icon used for all database types
const UnifiedDatabaseIcon = (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#64748b" strokeWidth="1.5">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
  </svg>
);

const Icons = {
  // All database types use the same unified icon
  mysql: UnifiedDatabaseIcon,
  postgresql: UnifiedDatabaseIcon,
  mongodb: UnifiedDatabaseIcon,
  redis: UnifiedDatabaseIcon,
  sqlite: UnifiedDatabaseIcon,
  table: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  view: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  collection: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  data: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  query: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  structure: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  erd: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  importExport: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  file: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  folder: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  key: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevronLeft: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>,
  chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>,
};

// =============================================================================
// PROTOCOL CONFIGURATIONS
// =============================================================================

const PROTOCOL_CONFIG = {
  mysql: {
    icon: 'mysql' as keyof typeof Icons,
    name: 'MySQL',
    color: 'from-blue-500 to-cyan-500',
    exportExt: '.sql',
    importTypes: '.sql,.txt',
    supportsStructure: true,
    supportsERD: true,
    supportsImportExport: true,
  },
  postgresql: {
    icon: 'postgresql' as keyof typeof Icons,
    name: 'PostgreSQL',
    color: 'from-blue-600 to-indigo-600',
    exportExt: '.sql',
    importTypes: '.sql,.txt',
    supportsStructure: true,
    supportsERD: true,
    supportsImportExport: true,
  },
  mongodb: {
    icon: 'mongodb' as keyof typeof Icons,
    name: 'MongoDB',
    color: 'from-green-500 to-emerald-500',
    exportExt: '.json',
    importTypes: '.json,.bson',
    supportsStructure: false,
    supportsERD: false,
    supportsImportExport: false, // MongoDB uses mongodump/mongorestore, not SQL import
  },
  redis: {
    icon: 'redis' as keyof typeof Icons,
    name: 'Redis',
    color: 'from-red-500 to-orange-500',
    exportExt: '.json',
    importTypes: '.json,.txt',
    supportsStructure: false,
    supportsERD: false,
    supportsImportExport: false, // Redis is key-value, doesn't support traditional import/export
  },
  sqlite: {
    icon: 'sqlite' as keyof typeof Icons,
    name: 'SQLite',
    color: 'from-sky-500 to-blue-500',
    exportExt: '.sql',
    importTypes: '.sql,.db,.sqlite',
    supportsStructure: true,
    supportsERD: true,
    supportsImportExport: true,
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DatabaseClient: React.FC<DatabaseClientProps> = ({ 
  server, 
  connectionId, 
  theme = 'dark', 
  onClose,
  onDbInfo 
}) => {
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const config = PROTOCOL_CONFIG[server.protocol] || PROTOCOL_CONFIG.mysql;

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  
  // Connection
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Database
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>(server.database || '');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  
  // Data browser
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [tableStructure, setTableStructure] = useState<ColumnInfo[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [loadingAll, setLoadingAll] = useState(false);
  const ROWS_PER_PAGE_OPTIONS = [50, 100, 200, 500, 1000];
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  
  // Query
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  
  // Import/Export
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importDropExisting, setImportDropExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  const [operationLog, setOperationLog] = useState<Array<{ type: 'success' | 'error' | 'info'; text: string }>>([]);
  const [exportOptions, setExportOptions] = useState({
    structure: true,
    data: true,
    dropTable: true,
    allTables: true,
    selectedTables: [] as string[],
  });
  
  // UI
  const [activeTab, setActiveTab] = useState<TabType>('data');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTables, setSearchTables] = useState('');
  
  // ERD
  const [erdTables, setErdTables] = useState<Array<{ name: string; columns: ColumnInfo[]; x: number; y: number }>>([]);
  const [loadingERD, setLoadingERD] = useState(false);
  
  // Edit/Context Menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: any; rowIdx: number } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editRowData, setEditRowData] = useState<Record<string, any>>({});
  const [primaryKeyColumn, setPrimaryKeyColumn] = useState<string | null>(null);
  const [savingRow, setSavingRow] = useState(false);
  
  // Remote SQLite sync
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const isRemoteSqlite = server.protocol === 'sqlite' && 
    server.host && 
    server.host !== 'localhost' && 
    server.host !== '127.0.0.1' && 
    server.host !== '::1';
  
  // Refs
  const logEndRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Connect function - can be called for initial connect or retry
  const connect = async () => {
    setConnecting(true);
    setError(null);
    
    try {
      const result = await ipcRenderer.invoke('db:connect', {
        connectionId,
        protocol: server.protocol,
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password,
        database: server.database,
        sslEnabled: server.sslEnabled,
        mongoUri: server.mongoUri,
        sqliteFile: server.sqliteFile,
        // SSH tunnel info for remote SQLite
        sshHost: server.host,
        sshPort: server.port || 22,
        sshUsername: server.username,
        sshPassword: server.password,
      });
      
      if (result.success) {
        setConnected(true);
        if (result.databases) {
          setDatabases(result.databases);
        }
        if (server.database) {
          setSelectedDatabase(server.database);
          loadTables(server.database);
        }
        
        // Fetch database version and IP info
        if (onDbInfo) {
          try {
            const versionResult = await ipcRenderer.invoke('db:getVersion', { connectionId });
            if (versionResult.success) {
              // Fetch IP info from ipinfo.io
              let ip = server.host;
              let provider = '';
              try {
                // Resolve hostname to IP if needed
                const ipInfoResult = await ipcRenderer.invoke('lookup-ip-info', server.host);
                if (ipInfoResult.success) {
                  ip = ipInfoResult.ip || server.host;
                  provider = ipInfoResult.org || '';
                }
              } catch (e) {
                console.log('[DatabaseClient] Could not fetch IP info:', e);
              }
              onDbInfo({
                version: versionResult.version || `${server.protocol} (unknown version)`,
                ip,
                provider,
              });
            }
          } catch (e) {
            console.log('[DatabaseClient] Could not fetch version:', e);
          }
        }
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      ipcRenderer.invoke('db:disconnect', { connectionId });
    };
  }, [connectionId]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [operationLog]);

  // ---------------------------------------------------------------------------
  // SYNC FUNCTION (Remote SQLite)
  // ---------------------------------------------------------------------------
  
  const syncToRemote = async () => {
    if (!isRemoteSqlite) return;
    
    setSyncing(true);
    try {
      const result = await ipcRenderer.invoke('db:syncSqlite', { connectionId });
      if (result.success) {
        setLastSynced(new Date());
        setOperationLog(prev => [...prev, { type: 'success', text: `✓ Synced to remote server: ${server.host}` }]);
      } else {
        setOperationLog(prev => [...prev, { type: 'error', text: `✗ Sync failed: ${result.error}` }]);
      }
    } catch (err: any) {
      setOperationLog(prev => [...prev, { type: 'error', text: `✗ Sync error: ${err.message}` }]);
    } finally {
      setSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // DATA FUNCTIONS
  // ---------------------------------------------------------------------------

  const loadTables = async (dbName: string) => {
    setLoadingTables(true);
    try {
      const result = await ipcRenderer.invoke('db:getTables', {
        connectionId,
        database: dbName,
      });
      
      if (result.success) {
        setTables(result.tables || []);
      }
    } catch (err: any) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoadingTables(false);
    }
  };

  const loadERDData = async () => {
    if (!selectedDatabase || !config.supportsERD) return;
    
    setLoadingERD(true);
    try {
      const erdData: Array<{ name: string; columns: ColumnInfo[]; x: number; y: number }> = [];
      const cols = Math.ceil(Math.sqrt(tables.length));
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        try {
          const structResult = await ipcRenderer.invoke('db:getTableStructure', {
            connectionId,
            database: selectedDatabase,
            table: table.name,
          });
          
          erdData.push({
            name: table.name,
            columns: structResult.success ? (structResult.columns || []) : [],
            x: col * 280 + 50,
            y: row * 250 + 50,
          });
        } catch {
          erdData.push({
            name: table.name,
            columns: [],
            x: col * 280 + 50,
            y: row * 250 + 50,
          });
        }
      }
      
      setErdTables(erdData);
    } catch (err) {
      console.error('Failed to load ERD data:', err);
    } finally {
      setLoadingERD(false);
    }
  };

  // Load ERD when tab changes
  useEffect(() => {
    if (activeTab === 'erd' && erdTables.length === 0 && tables.length > 0) {
      loadERDData();
    }
  }, [activeTab, tables]);

  const loadTableData = async (tableName: string, page: number = 1, limit: number = rowsPerPage, loadAll: boolean = false) => {
    setLoadingData(true);
    if (loadAll) setLoadingAll(true);
    setSelectedTable(tableName);
    
    try {
      const offset = (page - 1) * limit;
      
      // First, get total count
      let countQuery: string;
      if (server.protocol === 'mongodb') {
        countQuery = JSON.stringify({ collection: tableName, count: true });
      } else {
        countQuery = `SELECT COUNT(*) as total FROM ${quoteIdentifier(tableName)}`;
      }
      
      // Data query with pagination (or all if loadAll)
      let dataQuery: string;
      if (server.protocol === 'mongodb') {
        dataQuery = loadAll 
          ? JSON.stringify({ collection: tableName, limit: 0 })
          : JSON.stringify({ collection: tableName, limit, skip: offset });
      } else if (server.protocol === 'sqlite') {
        dataQuery = loadAll
          ? `SELECT * FROM ${quoteIdentifier(tableName)}`
          : `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT ${limit} OFFSET ${offset}`;
      } else {
        dataQuery = loadAll
          ? `SELECT * FROM ${quoteIdentifier(tableName)}`
          : `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT ${limit} OFFSET ${offset}`;
      }
      
      const [countResult, dataResult, structResult] = await Promise.all([
        ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: countQuery }),
        ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: dataQuery }),
        ipcRenderer.invoke('db:getTableStructure', { connectionId, database: selectedDatabase, table: tableName }),
      ]);
      
      // Extract total count
      if (countResult.success) {
        const count = server.protocol === 'mongodb'
          ? countResult.count || 0
          : countResult.rows?.[0]?.total || countResult.rows?.[0]?.['COUNT(*)'] || 0;
        setTotalRows(Number(count));
      }
      
      if (dataResult.success) {
        setTableData(dataResult);
        setCurrentPage(loadAll ? 1 : page);
        if (loadAll) {
          setRowsPerPage(dataResult.rows?.length || limit);
        }
      }
      if (structResult.success) {
        setTableStructure(structResult.columns || []);
        // Detect primary key column
        const pkCol = structResult.columns?.find((c: ColumnInfo) => 
          c.key === 'PRI' || c.key === 'PRIMARY' || c.extra?.toLowerCase().includes('auto_increment')
        );
        setPrimaryKeyColumn(pkCol?.name || null);
      }
    } catch (err: any) {
      console.error('Failed to load table data:', err);
    } finally {
      setLoadingData(false);
      setLoadingAll(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;
    
    setExecuting(true);
    setQueryResult(null);
    
    try {
      const startTime = Date.now();
      const result = await ipcRenderer.invoke('db:query', {
        connectionId,
        database: selectedDatabase,
        query: query.trim(),
      });
      
      setQueryResult({
        ...result,
        executionTime: Date.now() - startTime,
      });
      
      if (result.success) {
        setQueryHistory(prev => [query.trim(), ...prev.filter(q => q !== query.trim())].slice(0, 50));
      }
    } catch (err: any) {
      setQueryResult({
        columns: [],
        rows: [],
        executionTime: 0,
        error: err.message,
        success: false,
      });
    } finally {
      setExecuting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // EDIT/DELETE FUNCTIONS
  // ---------------------------------------------------------------------------

  const openEditModal = (rowIdx: number) => {
    if (!primaryKeyColumn || !tableData) {
      setError('Cannot edit: No primary key found');
      return;
    }
    const row = tableData.rows[rowIdx];
    setEditingRowIdx(rowIdx);
    setEditRowData({ ...row });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingRowIdx(null);
    setEditRowData({});
  };

  const saveRowFromModal = async () => {
    if (editingRowIdx === null || !tableData || !primaryKeyColumn || !selectedTable) return;
    
    setSavingRow(true);
    const originalRow = tableData.rows[editingRowIdx];
    const primaryKeyValue = originalRow[primaryKeyColumn];
    
    try {
      const changedColumns = tableData.columns.filter(col => 
        col !== primaryKeyColumn && editRowData[col] !== originalRow[col]
      );
      
      if (changedColumns.length === 0) {
        closeEditModal();
        return;
      }
      
      for (const col of changedColumns) {
        const result = await ipcRenderer.invoke('db:updateRow', {
          connectionId,
          database: selectedDatabase,
          table: selectedTable,
          primaryKey: primaryKeyColumn,
          primaryKeyValue,
          column: col,
          newValue: editRowData[col] === '' ? null : editRowData[col],
        });
        
        if (!result.success) {
          setError(result.error);
          setSavingRow(false);
          return;
        }
      }
      
      const newRows = [...tableData.rows];
      newRows[editingRowIdx] = { ...editRowData };
      setTableData({ ...tableData, rows: newRows });
      closeEditModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingRow(false);
    }
  };

  const deleteRow = async () => {
    if (!contextMenu || !primaryKeyColumn || !selectedTable) {
      setContextMenu(null);
      return;
    }
    
    const pkValue = contextMenu.row[primaryKeyColumn];
    if (pkValue === undefined || pkValue === null) {
      setContextMenu(null);
      return;
    }
    
    if (!confirm(t('dbConfirmDeleteRow') || 'Are you sure you want to delete this row?')) {
      setContextMenu(null);
      return;
    }
    
    try {
      const deleteQuery = `DELETE FROM ${quoteIdentifier(selectedTable)} WHERE ${quoteIdentifier(primaryKeyColumn)} = ${typeof pkValue === 'string' ? `'${pkValue}'` : pkValue}`;
      await ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: deleteQuery });
      loadTableData(selectedTable);
    } catch (err: any) {
      setError(err.message);
    }
    setContextMenu(null);
  };

  const copyRowAsJSON = () => {
    if (contextMenu && tableData) {
      navigator.clipboard.writeText(JSON.stringify(contextMenu.row, null, 2));
      setContextMenu(null);
    }
  };

  const copyRowAsCSV = () => {
    if (contextMenu && tableData) {
      const values = tableData.columns.map(col => {
        const val = contextMenu.row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return String(val);
      });
      navigator.clipboard.writeText(values.join(','));
      setContextMenu(null);
    }
  };

  const copyCellValue = (col: string) => {
    if (contextMenu) {
      const val = contextMenu.row[col];
      navigator.clipboard.writeText(val === null ? 'NULL' : String(val));
      setContextMenu(null);
    }
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
    }
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // ---------------------------------------------------------------------------
  // IMPORT/EXPORT FUNCTIONS
  // ---------------------------------------------------------------------------

  const addLog = (type: 'success' | 'error' | 'info', text: string) => {
    setOperationLog(prev => [...prev, { type, text }]);
  };

  const quoteIdentifier = (name: string) => {
    if (server.protocol === 'mysql') return `\`${name}\``;
    return `"${name}"`;
  };

  const exportDatabase = async () => {
    if (!selectedDatabase && !['sqlite', 'redis'].includes(server.protocol)) {
      setError('Please select a database first');
      return;
    }
    
    setExporting(true);
    setOperationLog([]);
    addLog('info', `📦 Starting ${config.name} export...`);
    
    try {
      const tablesToExport = exportOptions.allTables 
        ? tables.map(t => t.name)
        : exportOptions.selectedTables;
      
      let content = '';
      let filename = '';
      
      // Generate export based on protocol
      switch (server.protocol) {
        case 'mysql':
          content = await exportMySQL(tablesToExport);
          filename = `${selectedDatabase}_${getDateStr()}.sql`;
          break;
        case 'postgresql':
          content = await exportPostgreSQL(tablesToExport);
          filename = `${selectedDatabase}_${getDateStr()}.sql`;
          break;
        case 'mongodb':
          content = await exportMongoDB(tablesToExport);
          filename = `${selectedDatabase}_${getDateStr()}.json`;
          break;
        case 'redis':
          content = await exportRedis();
          filename = `redis_${getDateStr()}.json`;
          break;
        case 'sqlite':
          content = await exportSQLite(tablesToExport);
          filename = `sqlite_${getDateStr()}.sql`;
          break;
      }
      
      // Download
      downloadFile(content, filename);
      addLog('success', `✅ Export completed: ${filename}`);
      
    } catch (err: any) {
      addLog('error', `❌ Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const importDatabase = async () => {
    if (!importFile) {
      setError('Please select a file');
      return;
    }
    
    setImporting(true);
    setOperationLog([]);
    addLog('info', `📥 Starting ${config.name} import...`);
    
    try {
      const content = await importFile.text();
      
      // Smart drop - only drop tables mentioned in the import file
      if (importDropExisting) {
        const tablesToDrop = extractTableNamesFromSQL(content);
        if (tablesToDrop.length > 0) {
          addLog('info', `🗑️ Dropping ${tablesToDrop.length} table(s) found in import file...`);
          await dropSpecificTables(tablesToDrop);
        } else {
          addLog('info', '⚠️ No CREATE TABLE statements found in file, skipping drop');
        }
      }
      
      // Import based on protocol
      switch (server.protocol) {
        case 'mysql':
        case 'postgresql':
        case 'sqlite':
          await importSQL(content);
          break;
        case 'mongodb':
          await importMongoDB(content);
          break;
        case 'redis':
          await importRedis(content);
          break;
      }
      
      addLog('success', '✅ Import completed!');
      
      // Refresh
      if (selectedDatabase) {
        loadTables(selectedDatabase);
      }
      
    } catch (err: any) {
      addLog('error', `❌ Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  // Export helpers
  const exportMySQL = async (tableNames: string[]) => {
    let sql = `-- MySQL Export\n-- Database: ${selectedDatabase}\n-- Date: ${new Date().toISOString()}\n-- Generated by Marix\n\n`;
    sql += `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;
    
    for (const table of tableNames) {
      addLog('info', `  Exporting ${table}...`);
      
      if (exportOptions.dropTable) {
        sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
      }
      
      if (exportOptions.structure) {
        const struct = await ipcRenderer.invoke('db:query', {
          connectionId, database: selectedDatabase,
          query: `SHOW CREATE TABLE \`${table}\``,
        });
        if (struct.success && struct.rows[0]) {
          sql += `${struct.rows[0]['Create Table']};\n\n`;
        }
      }
      
      if (exportOptions.data) {
        const data = await ipcRenderer.invoke('db:query', {
          connectionId, database: selectedDatabase,
          query: `SELECT * FROM \`${table}\``,
        });
        if (data.success && data.rows.length > 0) {
          for (const row of data.rows) {
            const cols = data.columns.map((c: string) => `\`${c}\``).join(', ');
            const vals = data.columns.map((c: string) => formatValue(row[c])).join(', ');
            sql += `INSERT INTO \`${table}\` (${cols}) VALUES (${vals});\n`;
          }
          sql += '\n';
        }
      }
      
      addLog('success', `  ✓ ${table}`);
    }
    
    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    return sql;
  };

  const exportPostgreSQL = async (tableNames: string[]) => {
    let sql = `-- PostgreSQL Export\n-- Database: ${selectedDatabase}\n-- Date: ${new Date().toISOString()}\n\n`;
    sql += `SET client_encoding = 'UTF8';\n\n`;
    
    for (const table of tableNames) {
      addLog('info', `  Exporting ${table}...`);
      
      if (exportOptions.dropTable) {
        sql += `DROP TABLE IF EXISTS "${table}" CASCADE;\n`;
      }
      
      if (exportOptions.structure) {
        const struct = await ipcRenderer.invoke('db:query', {
          connectionId, database: selectedDatabase,
          query: `SELECT column_name, data_type, is_nullable, column_default 
                  FROM information_schema.columns 
                  WHERE table_name = '${table}' ORDER BY ordinal_position`,
        });
        if (struct.success && struct.rows.length > 0) {
          sql += `CREATE TABLE "${table}" (\n`;
          sql += struct.rows.map((col: any) => 
            `  "${col.column_name}" ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`
          ).join(',\n');
          sql += `\n);\n\n`;
        }
      }
      
      if (exportOptions.data) {
        const data = await ipcRenderer.invoke('db:query', {
          connectionId, database: selectedDatabase,
          query: `SELECT * FROM "${table}"`,
        });
        if (data.success && data.rows.length > 0) {
          for (const row of data.rows) {
            const cols = data.columns.map((c: string) => `"${c}"`).join(', ');
            const vals = data.columns.map((c: string) => formatValue(row[c], 'postgresql')).join(', ');
            sql += `INSERT INTO "${table}" (${cols}) VALUES (${vals});\n`;
          }
          sql += '\n';
        }
      }
      
      addLog('success', `  ✓ ${table}`);
    }
    
    return sql;
  };

  const exportMongoDB = async (collections: string[]) => {
    const exportData: any = {
      _meta: {
        database: selectedDatabase,
        date: new Date().toISOString(),
        generator: 'Marix',
      },
    };
    
    for (const coll of collections) {
      addLog('info', `  Exporting ${coll}...`);
      const result = await ipcRenderer.invoke('db:query', {
        connectionId, database: selectedDatabase,
        query: JSON.stringify({ collection: coll, limit: 0 }),
      });
      if (result.success) {
        exportData[coll] = result.rows;
        addLog('success', `  ✓ ${coll} (${result.rows.length} docs)`);
      }
    }
    
    return JSON.stringify(exportData, null, 2);
  };

  const exportRedis = async () => {
    addLog('info', '  Exporting all keys...');
    const exportData: any = {
      _meta: { date: new Date().toISOString(), generator: 'Marix' },
      keys: {},
    };
    
    for (const key of tables) {
      const result = await ipcRenderer.invoke('db:query', {
        connectionId,
        query: `GET ${key.name}`,
      });
      if (result.success) {
        exportData.keys[key.name] = result.rows[0] || null;
      }
    }
    
    addLog('success', `  ✓ ${tables.length} keys`);
    return JSON.stringify(exportData, null, 2);
  };

  const exportSQLite = async (tableNames: string[]) => {
    let sql = `-- SQLite Export\n-- Date: ${new Date().toISOString()}\n\n`;
    sql += `PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n`;
    
    for (const table of tableNames) {
      addLog('info', `  Exporting ${table}...`);
      
      if (exportOptions.dropTable) {
        sql += `DROP TABLE IF EXISTS "${table}";\n`;
      }
      
      if (exportOptions.structure) {
        const struct = await ipcRenderer.invoke('db:query', {
          connectionId,
          query: `SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`,
        });
        if (struct.success && struct.rows[0]?.sql) {
          sql += `${struct.rows[0].sql};\n\n`;
        }
      }
      
      if (exportOptions.data) {
        const data = await ipcRenderer.invoke('db:query', {
          connectionId,
          query: `SELECT * FROM "${table}"`,
        });
        if (data.success && data.rows.length > 0) {
          for (const row of data.rows) {
            const cols = data.columns.map((c: string) => `"${c}"`).join(', ');
            const vals = data.columns.map((c: string) => formatValue(row[c])).join(', ');
            sql += `INSERT INTO "${table}" (${cols}) VALUES (${vals});\n`;
          }
          sql += '\n';
        }
      }
      
      addLog('success', `  ✓ ${table}`);
    }
    
    sql += `COMMIT;\nPRAGMA foreign_keys=ON;\n`;
    return sql;
  };

  // Import helpers
  const importSQL = async (content: string) => {
    const statements = parseSQL(content);
    setImportProgress({ current: 0, total: statements.length, status: 'Processing...' });
    
    let success = 0, failed = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      setImportProgress({ current: i + 1, total: statements.length, status: `Statement ${i + 1}/${statements.length}` });
      
      try {
        const result = await ipcRenderer.invoke('db:query', {
          connectionId,
          database: selectedDatabase,
          query: stmt,
        });
        
        if (result.success) {
          success++;
          if (stmt.toUpperCase().includes('CREATE TABLE')) {
            const match = stmt.match(/CREATE TABLE\s+[`"]?(\w+)/i);
            if (match) addLog('success', `  ✓ Created: ${match[1]}`);
          }
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    
    addLog('info', `📊 Results: ${success} success, ${failed} failed`);
  };

  const importMongoDB = async (content: string) => {
    const data = JSON.parse(content);
    const collections = Object.keys(data).filter(k => k !== '_meta');
    
    for (const coll of collections) {
      const docs = data[coll];
      if (!Array.isArray(docs)) continue;
      
      addLog('info', `  Importing ${coll}...`);
      let count = 0;
      
      for (const doc of docs) {
        try {
          await ipcRenderer.invoke('db:query', {
            connectionId,
            database: selectedDatabase,
            query: JSON.stringify({ action: 'insertOne', collection: coll, document: doc }),
          });
          count++;
        } catch {}
      }
      
      addLog('success', `  ✓ ${coll}: ${count} documents`);
    }
  };

  const importRedis = async (content: string) => {
    const data = JSON.parse(content);
    const keys = Object.keys(data.keys || {});
    
    addLog('info', `  Importing ${keys.length} keys...`);
    let count = 0;
    
    for (const key of keys) {
      try {
        await ipcRenderer.invoke('db:query', {
          connectionId,
          query: `SET ${key} ${JSON.stringify(data.keys[key])}`,
        });
        count++;
      } catch {}
    }
    
    addLog('success', `  ✓ ${count} keys imported`);
  };

  // Extract table names from SQL content
  const extractTableNamesFromSQL = (sql: string): string[] => {
    const tableNames = new Set<string>();
    
    // Match CREATE TABLE statements
    const createMatches = sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?/gi);
    for (const match of createMatches) {
      tableNames.add(match[1]);
    }
    
    // Match INSERT INTO statements
    const insertMatches = sql.matchAll(/INSERT\s+INTO\s+[`"']?(\w+)[`"']?/gi);
    for (const match of insertMatches) {
      tableNames.add(match[1]);
    }
    
    // Match DROP TABLE statements (in case file already has them)
    const dropMatches = sql.matchAll(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?[`"']?(\w+)[`"']?/gi);
    for (const match of dropMatches) {
      tableNames.add(match[1]);
    }
    
    return Array.from(tableNames);
  };

  // Drop only specific tables (smart drop)
  const dropSpecificTables = async (tableNames: string[]) => {
    if (tableNames.length === 0) return;
    
    // Get existing tables to check which ones actually exist
    const existingTableNames = tables.map(t => t.name.toLowerCase());
    const tablesToDrop = tableNames.filter(name => 
      existingTableNames.includes(name.toLowerCase())
    );
    
    if (tablesToDrop.length === 0) {
      addLog('info', '  ℹ️ No matching tables to drop');
      return;
    }
    
    if (server.protocol === 'mysql') {
      await ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: 'SET FOREIGN_KEY_CHECKS=0' });
    }
    
    for (const tableName of tablesToDrop) {
      try {
        const dropQuery = server.protocol === 'postgresql'
          ? `DROP TABLE IF EXISTS "${tableName}" CASCADE`
          : `DROP TABLE IF EXISTS ${quoteIdentifier(tableName)}`;
        await ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: dropQuery });
        addLog('success', `  ✓ Dropped: ${tableName}`);
      } catch (err: any) {
        addLog('error', `  ✗ Failed to drop ${tableName}: ${err.message}`);
      }
    }
    
    if (server.protocol === 'mysql') {
      await ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: 'SET FOREIGN_KEY_CHECKS=1' });
    }
  };

  // Drop or truncate a single table
  const dropSingleTable = async (tableName: string, action: 'drop' | 'truncate') => {
    const actionText = action === 'drop' ? 'DROP' : 'TRUNCATE';
    const confirmMsg = action === 'drop' 
      ? `Are you sure you want to DROP table "${tableName}"? This will permanently delete the table and all its data.`
      : `Are you sure you want to TRUNCATE table "${tableName}"? This will delete all data but keep the structure.`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
      if (server.protocol === 'mysql') {
        await ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: 'SET FOREIGN_KEY_CHECKS=0' });
      }
      
      let query = '';
      if (action === 'drop') {
        query = server.protocol === 'postgresql'
          ? `DROP TABLE IF EXISTS "${tableName}" CASCADE`
          : `DROP TABLE IF EXISTS ${quoteIdentifier(tableName)}`;
      } else {
        query = server.protocol === 'postgresql'
          ? `TRUNCATE TABLE "${tableName}" CASCADE`
          : `TRUNCATE TABLE ${quoteIdentifier(tableName)}`;
      }
      
      await ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query });
      
      if (server.protocol === 'mysql') {
        await ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: 'SET FOREIGN_KEY_CHECKS=1' });
      }
      
      // Refresh tables list
      if (selectedDatabase) {
        await loadTables(selectedDatabase);
      }
      
      // Clear selection if dropped table was selected
      if (action === 'drop' && selectedTable === tableName) {
        setSelectedTable(null);
        setTableData(null);
      } else if (action === 'truncate' && selectedTable === tableName) {
        // Refresh table data
        loadTableData(tableName);
      }
      
    } catch (err: any) {
      setError(`Failed to ${actionText} table: ${err.message}`);
    }
  };

  const dropAllTables = async () => {
    if (server.protocol === 'mysql') {
      await ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: 'SET FOREIGN_KEY_CHECKS=0' });
    }
    
    for (const table of tables) {
      try {
        const dropQuery = server.protocol === 'postgresql'
          ? `DROP TABLE IF EXISTS "${table.name}" CASCADE`
          : `DROP TABLE IF EXISTS ${quoteIdentifier(table.name)}`;
        await ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: dropQuery });
        addLog('success', `  ✓ Dropped: ${table.name}`);
      } catch {}
    }
    
    if (server.protocol === 'mysql') {
      await ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: 'SET FOREIGN_KEY_CHECKS=1' });
    }
  };

  // Utility functions
  const formatValue = (val: any, dialect = 'mysql') => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return dialect === 'postgresql' ? (val ? 'TRUE' : 'FALSE') : (val ? 1 : 0);
    return `'${String(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  };

  const parseSQL = (sql: string): string[] => {
    const statements: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const prev = sql[i - 1];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prev !== '\\') {
        inString = false;
      }
      
      if (char === ';' && !inString) {
        const stmt = current.trim();
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim() && !current.trim().startsWith('--')) {
      statements.push(current.trim());
    }
    
    return statements;
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDateStr = () => new Date().toISOString().slice(0, 10);

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchTables.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // ---------------------------------------------------------------------------

  if (connecting) {
    return (
      <div className={`flex items-center justify-center h-full ${isDark ? 'bg-navy-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl ${isDark ? 'bg-navy-800' : 'bg-gray-200'} flex items-center justify-center`}>
            <span className={`w-10 h-10 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{Icons[config.icon]}</span>
          </div>
          <div className="animate-spin w-8 h-8 mx-auto mb-4 border-3 border-indigo-500 border-t-transparent rounded-full"></div>
          <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('dbConnecting')}
          </p>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {server.host}:{server.port}
          </p>
        </div>
      </div>
    );
  }

  if (error && !connected) {
    return (
      <div className={`flex items-center justify-center h-full ${isDark ? 'bg-navy-900' : 'bg-gray-50'}`}>
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-20 h-20" viewBox="0 0 512 512" fill="#e03">
              <path fillRule="evenodd" clipRule="evenodd" d="m437.894 243.804 20.92 13.177v99.47c0 36.829-16.245 68.514-46.152 90.008l-77.928 56.01-77.929-56.01c-29.905-21.494-46.15-53.179-46.15-90.008v-99.47l20.92-13.177c64.557-40.663 141.759-40.663 206.319 0zm-347.582 99.086c-15.174-5.73-27.82-12.821-37.126-20.928v41.874c0 13.441 14.569 26.289 38.122 36.194 35.012 14.723 79.375 18.903 117.264 17.181-9.345-17.321-14.446-36.862-14.886-57.8-33.768.22-71.647-4.541-103.374-16.521zm0-75.141c31.75 11.989 69.554 16.725 103.343 16.522v58.145c-32.037.067-67.24-4.021-97.367-15.397-23.714-8.955-39.618-20.765-43.102-33.505v-46.691c9.306 8.104 21.952 15.196 37.126 20.926zm0-75.141c-15.174-5.729-27.82-12.821-37.126-20.927v46.69c3.483 12.74 19.388 24.55 43.102 33.505 30.127 11.376 65.331 15.465 97.367 15.396v-19.676l28.859-18.178c34.246-21.572 71.873-32.604 109.577-33.097v-25.019c-8.981 7.946-21.157 14.927-35.776 20.621-58.612 22.83-147.161 22.906-206.003.685zm210.231-77.535c12.775-5.372 23.474-11.77 31.548-18.961v45.414c-2.368 13.063-17.993 25.29-41.886 34.595-54.604 21.267-139.098 21.318-193.918.617-23.714-8.955-39.618-20.764-43.102-33.505v-47.12c8.075 7.19 18.772 13.588 31.548 18.96 60.041 25.249 155.77 25.248 215.81 0zm-6.574-15.605c23.554-9.905 38.122-22.751 38.122-36.192s-14.568-26.289-38.122-36.193c-55.646-23.401-147.015-23.401-202.662 0-13.964 5.873-38.121 18.616-38.121 36.209.013 13.435 14.578 26.275 38.121 36.176 55.648 23.401 147.016 23.4 202.662 0zm12.008 289.939 28.757-28.757 28.758 28.757c6.875 6.876 18.022 6.876 24.897 0 6.875-6.874 6.875-18.022 0-24.896l-28.758-28.758 28.758-28.758c6.875-6.875 6.875-18.022 0-24.898-6.875-6.875-18.022-6.875-24.897 0l-28.758 28.758-28.757-28.758c-6.875-6.875-18.022-6.875-24.897 0s-6.875 18.022 0 24.897l28.757 28.758-28.757 28.758c-6.875 6.875-6.875 18.022 0 24.897 6.875 6.876 18.022 6.876 24.897 0z"/>
            </svg>
          </div>
          <p className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('dbConnectionFailed')}
          </p>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {error}
          </p>
          <button
            onClick={() => connect()}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            {t('dbRetry')}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN UI
  // ---------------------------------------------------------------------------

  return (
    <div className={`flex h-full ${isDark ? 'bg-navy-900' : 'bg-gray-50'}`}>
      {/* ===== SIDEBAR ===== */}
      <div className={`flex flex-col border-r transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      } ${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-gray-200'}`}>
        
        {/* Header */}
        <div className={`p-4 border-b ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
          {sidebarCollapsed ? (
            /* Collapsed view - only icon and expand button */
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 flex items-center justify-center">
                {Icons[config.icon]}
              </div>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-navy-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                title="Expand sidebar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            /* Expanded view */
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                {Icons[config.icon]}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {server.name}
                </p>
                <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {config.name} • {server.host}
                  {isRemoteSqlite && lastSynced && (
                    <span className="ml-2 text-green-500">• Synced {lastSynced.toLocaleTimeString()}</span>
                  )}
                </p>
              </div>
              {/* Sync button for remote SQLite */}
              {isRemoteSqlite && (
                <button
                  onClick={syncToRemote}
                  disabled={syncing}
                  className={`p-1.5 rounded-lg transition-colors ${
                    syncing 
                      ? 'opacity-50 cursor-not-allowed' 
                      : isDark 
                        ? 'hover:bg-green-600/20 text-green-400 hover:text-green-300' 
                        : 'hover:bg-green-100 text-green-600 hover:text-green-700'
                  }`}
                  title="Sync changes to remote server"
                >
                  {syncing ? (
                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                </button>
              )}
              <button
                onClick={() => setSidebarCollapsed(true)}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-navy-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                title="Collapse sidebar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Database Selector */}
        {!sidebarCollapsed && databases.length > 0 && (
          <div className={`p-3 border-b ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
            <select
              value={selectedDatabase}
              onChange={(e) => {
                setSelectedDatabase(e.target.value);
                loadTables(e.target.value);
                setSelectedTable(null);
              }}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${
                isDark 
                  ? 'bg-navy-900 border-navy-600 text-white focus:border-indigo-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'
              } border focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
            >
              <option value="">{t('dbSelectDatabase')}</option>
              {databases.map(db => (
                <option key={db} value={db}>{db}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Search */}
        {!sidebarCollapsed && selectedDatabase && (
          <div className={`p-3 border-b ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
            <input
              type="text"
              value={searchTables}
              onChange={(e) => setSearchTables(e.target.value)}
              placeholder={t('dbSearchTables')}
              className={`w-full px-3 py-2 rounded-lg text-sm ${
                isDark 
                  ? 'bg-navy-900 border-navy-600 text-white placeholder-gray-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              } border focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
            />
          </div>
        )}
        
        {/* Tables List */}
        <div className="flex-1 overflow-auto p-2">
          {loadingTables ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredTables.length > 0 ? (
            <div className="space-y-1">
              {filteredTables.map(table => (
                <div
                  key={table.name}
                  className={`group flex items-center rounded-lg transition-all ${
                    selectedTable === table.name
                      ? `bg-gradient-to-r ${config.color} text-white shadow-md`
                      : isDark
                        ? 'hover:bg-navy-700'
                        : 'hover:bg-gray-100'
                  }`}
                >
                  <button
                    onClick={() => loadTableData(table.name)}
                    className="flex-1 text-left px-3 py-2.5 flex items-center gap-2"
                  >
                    <span className={selectedTable === table.name ? 'text-white' : isDark ? 'text-gray-400' : 'text-gray-500'}>
                      {table.type === 'view' ? Icons.view : table.type === 'collection' ? Icons.collection : Icons.table}
                    </span>
                    {!sidebarCollapsed && (
                      <span className={`truncate text-sm font-medium ${
                        selectedTable === table.name ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>{table.name}</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : selectedDatabase ? (
            <p className={`text-center py-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              No tables found
            </p>
          ) : null}
        </div>
        
        {/* Connection Status */}
        <div className={`p-3 border-t ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></span>
            {!sidebarCollapsed && (
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Connected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Tabs */}
        <div className={`flex items-center gap-1 px-4 py-3 border-b ${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-gray-200'}`}>
          {[
            { id: 'data' as TabType, icon: Icons.data, label: t('dbData') },
            { id: 'query' as TabType, icon: Icons.query, label: t('dbQuery') },
            { id: 'structure' as TabType, icon: Icons.structure, label: t('dbStructure'), show: config.supportsStructure },
            { id: 'erd' as TabType, icon: Icons.erd, label: t('dbERD'), show: config.supportsERD },
            { id: 'import-export' as TabType, icon: Icons.importExport, label: t('dbImportExport'), show: config.supportsImportExport },
          ].filter(tab => tab.show !== false).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${config.color} text-white shadow-md`
                  : isDark
                    ? 'text-gray-400 hover:text-white hover:bg-navy-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          
          {/* DATA TAB */}
          {activeTab === 'data' && (
            <div className="h-full flex flex-col">
              {selectedTable ? (
                <>
                  {/* Table Header */}
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'bg-navy-800/50 border-navy-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <span className={isDark ? 'text-indigo-400' : 'text-indigo-600'}>{Icons.table}</span>
                      <div>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTable}</h3>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {totalRows > 0 ? (
                            <>
                              {t('dbShowing')} {((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, totalRows)} {t('dbOf')} {totalRows.toLocaleString()} {t('dbRows')}
                            </>
                          ) : (
                            <>{tableData?.rows.length || 0} {t('dbRows')}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Rows per page selector */}
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          const newLimit = Number(e.target.value);
                          setRowsPerPage(newLimit);
                          loadTableData(selectedTable, 1, newLimit);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-sm ${isDark ? 'bg-navy-700 text-gray-300 border-navy-600' : 'bg-gray-100 text-gray-700 border-gray-200'} border`}
                      >
                        {ROWS_PER_PAGE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt} / page</option>
                        ))}
                      </select>
                      
                      {/* Load All button */}
                      {totalRows > rowsPerPage && (
                        <button
                          onClick={() => loadTableData(selectedTable, 1, totalRows, true)}
                          disabled={loadingAll}
                          className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${isDark ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'} ${loadingAll ? 'opacity-50 cursor-wait' : ''}`}
                          title={`Load all ${totalRows.toLocaleString()} rows`}
                        >
                          {loadingAll ? (
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          )}
                          {t('dbLoadAll')}
                        </button>
                      )}
                      
                      <button
                        onClick={() => loadTableData(selectedTable, currentPage)}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${isDark ? 'bg-navy-700 hover:bg-navy-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                      >
                        {Icons.refresh} {t('dbRefresh')}
                      </button>
                    </div>
                  </div>
                  
                  {/* Data Grid */}
                  <div className="flex-1 overflow-auto">
                    {loadingData ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full"></div>
                      </div>
                    ) : tableData?.rows.length ? (
                      <table className="w-full text-sm">
                        <thead className={`sticky top-0 ${isDark ? 'bg-navy-800' : 'bg-gray-100'}`}>
                          <tr>
                            <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300 border-navy-700' : 'text-gray-600 border-gray-200'} border-b w-12`}>#</th>
                            {tableData.columns.map(col => (
                              <th key={col} className={`px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? 'text-gray-300 border-navy-700' : 'text-gray-600 border-gray-200'} border-b`}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.rows.map((row, idx) => (
                            <tr 
                              key={idx} 
                              className={`cursor-pointer ${isDark ? 'hover:bg-navy-800/50' : 'hover:bg-gray-50'}`}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, row, rowIdx: idx });
                              }}
                              onDoubleClick={() => openEditModal(idx)}
                            >
                              <td className={`px-4 py-2.5 border-b ${isDark ? 'border-navy-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                {((currentPage - 1) * rowsPerPage) + idx + 1}
                              </td>
                              {tableData.columns.map(col => (
                                <td key={col} className={`px-4 py-2.5 border-b max-w-xs truncate ${isDark ? 'border-navy-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                                  {row[col] === null ? (
                                    <span className="italic text-gray-500">NULL</span>
                                  ) : typeof row[col] === 'object' ? (
                                    JSON.stringify(row[col])
                                  ) : (
                                    String(row[col])
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>{t('dbNoData')}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className={`px-4 py-3 border-t flex items-center justify-between ${isDark ? 'bg-navy-800/50 border-navy-700' : 'bg-white border-gray-200'}`}>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t('dbPage')} {currentPage} / {totalPages} • {totalRows.toLocaleString()} {t('dbRows')}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => loadTableData(selectedTable!, 1)}
                          disabled={currentPage === 1 || loadingData}
                          className={`p-2 rounded ${isDark ? 'hover:bg-navy-700 disabled:opacity-30' : 'hover:bg-gray-100 disabled:opacity-30'} disabled:cursor-not-allowed`}
                          title="First page"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => loadTableData(selectedTable!, currentPage - 1)}
                          disabled={currentPage === 1 || loadingData}
                          className={`p-2 rounded ${isDark ? 'hover:bg-navy-700 disabled:opacity-30' : 'hover:bg-gray-100 disabled:opacity-30'} disabled:cursor-not-allowed`}
                          title="Previous page"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="flex items-center gap-1 mx-2">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => loadTableData(selectedTable!, pageNum)}
                                disabled={loadingData}
                                className={`w-8 h-8 rounded text-sm font-medium ${
                                  currentPage === pageNum
                                    ? `bg-gradient-to-r ${config.color} text-white`
                                    : isDark ? 'hover:bg-navy-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => loadTableData(selectedTable!, currentPage + 1)}
                          disabled={currentPage === totalPages || loadingData}
                          className={`p-2 rounded ${isDark ? 'hover:bg-navy-700 disabled:opacity-30' : 'hover:bg-gray-100 disabled:opacity-30'} disabled:cursor-not-allowed`}
                          title="Next page"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => loadTableData(selectedTable!, totalPages)}
                          disabled={currentPage === totalPages || loadingData}
                          className={`p-2 rounded ${isDark ? 'hover:bg-navy-700 disabled:opacity-30' : 'hover:bg-gray-100 disabled:opacity-30'} disabled:cursor-not-allowed`}
                          title="Last page"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <span className={`block mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mx-auto"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                    </span>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('dbSelectTableToView')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* QUERY TAB */}
          {activeTab === 'query' && (
            <div className="h-full flex flex-col">
              <div className={`p-4 border-b ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
                <SQLEditor
                  value={query}
                  onChange={setQuery}
                  onExecute={executeQuery}
                  theme={theme}
                  dialect={server.protocol === 'postgresql' ? 'postgresql' : 'mysql'}
                  tables={tables.map(t => ({ name: t.name, columns: t.columns?.map(c => c.name) || [] }))}
                  height="150px"
                />
                <div className="flex items-center justify-between mt-3">
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {t('dbPressCtrlEnter')}
                  </p>
                  <button
                    onClick={executeQuery}
                    disabled={executing || !query.trim()}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      executing || !query.trim()
                        ? 'bg-gray-500 cursor-not-allowed opacity-50'
                        : `bg-gradient-to-r ${config.color} text-white shadow-md hover:shadow-lg`
                    }`}
                  >
                    {executing ? (
                      <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> {t('dbExecuting')}</>
                    ) : (
                      <>▶ {t('dbExecute')}</>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {queryResult?.error ? (
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'} border`}>
                    <p className="text-red-500 font-medium">{t('dbError')}</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{queryResult.error}</p>
                  </div>
                ) : queryResult?.rows.length ? (
                  <div>
                    <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {queryResult.rows.length} {t('dbRows')} • {queryResult.executionTime}ms
                    </p>
                    <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
                      <table className="w-full text-sm">
                        <thead className={isDark ? 'bg-navy-800' : 'bg-gray-100'}>
                          <tr>
                            {queryResult.columns.map(col => (
                              <th key={col} className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.rows.map((row, idx) => (
                            <tr key={idx} className={isDark ? 'hover:bg-navy-800/50' : 'hover:bg-gray-50'}>
                              {queryResult.columns.map(col => (
                                <td key={col} className={`px-4 py-2.5 border-t ${isDark ? 'border-navy-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                                  {row[col] === null ? <span className="italic text-gray-500">NULL</span> : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : queryResult ? (
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'} border`}>
                    <p className="text-green-500 font-medium">{t('dbQuerySuccess')}</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {queryResult.affectedRows !== undefined ? `${queryResult.affectedRows} ${t('dbRowsAffected')}` : t('dbQuerySuccess')} • {queryResult.executionTime}ms
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>{t('dbWriteQuery')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STRUCTURE TAB */}
          {activeTab === 'structure' && (
            <div className="h-full overflow-auto p-6">
              {selectedTable && tableStructure.length > 0 ? (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">🏗️</span>
                    <div>
                      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTable}</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tableStructure.length} {t('dbColumns')}</p>
                    </div>
                  </div>
                  
                  <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
                    <table className="w-full text-sm">
                      <thead className={isDark ? 'bg-navy-800' : 'bg-gray-100'}>
                        <tr>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>#</th>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('dbColumnName')}</th>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('dbColumnType')}</th>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('dbColumnNullable')}</th>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('dbColumnKey')}</th>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('dbColumnDefault')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableStructure.map((col, idx) => (
                          <tr key={col.name} className={isDark ? 'hover:bg-navy-800/50' : 'hover:bg-gray-50'}>
                            <td className={`px-4 py-3 border-t ${isDark ? 'border-navy-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>{idx + 1}</td>
                            <td className={`px-4 py-3 border-t font-medium ${isDark ? 'border-navy-700 text-white' : 'border-gray-200 text-gray-900'}`}>
                              {col.key === 'PRI' && <span className="mr-1">🔑</span>}
                              {col.name}
                            </td>
                            <td className={`px-4 py-3 border-t ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
                              <span className={`px-2 py-1 rounded text-xs font-mono ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                {col.type}
                              </span>
                            </td>
                            <td className={`px-4 py-3 border-t ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
                              <span className={`px-2 py-1 rounded text-xs ${col.nullable ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700') : (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')}`}>
                                {col.nullable ? 'YES' : 'NO'}
                              </span>
                            </td>
                            <td className={`px-4 py-3 border-t ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
                              {col.key === 'PRI' ? (
                                <span className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>{t('erdPrimaryKey')}</span>
                              ) : col.key === 'UNI' ? (
                                <span className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>UNIQUE</span>
                              ) : col.key === 'MUL' ? (
                                <span className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>INDEX</span>
                              ) : '-'}
                            </td>
                            <td className={`px-4 py-3 border-t font-mono text-xs ${isDark ? 'border-navy-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                              {col.default ?? <span className="italic">NULL</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <span className={`block mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mx-auto"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    </span>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('dbSelectTableForStructure')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ERD TAB */}
          {activeTab === 'erd' && (
            <div className="h-full overflow-hidden">
              {loadingERD ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin w-10 h-10 mx-auto mb-4 border-3 border-indigo-500 border-t-transparent rounded-full"></div>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('erdLoading')}</p>
                  </div>
                </div>
              ) : erdTables.length > 0 ? (
                <ERDDiagram
                  tables={erdTables}
                  relationships={[]}
                  theme={theme}
                  onTableClick={(name) => {
                    setActiveTab('data');
                    loadTableData(name);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <span className={`block mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mx-auto"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    </span>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('erdNoTables')}</p>
                    <button
                      onClick={loadERDData}
                      className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${config.color} text-white`}
                    >
                      {t('dbRefresh')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* IMPORT/EXPORT TAB */}
          {activeTab === 'import-export' && (
            <div className="h-full overflow-auto p-6">
              <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-lg`}>
                    {Icons.importExport}
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {t('dbImportExport')}
                    </h2>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t('dbImportExportDesc')}
                    </p>
                  </div>
                </div>

                {!selectedDatabase && !['sqlite', 'redis'].includes(server.protocol) ? (
                  <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-navy-800/50' : 'bg-gray-100'}`}>
                    <span className={`block mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mx-auto"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                    </span>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('dbSelectDatabaseFirst')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* IMPORT CARD */}
                    <div className={`rounded-2xl border-2 overflow-hidden ${isDark ? 'bg-navy-800 border-navy-600' : 'bg-white border-gray-200'}`}>
                      <div className={`p-5 border-b ${isDark ? 'border-navy-600 bg-gradient-to-r from-blue-600/10 to-cyan-600/10' : 'border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg`}>
                            {Icons.download}
                          </div>
                          <div>
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('dbImport')}</h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {t('dbImportSQLFile')}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 space-y-4">
                        {/* File Upload */}
                        <div
                          onClick={() => document.getElementById('import-file')?.click()}
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                            importFile 
                              ? (isDark ? 'border-green-500 bg-green-500/10' : 'border-green-400 bg-green-50')
                              : (isDark ? 'border-navy-500 hover:border-blue-500 bg-navy-900/50' : 'border-gray-300 hover:border-blue-400 bg-gray-50')
                          }`}
                        >
                          <input
                            id="import-file"
                            type="file"
                            accept={config.importTypes}
                            className="hidden"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          />
                          {importFile ? (
                            <div className="flex items-center justify-center gap-3">
                              <span className={isDark ? 'text-green-400' : 'text-green-600'}>{Icons.file}</span>
                              <div className="text-left">
                                <p className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{importFile.name}</p>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {(importFile.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className={`block mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{Icons.folder}</span>
                              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                {t('dbClickToUpload')}
                              </p>
                            </>
                          )}
                        </div>
                        
                        {/* Drop Tables Option */}
                        <label className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
                          isDark ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'bg-amber-50 hover:bg-amber-100'
                        }`}>
                          <input
                            type="checkbox"
                            checked={importDropExisting}
                            onChange={(e) => setImportDropExisting(e.target.checked)}
                            className="w-5 h-5 rounded border-2 text-amber-500"
                          />
                          <div>
                            <p className={`font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                              🔄 {t('dbSmartDrop')}
                            </p>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {t('dbSmartDropDesc')}
                            </p>
                          </div>
                        </label>
                        
                        {/* Import Button */}
                        <button
                          onClick={importDatabase}
                          disabled={!importFile || importing}
                          className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                            !importFile || importing
                              ? 'bg-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/25'
                          }`}
                        >
                          {importing ? (
                            <><div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> {t('dbImporting')}</>
                          ) : (
                            <>{Icons.download} {t('dbStartImport')}</>
                          )}
                        </button>
                        
                        {/* Progress */}
                        {importProgress && (
                          <div className={`p-4 rounded-xl ${isDark ? 'bg-navy-900' : 'bg-gray-100'}`}>
                            <div className="flex justify-between text-sm mb-2">
                              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{importProgress.status}</span>
                              <span className={`font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {importProgress.current}/{importProgress.total}
                              </span>
                            </div>
                            <div className={`h-2 rounded-full ${isDark ? 'bg-navy-700' : 'bg-gray-200'}`}>
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* EXPORT CARD */}
                    <div className={`rounded-2xl border-2 overflow-hidden ${isDark ? 'bg-navy-800 border-navy-600' : 'bg-white border-gray-200'}`}>
                      <div className={`p-5 border-b ${isDark ? 'border-navy-600 bg-gradient-to-r from-emerald-600/10 to-teal-600/10' : 'border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg`}>
                            {Icons.upload}
                          </div>
                          <div>
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('dbExport')}</h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {t('dbExportToSQL')}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 space-y-4">
                        {/* Export Options */}
                        {config.supportsStructure && (
                          <div className="space-y-2">
                            {[
                              { key: 'dropTable', label: t('dbIncludeDropTable'), desc: t('dbIncludeDropTableDesc') },
                              { key: 'structure', label: t('dbIncludeStructure'), desc: t('dbIncludeStructureDesc') },
                              { key: 'data', label: t('dbIncludeData'), desc: t('dbIncludeDataDesc') },
                            ].map(opt => (
                              <label key={opt.key} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                                isDark ? 'bg-navy-900/50 hover:bg-navy-900' : 'bg-gray-50 hover:bg-gray-100'
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={(exportOptions as any)[opt.key]}
                                  onChange={(e) => setExportOptions({ ...exportOptions, [opt.key]: e.target.checked })}
                                  className="w-5 h-5 rounded border-2 text-emerald-500"
                                />
                                <div>
                                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{opt.label}</p>
                                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{opt.desc}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {/* Tables Selection */}
                        <div>
                          <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {t('dbSelectTables')} ({exportOptions.allTables ? t('dbAllTables') : exportOptions.selectedTables.length})
                          </p>
                          <div className={`max-h-32 overflow-auto rounded-xl border p-2 ${isDark ? 'bg-navy-900 border-navy-600' : 'bg-gray-50 border-gray-200'}`}>
                            <label className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${isDark ? 'hover:bg-navy-700' : 'hover:bg-gray-100'}`}>
                              <input
                                type="checkbox"
                                checked={exportOptions.allTables}
                                onChange={(e) => setExportOptions({ ...exportOptions, allTables: e.target.checked, selectedTables: [] })}
                                className="w-4 h-4 rounded border-2 text-emerald-500"
                              />
                              <span className={`font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                {t('dbAllTables')} ({tables.length})
                              </span>
                            </label>
                            {!exportOptions.allTables && tables.map(tbl => (
                              <label key={tbl.name} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${isDark ? 'hover:bg-navy-700' : 'hover:bg-gray-100'}`}>
                                <input
                                  type="checkbox"
                                  checked={exportOptions.selectedTables.includes(tbl.name)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setExportOptions({ ...exportOptions, selectedTables: [...exportOptions.selectedTables, tbl.name] });
                                    } else {
                                      setExportOptions({ ...exportOptions, selectedTables: exportOptions.selectedTables.filter(n => n !== tbl.name) });
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-2 text-emerald-500"
                                />
                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{tbl.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        {/* Export Button */}
                        <button
                          onClick={exportDatabase}
                          disabled={exporting || tables.length === 0}
                          className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                            exporting || tables.length === 0
                              ? 'bg-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/25'
                          }`}
                        >
                          {exporting ? (
                            <><div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> {t('dbExporting')}</>
                          ) : (
                            <>{Icons.upload} {t('dbDownloadSQL')}</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Operation Log */}
                {operationLog.length > 0 && (
                  <div className={`mt-6 rounded-2xl border overflow-hidden ${isDark ? 'bg-navy-800 border-navy-700' : 'bg-white border-gray-200'}`}>
                    <div className={`px-5 py-3 border-b flex items-center justify-between ${isDark ? 'border-navy-700 bg-navy-900/50' : 'border-gray-200 bg-gray-50'}`}>
                      <span className={`font-medium flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {Icons.data} {t('dbOperationLog')}
                      </span>
                      <button
                        onClick={() => setOperationLog([])}
                        className={`text-xs px-2 py-1 rounded ${isDark ? 'hover:bg-navy-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                      >
                        {t('dbClear')}
                      </button>
                    </div>
                    <div className="p-4 max-h-48 overflow-auto font-mono text-sm">
                      {operationLog.map((log, idx) => (
                        <div 
                          key={idx} 
                          className={`py-1 ${
                            log.type === 'success' ? 'text-green-500' :
                            log.type === 'error' ? 'text-red-500' :
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}
                        >
                          {log.text}
                        </div>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* EDIT ROW MODAL */}
      {editModalOpen && editingRowIdx !== null && tableData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div 
            className={`w-full max-w-2xl rounded-xl shadow-2xl ${isDark ? 'bg-navy-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b ${isDark ? 'border-navy-700 bg-navy-900' : 'border-gray-200 bg-gray-50'} flex items-center justify-between rounded-t-xl`}>
              <div>
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <span className="text-indigo-400">{Icons.structure}</span> {t('dbEditRow')}
                </h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedTable} • Row #{editingRowIdx + 1}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className={`p-2 rounded-full ${isDark ? 'hover:bg-navy-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
              >
                {Icons.x}
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {tableData.columns.map((col) => {
                  const colInfo = tableStructure.find(c => c.name === col);
                  const isPrimaryKey = col === primaryKeyColumn;
                  const originalValue = tableData.rows[editingRowIdx][col];
                  
                  return (
                    <div key={col} className={isPrimaryKey ? 'opacity-60' : ''}>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="flex items-center gap-2">
                          {isPrimaryKey && <span className="text-yellow-500">{Icons.key}</span>}
                          {col}
                          {colInfo && (
                            <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-navy-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                              {colInfo.type}
                            </span>
                          )}
                          {colInfo && !colInfo.nullable && !isPrimaryKey && (
                            <span className="text-red-500 text-xs">*</span>
                          )}
                        </span>
                      </label>
                      
                      {isPrimaryKey ? (
                        <div className={`px-4 py-3 rounded-lg font-mono text-sm ${isDark ? 'bg-navy-900 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                          {originalValue === null ? <span className="italic">NULL</span> : String(originalValue)}
                        </div>
                      ) : (
                        <div className="relative">
                          {String(editRowData[col] ?? '').length > 100 || String(editRowData[col] ?? '').includes('\n') ? (
                            <textarea
                              value={editRowData[col] === null ? '' : String(editRowData[col] ?? '')}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, [col]: e.target.value }))}
                              placeholder="NULL"
                              rows={4}
                              className={`w-full px-4 py-3 rounded-lg text-sm font-mono resize-y border-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${isDark 
                                ? 'bg-navy-900 text-white border-navy-600 placeholder-gray-500 focus:border-indigo-500' 
                                : 'bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:border-indigo-500'
                              }`}
                            />
                          ) : (
                            <input
                              type="text"
                              value={editRowData[col] === null ? '' : String(editRowData[col] ?? '')}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, [col]: e.target.value }))}
                              placeholder="NULL"
                              className={`w-full px-4 py-3 rounded-lg text-sm font-mono border-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${isDark 
                                ? 'bg-navy-900 text-white border-navy-600 placeholder-gray-500 focus:border-indigo-500' 
                                : 'bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:border-indigo-500'
                              }`}
                            />
                          )}
                          
                          {editRowData[col] !== null && editRowData[col] !== '' && (
                            <button
                              onClick={() => setEditRowData(prev => ({ ...prev, [col]: null }))}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded ${isDark ? 'bg-navy-700 hover:bg-navy-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'}`}
                              title="Set to NULL"
                            >
                              NULL
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t ${isDark ? 'border-navy-700 bg-navy-900' : 'border-gray-200 bg-gray-50'} flex items-center justify-end gap-3 rounded-b-xl`}>
              <button
                onClick={closeEditModal}
                disabled={savingRow}
                className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${isDark 
                  ? 'bg-navy-700 hover:bg-navy-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                {t('cancel')}
              </button>
              <button
                onClick={saveRowFromModal}
                disabled={savingRow}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {savingRow ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    {t('dbSaving')}
                  </>
                ) : (
                  <>
                    {Icons.check} {t('save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CONTEXT MENU */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className={`fixed z-50 py-2 rounded-lg shadow-xl min-w-48 ${isDark ? 'bg-navy-800 border border-navy-700' : 'bg-white border border-gray-200'}`}
            style={{ 
              left: contextMenu.x, 
              top: contextMenu.y,
              maxHeight: '300px',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={copyRowAsJSON}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-navy-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="w-4">{Icons.file}</span> {t('dbCopyAsJSON')}
            </button>
            <button
              onClick={copyRowAsCSV}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-navy-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="w-4">{Icons.data}</span> {t('dbCopyAsCSV')}
            </button>
            <div className={`my-1 border-t ${isDark ? 'border-navy-700' : 'border-gray-200'}`}></div>
            <button
              onClick={() => { if (selectedTable) loadTableData(selectedTable); setContextMenu(null); }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-navy-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="w-4">{Icons.refresh}</span> {t('dbRefresh')}
            </button>
            {primaryKeyColumn && (
              <button
                onClick={() => { openEditModal(contextMenu.rowIdx); setContextMenu(null); }}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-navy-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <span className="w-4">{Icons.structure}</span> {t('dbEditRow')}
              </button>
            )}
            {primaryKeyColumn && (
              <button
                onClick={deleteRow}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-red-500 ${isDark ? 'hover:bg-navy-700' : 'hover:bg-gray-100'}`}
              >
                <span className="w-4">{Icons.trash}</span> {t('dbDeleteRow')}
              </button>
            )}
            <div className={`my-1 border-t ${isDark ? 'border-navy-700' : 'border-gray-200'}`}></div>
            <div className={`px-4 py-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('dbCopyColumn')}</div>
            {tableData?.columns.slice(0, 8).map(col => (
              <button
                key={col}
                onClick={() => copyCellValue(col)}
                className={`w-full px-4 py-1.5 text-left text-xs font-mono truncate ${isDark ? 'hover:bg-navy-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                {col}: {contextMenu.row[col] === null ? <span className="italic">NULL</span> : String(contextMenu.row[col]).slice(0, 30)}
              </button>
            ))}
            {tableData && tableData.columns.length > 8 && (
              <div className={`px-4 py-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                +{tableData.columns.length - 8} {t('dbMoreColumns')}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DatabaseClient;
