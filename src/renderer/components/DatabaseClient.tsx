import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { useLanguage } from '../contexts/LanguageContext';
import SQLEditor from './SQLEditor';
import ERDDiagram from './ERDDiagram';

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
// SVG ICONS - Official Database Logos
// =============================================================================

const Icons = {
  // MySQL - Official dual-color logo
  mysql: (
    <svg viewBox="0 0 48 48" className="w-8 h-8">
      <path fill="#00796b" d="M0.002,35.041h1.92v-7.085l2.667,6.057c0.329,0.755,0.779,1.022,1.662,1.022 s1.315-0.267,1.644-1.022l2.667-5.902v6.93h1.92v-7.906c0-0.61-0.277-0.917-0.807-1.054c-1.286-0.373-2.138,0.089-2.525,0.986 l-2.7,6.069l-2.613-6.069c-0.37-0.897-1.239-1.359-2.524-0.986c-0.531,0.137-0.808,0.444-0.808,1.054v7.906H0.002z"/>
      <path fill="#00796b" d="M13.441,29.281h1.92v4.055c-0.015,0.2,0.064,0.731,0.99,0.745c0.472,0.008,2.821,0,2.85,0v-4.8h1.92 c0,0,0,5.417,0,5.529c0,0.617-0.559,1.239-1.2,1.44c-0.263,0.085-3.479,0-3.479,0c-1.845,0-3.001-0.962-3.001-1.8V29.281z"/>
      <path fill="#f57f17" d="M21.722,34.063v2.718c0,0.267,0.053,0.457,0.16,0.57c0.054,0.057,0.16,0.125,0.294,0.181 c0.227,0.089,0.48,0.131,0.751,0.131h0.16v0.377h-4.451v-0.377h0.16c0.535,0,0.925-0.144,1.145-0.42 c0.107-0.125,0.16-0.342,0.16-0.627v-6.262c0-0.285-0.053-0.502-0.16-0.627c-0.22-0.269-0.609-0.413-1.145-0.413h-0.16v-0.377 h4.078v0.377h-0.16c-0.535,0-0.925,0.144-1.145,0.42c-0.107,0.125-0.16,0.342-0.16,0.62v3.411h4.238v-3.411 c0-0.285-0.053-0.502-0.16-0.627c-0.22-0.269-0.609-0.413-1.145-0.413h-0.16v-0.377h4.078v0.377h-0.16 c-0.535,0-0.925,0.144-1.145,0.42c-0.107,0.125-0.16,0.342-0.16,0.62v6.269c0,0.267,0.053,0.457,0.16,0.57 c0.054,0.057,0.16,0.125,0.294,0.181c0.227,0.089,0.48,0.131,0.751,0.131h0.16v0.377h-4.451v-0.377h0.16 c0.535,0,0.925-0.144,1.145-0.42c0.107-0.125,0.16-0.342,0.16-0.627v-2.553L21.722,34.063z"/>
      <path fill="#00796b" d="M24.124,10.651c-0.306-0.048-0.527-0.078-0.769-0.078 c-2.755,0-4.138,1.398-4.138,4.183v1.107h-1.721v1.453h1.721v7.291h1.873v-7.291h2.426v-1.453h-2.426v-1.003 c0-1.729,0.549-2.528,1.909-2.528c0.384,0,0.742,0.036,1.125,0.108V10.651L24.124,10.651z"/>
    </svg>
  ),
  // PostgreSQL - Official elephant (blue)
  postgresql: (
    <svg viewBox="0 0 24 24" className="w-8 h-8">
      <path fill="#336791" d="M17.128 0a10.134 10.134 0 0 0-2.755.403l-.063.02a10.922 10.922 0 0 0-1.612-.143c-1.209 0-2.291.256-3.193.737l-.077.044c-.268-.032-.56-.05-.877-.05-1.203 0-2.23.254-3.028.707-.986.558-1.678 1.433-1.734 2.602-.034.73.071 1.415.278 2.045.06.185.133.36.218.525-.082.367-.125.76-.125 1.175 0 .597.068 1.158.2 1.676.16.624.42 1.181.78 1.663.14.187.302.361.48.52-.003.018-.004.036-.006.055l-.003.024c-.003.02-.004.041-.005.062v.514l.025.096.018.057.021.054.024.053.028.05.031.049.034.047.037.044.04.042.043.04.046.036.048.034.051.031.053.028.056.024.057.021.06.018.061.014.063.011.065.007.066.003h.066l.065-.003.064-.007.063-.011.062-.015.06-.018.058-.021.056-.025.054-.028.051-.031.049-.034.046-.037.044-.04.04-.042.038-.044.034-.047.031-.049.028-.051.024-.054.021-.055.017-.058.014-.06.011-.062.007-.064.004-.066v-.066l-.003-.066-.007-.065-.01-.063-.014-.062-.018-.06-.021-.058-.025-.056-.028-.053-.031-.051-.034-.048-.037-.046-.04-.043-.043-.04-.046-.037-.049-.034-.051-.031-.054-.028-.056-.024-.058-.021-.06-.018-.062-.014-.063-.011-.065-.007-.066-.004h-.066l-.065.003-.064.007-.063.01-.062.015-.06.017-.058.021-.056.025-.054.027-.051.032-.049.034-.046.036-.044.04-.04.043-.038.045-.034.047-.031.049-.028.051-.024.054-.021.055-.018.058-.014.06-.011.062-.007.064-.004.066v.066c0 .022.001.044.003.066.003.022.007.043.01.065.005.021.01.042.015.062.006.02.012.04.018.06.007.02.014.039.021.057.008.019.016.037.025.055.009.018.018.035.028.052.01.017.02.034.031.05.011.016.023.031.034.046.013.015.025.03.038.044.013.014.026.028.04.041.014.013.028.025.043.037.014.012.029.024.044.035.015.011.03.022.046.032.016.01.032.02.048.029.017.009.033.018.05.026.017.008.034.015.052.022.017.007.035.013.053.02.018.006.036.011.054.016.019.005.037.009.056.013.019.004.037.007.056.01.019.003.038.005.057.007.019.002.038.003.058.004.019.001.039.001.058.001h.058l.058-.001c.02-.001.039-.002.058-.004.019-.002.038-.004.057-.007.019-.003.038-.006.056-.01.019-.004.037-.008.056-.013.018-.005.036-.01.054-.016.018-.006.036-.012.053-.019.018-.007.035-.014.052-.022.017-.008.033-.017.05-.026.016-.009.032-.019.048-.03.016-.01.031-.02.046-.032.015-.011.03-.023.044-.035.015-.012.029-.024.043-.037.014-.013.027-.027.04-.041.013-.014.025-.029.038-.044.012-.015.024-.03.035-.046.011-.016.021-.033.031-.05.01-.017.019-.034.028-.052.009-.018.017-.036.025-.055.007-.018.014-.037.021-.057.006-.02.012-.04.018-.06.005-.02.01-.041.014-.062.004-.022.008-.043.011-.065.002-.022.003-.044.003-.066z"/>
    </svg>
  ),
  // MongoDB - Official leaf (green)
  mongodb: (
    <svg viewBox="0 0 24 24" className="w-8 h-8">
      <path fill="#47a248" d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 003.639-8.464c.01-.814-.103-1.662-.197-2.218zm-5.336 8.195s0-8.291.275-8.29c.213 0 .49 10.695.49 10.695-.381-.045-.765-1.76-.765-2.405z"/>
    </svg>
  ),
  // Redis - Official stacked blocks (red)
  redis: (
    <svg viewBox="0 0 24 24" className="w-8 h-8">
      <path fill="#dc382d" d="M10.5 2.661l-8.571 4.062c-.309.146-.309.422 0 .568l8.571 4.062c.346.163.727.163 1.073 0l8.571-4.062c.309-.146.309-.422 0-.568l-8.571-4.062c-.346-.163-.727-.163-1.073 0zM1.929 9.405l8.571 4.062c.346.163.727.163 1.073 0l8.571-4.062c.309-.146.309-.422 0-.568-.309-.146-.818-.146-1.127 0l-7.944 3.77c-.346.163-.727.163-1.073 0l-7.944-3.77c-.309-.146-.818-.146-1.127 0-.309.146-.309.422 0 .568zM1.929 13.405l8.571 4.062c.346.163.727.163 1.073 0l8.571-4.062c.309-.146.309-.422 0-.568-.309-.146-.818-.146-1.127 0l-7.944 3.77c-.346.163-.727.163-1.073 0l-7.944-3.77c-.309-.146-.818-.146-1.127 0-.309.146-.309.422 0 .568z"/>
    </svg>
  ),
  // SQLite - Official feather (blue)
  sqlite: (
    <svg viewBox="0 0 24 24" className="w-8 h-8">
      <path fill="#003b57" d="M21.678.521c-1.032-.92-2.28-.55-3.678.618A38.019 38.019 0 0 0 16.463 2.5c-1.586 1.683-3.726 4.32-5.141 6.486-.053.026-.095.044-.148.076-.714.42-1.46.868-2.19 1.345-.099-.152-.462-.209-.923-.146A7.91 7.91 0 0 1 6.9 10.4a1.553 1.553 0 0 1-.09.01 2.76 2.76 0 0 1-.142.007h-.074c-.16.003-.288.019-.358.047-.082.032-.13.076-.137.128-.01.072.04.17.139.282.015.018.037.039.055.058.033.035.071.073.11.113.041.042.085.088.13.135.022.024.045.05.068.075.14.157.294.34.454.549-.024.039-.047.078-.071.119a87.23 87.23 0 0 0-2.06 3.769C3.694 17.925 2.14 20.747.67 23.095c-.12.19-.029.356.114.455.037.026.08.046.127.061.053.017.11.028.168.034.082.007.168.002.248-.014.093-.02.181-.053.255-.1.108-.067.194-.16.244-.275a46.79 46.79 0 0 1 1.595-2.936c.115-.196.35-.472.65-.745.147-.133.31-.262.48-.379.142-.098.29-.186.437-.262.135-.069.284-.153.447-.25l.018-.011.018-.01c.155-.091.323-.194.504-.31.086-.054.175-.112.266-.172.02.114.075.299.166.557.055.154.12.33.195.53.185.496.408 1.108.578 1.795.174.699.294 1.467.267 2.257a.195.195 0 0 0 .029.11.166.166 0 0 0 .067.06c.021.01.044.017.068.019.031.003.065-.001.097-.011a.206.206 0 0 0 .07-.036.2.2 0 0 0 .052-.058.174.174 0 0 0 .023-.059c.206-.933.328-1.747.386-2.445a9.284 9.284 0 0 0-.095-2.143c.25-.156.498-.315.746-.477.088-.057.175-.115.262-.172.153.188.306.383.46.583.296.39.592.808.87 1.246.178.28.348.571.503.867.101.192.196.387.282.58.053.12.103.24.149.358.043.109.083.217.119.322.054.157.1.306.136.443.029.107.053.207.071.297.04.195.058.348.053.448a.194.194 0 0 0 .016.091c.012.03.032.054.058.072a.18.18 0 0 0 .164.014.228.228 0 0 0 .062-.037.24.24 0 0 0 .045-.046.195.195 0 0 0 .032-.055l.01-.024c.01-.029.024-.068.041-.117a4.37 4.37 0 0 0 .055-.16 6.817 6.817 0 0 0 .139-.518 8.38 8.38 0 0 0 .108-.561 9.61 9.61 0 0 0 .101-.87c.039-.52.042-1.14-.048-1.847a9.786 9.786 0 0 0-.22-1.12c.184-.142.369-.286.554-.43.064-.05.128-.1.192-.15.009.011.019.02.028.031.024.03.047.055.068.077z"/>
    </svg>
  ),
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
  },
  postgresql: {
    icon: 'postgresql' as keyof typeof Icons,
    name: 'PostgreSQL',
    color: 'from-blue-600 to-indigo-600',
    exportExt: '.sql',
    importTypes: '.sql,.txt',
    supportsStructure: true,
    supportsERD: true,
  },
  mongodb: {
    icon: 'mongodb' as keyof typeof Icons,
    name: 'MongoDB',
    color: 'from-green-500 to-emerald-500',
    exportExt: '.json',
    importTypes: '.json,.bson',
    supportsStructure: false,
    supportsERD: false,
  },
  redis: {
    icon: 'redis' as keyof typeof Icons,
    name: 'Redis',
    color: 'from-red-500 to-orange-500',
    exportExt: '.json',
    importTypes: '.json,.txt',
    supportsStructure: false,
    supportsERD: false,
  },
  sqlite: {
    icon: 'sqlite' as keyof typeof Icons,
    name: 'SQLite',
    color: 'from-sky-500 to-blue-500',
    exportExt: '.sql',
    importTypes: '.sql,.db,.sqlite',
    supportsStructure: true,
    supportsERD: true,
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DatabaseClient: React.FC<DatabaseClientProps> = ({ 
  server, 
  connectionId, 
  theme = 'dark', 
  onClose 
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
  
  // Refs
  const logEndRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Connect on mount
  useEffect(() => {
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
        } else {
          setError(result.error || 'Connection failed');
        }
      } catch (err: any) {
        setError(err.message || 'Connection failed');
      } finally {
        setConnecting(false);
      }
    };
    
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

  const loadTableData = async (tableName: string) => {
    setLoadingData(true);
    setSelectedTable(tableName);
    
    try {
      const queryStr = server.protocol === 'mongodb'
        ? JSON.stringify({ collection: tableName, limit: 100 })
        : `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT 100`;
      
      const [dataResult, structResult] = await Promise.all([
        ipcRenderer.invoke('db:query', { connectionId, database: selectedDatabase, query: queryStr }),
        ipcRenderer.invoke('db:getTableStructure', { connectionId, database: selectedDatabase, table: tableName }),
      ]);
      
      if (dataResult.success) {
        setTableData(dataResult);
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
          <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white shadow-xl`}>
            <span className="w-10 h-10">{Icons[config.icon]}</span>
          </div>
          <div className="animate-spin w-8 h-8 mx-auto mb-4 border-3 border-indigo-500 border-t-transparent rounded-full"></div>
          <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Connecting to {config.name}...
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center text-white shadow-xl">
            <span className="w-10 h-10">{Icons.x}</span>
          </div>
          <p className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Connection Failed
          </p>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Try Again
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
                </p>
              </div>
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
              <option value="">Select Database</option>
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
              placeholder="Search tables..."
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
                  {/* Drop/Truncate buttons */}
                  {!sidebarCollapsed && config.supportsStructure && (
                    <div className={`flex items-center gap-0.5 pr-2 ${
                      selectedTable === table.name ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    } transition-opacity`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); dropSingleTable(table.name, 'truncate'); }}
                        className={`p-1.5 rounded transition-colors ${
                          selectedTable === table.name
                            ? 'hover:bg-white/20 text-white/80 hover:text-white'
                            : isDark 
                              ? 'hover:bg-amber-500/20 text-gray-500 hover:text-amber-400' 
                              : 'hover:bg-amber-100 text-gray-400 hover:text-amber-600'
                        }`}
                        title="Truncate table (delete all data)"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); dropSingleTable(table.name, 'drop'); }}
                        className={`p-1.5 rounded transition-colors ${
                          selectedTable === table.name
                            ? 'hover:bg-white/20 text-white/80 hover:text-white'
                            : isDark 
                              ? 'hover:bg-red-500/20 text-gray-500 hover:text-red-400' 
                              : 'hover:bg-red-100 text-gray-400 hover:text-red-600'
                        }`}
                        title="Drop table (delete table)"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
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
            { id: 'data' as TabType, icon: Icons.data, label: 'Data' },
            { id: 'query' as TabType, icon: Icons.query, label: 'Query' },
            { id: 'structure' as TabType, icon: Icons.structure, label: 'Structure', show: config.supportsStructure },
            { id: 'erd' as TabType, icon: Icons.erd, label: 'ERD', show: config.supportsERD },
            { id: 'import-export' as TabType, icon: Icons.importExport, label: 'Import/Export' },
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
                          {tableData?.rows.length || 0} rows
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.supportsStructure && (
                        <>
                          <button
                            onClick={() => dropSingleTable(selectedTable, 'truncate')}
                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${isDark ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400' : 'bg-amber-100 hover:bg-amber-200 text-amber-600'}`}
                            title="Truncate table (delete all data)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Truncate
                          </button>
                          <button
                            onClick={() => dropSingleTable(selectedTable, 'drop')}
                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${isDark ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}
                            title="Drop table (delete table)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Drop
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => loadTableData(selectedTable)}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${isDark ? 'bg-navy-700 hover:bg-navy-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                      >
                        {Icons.refresh} Refresh
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
                                {idx + 1}
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
                        <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>No data</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <span className={`block mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mx-auto"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                    </span>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Select a table to view data</p>
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
                    Press Ctrl+Enter to execute
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
                      <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> Running...</>
                    ) : (
                      <>▶ Execute</>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {queryResult?.error ? (
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'} border`}>
                    <p className="text-red-500 font-medium">Error</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{queryResult.error}</p>
                  </div>
                ) : queryResult?.rows.length ? (
                  <div>
                    <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {queryResult.rows.length} rows • {queryResult.executionTime}ms
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
                    <p className="text-green-500 font-medium">Success</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {queryResult.affectedRows !== undefined ? `${queryResult.affectedRows} rows affected` : 'Query executed'} • {queryResult.executionTime}ms
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Write a query and execute</p>
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
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tableStructure.length} columns</p>
                    </div>
                  </div>
                  
                  <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-navy-700' : 'border-gray-200'}`}>
                    <table className="w-full text-sm">
                      <thead className={isDark ? 'bg-navy-800' : 'bg-gray-100'}>
                        <tr>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>#</th>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Column</th>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Type</th>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Nullable</th>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Key</th>
                          <th className={`px-4 py-3 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Default</th>
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
                                <span className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>PRIMARY</span>
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
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Select a table to view structure</p>
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
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading ERD...</p>
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
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No tables to display</p>
                    <button
                      onClick={loadERDData}
                      className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${config.color} text-white`}
                    >
                      Reload ERD
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
                      Import / Export
                    </h2>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Backup and restore your {config.name} database
                    </p>
                  </div>
                </div>

                {!selectedDatabase && !['sqlite', 'redis'].includes(server.protocol) ? (
                  <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-navy-800/50' : 'bg-gray-100'}`}>
                    <span className={`block mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mx-auto"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                    </span>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Select a database first</p>
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
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Import</h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              Import {config.exportExt} file
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
                                Click to select {config.exportExt} file
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
                              🔄 Smart Drop (Recommended)
                            </p>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Only drops tables found in import file, not all tables
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
                            <><div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> Importing...</>
                          ) : (
                            <>{Icons.download} Start Import</>
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
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Export</h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              Download {config.exportExt} backup
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 space-y-4">
                        {/* Export Options */}
                        {config.supportsStructure && (
                          <div className="space-y-2">
                            {[
                              { key: 'dropTable', label: 'Include DROP TABLE', desc: 'Add DROP before CREATE' },
                              { key: 'structure', label: 'Include structure', desc: 'Export CREATE statements' },
                              { key: 'data', label: 'Include data', desc: 'Export INSERT statements' },
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
                            Tables ({exportOptions.allTables ? 'All' : exportOptions.selectedTables.length})
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
                                All tables ({tables.length})
                              </span>
                            </label>
                            {!exportOptions.allTables && tables.map(t => (
                              <label key={t.name} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${isDark ? 'hover:bg-navy-700' : 'hover:bg-gray-100'}`}>
                                <input
                                  type="checkbox"
                                  checked={exportOptions.selectedTables.includes(t.name)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setExportOptions({ ...exportOptions, selectedTables: [...exportOptions.selectedTables, t.name] });
                                    } else {
                                      setExportOptions({ ...exportOptions, selectedTables: exportOptions.selectedTables.filter(n => n !== t.name) });
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-2 text-emerald-500"
                                />
                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.name}</span>
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
                            <><div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> Exporting...</>
                          ) : (
                            <>{Icons.upload} Download {config.exportExt}</>
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
                        {Icons.data} Operation Log
                      </span>
                      <button
                        onClick={() => setOperationLog([])}
                        className={`text-xs px-2 py-1 rounded ${isDark ? 'hover:bg-navy-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                      >
                        Clear
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
                  <span className="text-indigo-400">{Icons.structure}</span> Edit Row
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
                Cancel
              </button>
              <button
                onClick={saveRowFromModal}
                disabled={savingRow}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {savingRow ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    {Icons.check} Save
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
              <span className="w-4">{Icons.file}</span> Copy as JSON
            </button>
            <button
              onClick={copyRowAsCSV}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-navy-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="w-4">{Icons.data}</span> Copy as CSV
            </button>
            <div className={`my-1 border-t ${isDark ? 'border-navy-700' : 'border-gray-200'}`}></div>
            <button
              onClick={() => { if (selectedTable) loadTableData(selectedTable); setContextMenu(null); }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-navy-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="w-4">{Icons.refresh}</span> Refresh
            </button>
            {primaryKeyColumn && (
              <button
                onClick={() => { openEditModal(contextMenu.rowIdx); setContextMenu(null); }}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-navy-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <span className="w-4">{Icons.structure}</span> Edit Row
              </button>
            )}
            {primaryKeyColumn && (
              <button
                onClick={deleteRow}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-red-500 ${isDark ? 'hover:bg-navy-700' : 'hover:bg-gray-100'}`}
              >
                <span className="w-4">{Icons.trash}</span> Delete Row
              </button>
            )}
            <div className={`my-1 border-t ${isDark ? 'border-navy-700' : 'border-gray-200'}`}></div>
            <div className={`px-4 py-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Copy Column Value</div>
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
                +{tableData.columns.length - 8} more columns...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DatabaseClient;
