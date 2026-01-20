import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  key?: string;
  default?: string | null;
  extra?: string;
}

interface Table {
  name: string;
  columns: Column[];
  x: number;
  y: number;
}

interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

interface ERDDiagramProps {
  tables: Table[];
  relationships: Relationship[];
  theme?: 'dark' | 'light';
  onTableClick?: (tableName: string) => void;
  onTableMove?: (tableName: string, x: number, y: number) => void;
}

const TABLE_WIDTH = 220;
const TABLE_HEADER_HEIGHT = 36;
const COLUMN_HEIGHT = 28;
const TABLE_PADDING = 8;

const ERDDiagram: React.FC<ERDDiagramProps> = ({
  tables,
  relationships,
  theme = 'dark',
  onTableClick,
  onTableMove,
}) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [tablePositions, setTablePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  
  const isDark = theme === 'dark';
  
  // Colors
  const colors = useMemo(() => ({
    background: isDark ? '#111827' : '#f9fafb',
    gridLine: isDark ? '#1f2937' : '#e5e7eb',
    tableHeader: isDark ? '#3b82f6' : '#2563eb',
    tableBody: isDark ? '#1f2937' : '#ffffff',
    tableBorder: isDark ? '#374151' : '#d1d5db',
    tableHoverBorder: '#3b82f6',
    text: isDark ? '#e5e7eb' : '#1f2937',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    primaryKey: '#fbbf24',
    foreignKey: '#10b981',
    relationship: isDark ? '#6b7280' : '#9ca3af',
    relationshipHover: '#3b82f6',
  }), [isDark]);
  
  // Initialize table positions
  useEffect(() => {
    const newPositions = new Map<string, { x: number; y: number }>();
    tables.forEach((table, index) => {
      if (!tablePositions.has(table.name)) {
        // Auto-layout: arrange in grid
        const cols = Math.ceil(Math.sqrt(tables.length));
        const row = Math.floor(index / cols);
        const col = index % cols;
        newPositions.set(table.name, {
          x: table.x || col * (TABLE_WIDTH + 80) + 50,
          y: table.y || row * 300 + 50,
        });
      } else {
        newPositions.set(table.name, tablePositions.get(table.name)!);
      }
    });
    setTablePositions(newPositions);
  }, [tables]);
  
  // Calculate table height
  const getTableHeight = (table: Table) => {
    return TABLE_HEADER_HEIGHT + table.columns.length * COLUMN_HEIGHT + TABLE_PADDING * 2;
  };
  
  // Get column Y position within table
  const getColumnY = (table: Table, columnName: string, pos: { x: number; y: number }) => {
    const colIndex = table.columns.findIndex(c => c.name === columnName);
    if (colIndex === -1) return pos.y + TABLE_HEADER_HEIGHT + TABLE_PADDING;
    return pos.y + TABLE_HEADER_HEIGHT + TABLE_PADDING + colIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;
  };
  
  // Draw diagram
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Draw grid
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 1;
    const gridSize = 30 * scale;
    const startX = (offset.x % gridSize) - gridSize;
    const startY = (offset.y % gridSize) - gridSize;
    
    for (let x = startX; x < rect.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = startY; y < rect.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    // Draw relationships first (behind tables)
    relationships.forEach(rel => {
      const fromTable = tables.find(t => t.name === rel.fromTable);
      const toTable = tables.find(t => t.name === rel.toTable);
      if (!fromTable || !toTable) return;
      
      const fromPos = tablePositions.get(fromTable.name);
      const toPos = tablePositions.get(toTable.name);
      if (!fromPos || !toPos) return;
      
      const fromX = fromPos.x + TABLE_WIDTH;
      const fromY = getColumnY(fromTable, rel.fromColumn, fromPos);
      const toX = toPos.x;
      const toY = getColumnY(toTable, rel.toColumn, toPos);
      
      // Bezier curve for relationship
      const controlX1 = fromX + 50;
      const controlX2 = toX - 50;
      
      ctx.strokeStyle = hoveredTable === rel.fromTable || hoveredTable === rel.toTable 
        ? colors.relationshipHover 
        : colors.relationship;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.bezierCurveTo(controlX1, fromY, controlX2, toY, toX, toY);
      ctx.stroke();
      
      // Draw arrow at end
      const angle = Math.atan2(toY - fromY, toX - controlX2);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI / 6), toY - 10 * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI / 6), toY - 10 * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      
      // Draw cardinality symbols
      if (rel.type === 'one-to-many') {
        // "1" on from side
        ctx.fillStyle = colors.text;
        ctx.font = '12px sans-serif';
        ctx.fillText('1', fromX + 5, fromY - 5);
        // "∞" on to side
        ctx.fillText('∞', toX - 20, toY - 5);
      }
    });
    
    // Draw tables
    tables.forEach(table => {
      const pos = tablePositions.get(table.name);
      if (!pos) return;
      
      const tableHeight = getTableHeight(table);
      const isHovered = hoveredTable === table.name;
      
      // Table shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(pos.x + 4, pos.y + 4, TABLE_WIDTH, tableHeight);
      
      // Table body
      ctx.fillStyle = colors.tableBody;
      ctx.fillRect(pos.x, pos.y, TABLE_WIDTH, tableHeight);
      
      // Table border
      ctx.strokeStyle = isHovered ? colors.tableHoverBorder : colors.tableBorder;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.strokeRect(pos.x, pos.y, TABLE_WIDTH, tableHeight);
      
      // Table header
      ctx.fillStyle = colors.tableHeader;
      ctx.fillRect(pos.x, pos.y, TABLE_WIDTH, TABLE_HEADER_HEIGHT);
      
      // Table icon (simple rectangle)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pos.x + 10, pos.y + 10, 14, 14);
      ctx.strokeStyle = colors.tableHeader;
      ctx.lineWidth = 1;
      ctx.strokeRect(pos.x + 10, pos.y + 10, 14, 14);
      ctx.fillStyle = colors.tableHeader;
      ctx.fillRect(pos.x + 10, pos.y + 10, 14, 5);
      
      // Table name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(table.name, pos.x + 30, pos.y + TABLE_HEADER_HEIGHT / 2);
      
      // Draw columns
      table.columns.forEach((col, idx) => {
        const colY = pos.y + TABLE_HEADER_HEIGHT + TABLE_PADDING + idx * COLUMN_HEIGHT;
        
        // Column background (alternate)
        if (idx % 2 === 0) {
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
          ctx.fillRect(pos.x + 1, colY, TABLE_WIDTH - 2, COLUMN_HEIGHT);
        }
        
        // Key icon
        let iconX = pos.x + 10;
        if (col.key === 'PRI') {
          // Draw key symbol
          ctx.fillStyle = colors.primaryKey;
          ctx.beginPath();
          ctx.arc(iconX + 4, colY + COLUMN_HEIGHT / 2 - 2, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = colors.primaryKey;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(iconX + 4, colY + COLUMN_HEIGHT / 2 + 2);
          ctx.lineTo(iconX + 4, colY + COLUMN_HEIGHT / 2 + 8);
          ctx.lineTo(iconX + 8, colY + COLUMN_HEIGHT / 2 + 8);
          ctx.stroke();
          iconX += 18;
        } else if (col.key === 'MUL' || col.key === 'FK') {
          // Draw link symbol
          ctx.strokeStyle = colors.foreignKey;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(iconX + 3, colY + COLUMN_HEIGHT / 2, 4, Math.PI * 0.5, Math.PI * 1.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(iconX + 9, colY + COLUMN_HEIGHT / 2, 4, Math.PI * 1.5, Math.PI * 0.5);
          ctx.stroke();
          iconX += 18;
        }
        
        // Column name
        ctx.fillStyle = colors.text;
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(col.name, iconX, colY + COLUMN_HEIGHT / 2);
        
        // Column type
        ctx.fillStyle = colors.textMuted;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        const typeText = col.type.length > 15 ? col.type.substring(0, 12) + '...' : col.type;
        ctx.fillText(typeText, pos.x + TABLE_WIDTH - 10, colY + COLUMN_HEIGHT / 2);
        
        // Nullable indicator
        if (!col.nullable) {
          ctx.fillStyle = '#ef4444';
          ctx.font = '10px sans-serif';
          ctx.fillText('*', pos.x + TABLE_WIDTH - 10 - ctx.measureText(typeText).width - 5, colY + COLUMN_HEIGHT / 2 - 3);
        }
      });
    });
    
    ctx.restore();
  }, [tables, relationships, tablePositions, offset, scale, colors, hoveredTable, isDark]);
  
  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);
  
  // Get table at position
  const getTableAtPosition = useCallback((clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / scale;
    const y = (clientY - rect.top - offset.y) / scale;
    
    for (const table of tables) {
      const pos = tablePositions.get(table.name);
      if (!pos) continue;
      
      const height = getTableHeight(table);
      if (x >= pos.x && x <= pos.x + TABLE_WIDTH && y >= pos.y && y <= pos.y + height) {
        return table.name;
      }
    }
    return null;
  }, [tables, tablePositions, offset, scale]);
  
  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const tableName = getTableAtPosition(e.clientX, e.clientY);
    
    if (tableName) {
      setDragging(tableName);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0) {
      setPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    // Update hovered table
    const tableName = getTableAtPosition(e.clientX, e.clientY);
    setHoveredTable(tableName);
    
    if (dragging) {
      const pos = tablePositions.get(dragging);
      if (pos) {
        const dx = (e.clientX - dragStart.x) / scale;
        const dy = (e.clientY - dragStart.y) / scale;
        setTablePositions(new Map(tablePositions.set(dragging, {
          x: pos.x + dx,
          y: pos.y + dy,
        })));
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    } else if (panning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };
  
  const handleMouseUp = () => {
    if (dragging) {
      const pos = tablePositions.get(dragging);
      if (pos && onTableMove) {
        onTableMove(dragging, pos.x, pos.y);
      }
    }
    setDragging(null);
    setPanning(false);
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.3), 3);
    setScale(newScale);
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    const tableName = getTableAtPosition(e.clientX, e.clientY);
    if (tableName && onTableClick) {
      onTableClick(tableName);
    }
  };
  
  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s * 1.2, 3));
  const zoomOut = () => setScale(s => Math.max(s / 1.2, 0.3));
  const resetZoom = () => {
    setScale(1);
    setOffset({ x: 50, y: 50 });
  };
  const fitToScreen = () => {
    if (tables.length === 0) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    tables.forEach(table => {
      const pos = tablePositions.get(table.name);
      if (!pos) return;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + TABLE_WIDTH);
      maxY = Math.max(maxY, pos.y + getTableHeight(table));
    });
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const padding = 50;
    const scaleX = (rect.width - padding * 2) / (maxX - minX + TABLE_WIDTH);
    const scaleY = (rect.height - padding * 2) / (maxY - minY + 200);
    const newScale = Math.min(scaleX, scaleY, 1);
    
    setScale(newScale);
    setOffset({
      x: padding - minX * newScale,
      y: padding - minY * newScale,
    });
  };
  
  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />
      
      {/* Zoom controls */}
      <div className={`absolute bottom-4 right-4 flex items-center gap-2 p-2 rounded-lg shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <button
          onClick={zoomOut}
          className={`p-2 rounded hover:${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
          title={t('erdZoomOut')}
        >
          ➖
        </button>
        <span className={`px-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className={`p-2 rounded hover:${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
          title={t('erdZoomIn')}
        >
          ➕
        </button>
        <div className={`w-px h-6 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
        <button
          onClick={resetZoom}
          className={`p-2 rounded hover:${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
          title={t('erdResetZoom')}
        >
          🔄
        </button>
        <button
          onClick={fitToScreen}
          className={`p-2 rounded hover:${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
          title={t('erdFitToScreen')}
        >
          📐
        </button>
      </div>
      
      {/* Legend */}
      <div className={`absolute top-4 right-4 p-3 rounded-lg shadow-lg text-xs ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'}`}>
        <div className="font-medium mb-2">{t('erdLegend')}</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span>🔑</span>
            <span>{t('erdPrimaryKey')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔗</span>
            <span>{t('erdForeignKey')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500">*</span>
            <span>{t('erdRequired')}</span>
          </div>
        </div>
      </div>
      
      {/* Help text */}
      <div className={`absolute bottom-4 left-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {t('erdHelp')}
      </div>
      
      {/* Empty state */}
      {tables.length === 0 && (
        <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-lg">{t('erdNoTables')}</div>
            <div className="text-sm mt-2">{t('erdSelectDatabase')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ERDDiagram;
