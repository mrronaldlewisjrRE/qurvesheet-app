import React, { useState, useEffect } from 'react';
import { SheetData, CellData, SelectionRange, GridData, ThemeMode } from '../types';
import { colIndexToLabel, colLabelToIndex } from '../utils/formula';
import { Plus, Trash2, FileSpreadsheet, Tag, ZoomIn, ZoomOut, Save, RotateCcw, Link as LinkIcon, X, Filter, Scissors, Copy, Clipboard, EyeOff, Eye } from 'lucide-react';

interface SpreadsheetGridProps {
  sheet: SheetData;
  onCellUpdate: (cellKey: string, value: string) => void;
  selection: SelectionRange | null;
  onSelectionChange: (range: SelectionRange | null) => void;
  sheets: SheetData[];
  activeSheetId: string;
  onActiveSheetChange: (id: string) => void;
  onAddSheet: () => void;
  onDeleteSheet: (id: string) => void;
  anomalies?: string[]; // Cell keys containing detected anomalies
  themeMode: ThemeMode;
  autosave?: boolean;
  onAutosaveToggle?: (enabled: boolean) => void;
  onResetWorkspace?: () => void;
  onAddLinkClick?: () => void;
  onSelectSlicerValue?: (slicerId: string, value: string | null) => void;
  onRemoveSlicer?: (slicerId: string) => void;
  isExpanded?: boolean;
  onSheetChange?: (updatedSheet: SheetData) => void;
}

function getContrastAdjustedStyles(style: any, themeMode: string) {
  const adjusted = {
    fontWeight: style.bold ? '700' : '400',
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    color: style.color || undefined,
    backgroundColor: style.bg || undefined,
    fontSize: style.fontSize || undefined,
  };

  const getLuminance = (hex: string): number => {
    if (!hex) return 0;
    let c = hex.trim();
    if (c.startsWith('#')) c = c.substring(1);
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };

  const hasBg = !!style.bg;

  // Is background light?
  const bgIsLight = hasBg ? (getLuminance(style.bg) > 0.5) : (themeMode !== 'dark');

  if (bgIsLight) {
    // Light background, force dark text for high readability
    adjusted.color = style.color && getLuminance(style.color) < 0.5 ? style.color : '#0f172a';
  } else {
    // Dark background, force light text for high readability
    adjusted.color = style.color && getLuminance(style.color) >= 0.5 ? style.color : '#f8fafc';
  }

  return adjusted;
}

// Grid manipulation helper functions
function insertRowInGrid(grid: GridData, rIndex: number): GridData {
  const newGrid: GridData = {};
  const rowToInsert = rIndex + 1; // 1-indexed row number
  
  Object.entries(grid).forEach(([key, cell]) => {
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const colLabel = match[1];
      const rowNum = parseInt(match[2], 10);
      if (rowNum >= rowToInsert) {
        newGrid[`${colLabel}${rowNum + 1}`] = cell;
      } else {
        newGrid[key] = cell;
      }
    } else {
      newGrid[key] = cell;
    }
  });
  return newGrid;
}

function deleteRowInGrid(grid: GridData, rIndex: number): GridData {
  const newGrid: GridData = {};
  const rowToDelete = rIndex + 1; // 1-indexed row number
  
  Object.entries(grid).forEach(([key, cell]) => {
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const colLabel = match[1];
      const rowNum = parseInt(match[2], 10);
      if (rowNum === rowToDelete) {
        // Skip
      } else if (rowNum > rowToDelete) {
        newGrid[`${colLabel}${rowNum - 1}`] = cell;
      } else {
        newGrid[key] = cell;
      }
    } else {
      newGrid[key] = cell;
    }
  });
  return newGrid;
}

function insertColumnInGrid(grid: GridData, cIndex: number): GridData {
  const newGrid: GridData = {};
  
  Object.entries(grid).forEach(([key, cell]) => {
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const colLabel = match[1];
      const rowNum = parseInt(match[2], 10);
      const colIdx = colLabelToIndex(colLabel);
      if (colIdx >= cIndex) {
        const newColLabel = colIndexToLabel(colIdx + 1);
        newGrid[`${newColLabel}${rowNum}`] = cell;
      } else {
        newGrid[key] = cell;
      }
    } else {
      newGrid[key] = cell;
    }
  });
  return newGrid;
}

function deleteColumnInGrid(grid: GridData, cIndex: number): GridData {
  const newGrid: GridData = {};
  
  Object.entries(grid).forEach(([key, cell]) => {
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const colLabel = match[1];
      const rowNum = parseInt(match[2], 10);
      const colIdx = colLabelToIndex(colLabel);
      if (colIdx === cIndex) {
        // Skip
      } else if (colIdx > cIndex) {
        const newColLabel = colIndexToLabel(colIdx - 1);
        newGrid[`${newColLabel}${rowNum}`] = cell;
      } else {
        newGrid[key] = cell;
      }
    } else {
      newGrid[key] = cell;
    }
  });
  return newGrid;
}

function clearRowContentsInGrid(grid: GridData, rIndex: number): GridData {
  const newGrid = { ...grid };
  const rowToClear = rIndex + 1;
  Object.keys(newGrid).forEach((key) => {
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (match && parseInt(match[2], 10) === rowToClear) {
      newGrid[key] = { ...newGrid[key], value: '', computed: '' };
    }
  });
  return newGrid;
}

function clearColumnContentsInGrid(grid: GridData, cIndex: number): GridData {
  const newGrid = { ...grid };
  const colLabelToClear = colIndexToLabel(cIndex);
  Object.keys(newGrid).forEach((key) => {
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (match && match[1] === colLabelToClear) {
      newGrid[key] = { ...newGrid[key], value: '', computed: '' };
    }
  });
  return newGrid;
}

export default function SpreadsheetGrid({
  sheet,
  onCellUpdate,
  selection,
  onSelectionChange,
  sheets,
  activeSheetId,
  onActiveSheetChange,
  onAddSheet,
  onDeleteSheet,
  anomalies = [],
  themeMode,
  autosave = true,
  onAutosaveToggle,
  onResetWorkspace,
  onAddLinkClick,
  onSelectSlicerValue,
  onRemoveSlicer,
  isExpanded = false,
  onSheetChange,
}: SpreadsheetGridProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ r: number; c: number } | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [clipboard, setClipboard] = useState<{
    type: 'row' | 'col';
    index: number;
    isCut: boolean;
    data: any;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'row' | 'col';
    index: number;
  } | null>(null);

  useEffect(() => {
    const handleDocumentClick = () => {
      setContextMenu(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const handleRowResizeStart = (e: React.MouseEvent, rIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = rowHeights[rIndex] || 32; // default is 32px

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentY = moveEvent.clientY;
      const deltaY = currentY - startY;
      const newHeight = Math.max(20, startHeight + deltaY);
      setRowHeights((prev) => ({
        ...prev,
        [rIndex]: newHeight,
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e: React.MouseEvent, cIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[cIndex] || 112; // default 112px

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const deltaX = currentX - startX;
      const newWidth = Math.max(40, startWidth + deltaX);
      setColWidths((prev) => ({
        ...prev,
        [cIndex]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleRowContextMenu = (e: React.MouseEvent, rIndex: number) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'row',
      index: rIndex,
    });
  };

  const handleColContextMenu = (e: React.MouseEvent, cIndex: number) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'col',
      index: cIndex,
    });
  };

  // Row Operations
  const executeCutRow = (rIndex: number) => {
    const rowData: Record<string, CellData> = {};
    const rowLabel = rIndex + 1;
    Object.entries(sheet.grid).forEach(([key, cell]) => {
      const match = key.match(/^([A-Z]+)(\d+)$/);
      if (match && parseInt(match[2], 10) === rowLabel) {
        rowData[match[1]] = cell;
      }
    });
    setClipboard({
      type: 'row',
      index: rIndex,
      isCut: true,
      data: rowData,
    });
    const updatedGrid = clearRowContentsInGrid(sheet.grid, rIndex);
    onSheetChange?.({
      ...sheet,
      grid: updatedGrid,
    });
    setContextMenu(null);
  };

  const executeCopyRow = (rIndex: number) => {
    const rowData: Record<string, CellData> = {};
    const rowLabel = rIndex + 1;
    Object.entries(sheet.grid).forEach(([key, cell]) => {
      const match = key.match(/^([A-Z]+)(\d+)$/);
      if (match && parseInt(match[2], 10) === rowLabel) {
        rowData[match[1]] = cell;
      }
    });
    setClipboard({
      type: 'row',
      index: rIndex,
      isCut: false,
      data: rowData,
    });
    setContextMenu(null);
  };

  const executePasteRow = (rIndex: number) => {
    if (!clipboard || clipboard.type !== 'row') return;
    const newGrid = { ...sheet.grid };
    const targetRowLabel = rIndex + 1;
    // Clear target row first
    Object.keys(newGrid).forEach((key) => {
      const match = key.match(/^([A-Z]+)(\d+)$/);
      if (match && parseInt(match[2], 10) === targetRowLabel) {
        delete newGrid[key];
      }
    });
    // Write clipboard data
    Object.entries(clipboard.data).forEach(([colLabel, cell]) => {
      newGrid[`${colLabel}${targetRowLabel}`] = { ...(cell as any) };
    });
    onSheetChange?.({
      ...sheet,
      grid: newGrid,
    });
    if (clipboard.isCut) {
      setClipboard(null);
    }
    setContextMenu(null);
  };

  const executeInsertRowAbove = (rIndex: number) => {
    const updatedGrid = insertRowInGrid(sheet.grid, rIndex);
    const updatedHiddenRows = (sheet.hiddenRows || []).map((idx) =>
      idx >= rIndex ? idx + 1 : idx
    );
    onSheetChange?.({
      ...sheet,
      rowCount: sheet.rowCount + 1,
      grid: updatedGrid,
      hiddenRows: updatedHiddenRows,
    });
    setContextMenu(null);
  };

  const executeInsertRowBelow = (rIndex: number) => {
    const updatedGrid = insertRowInGrid(sheet.grid, rIndex + 1);
    const updatedHiddenRows = (sheet.hiddenRows || []).map((idx) =>
      idx > rIndex ? idx + 1 : idx
    );
    onSheetChange?.({
      ...sheet,
      rowCount: sheet.rowCount + 1,
      grid: updatedGrid,
      hiddenRows: updatedHiddenRows,
    });
    setContextMenu(null);
  };

  const executeDeleteRow = (rIndex: number) => {
    const updatedGrid = deleteRowInGrid(sheet.grid, rIndex);
    const updatedHiddenRows = (sheet.hiddenRows || [])
      .filter((idx) => idx !== rIndex)
      .map((idx) => (idx > rIndex ? idx - 1 : idx));
    onSheetChange?.({
      ...sheet,
      rowCount: Math.max(1, sheet.rowCount - 1),
      grid: updatedGrid,
      hiddenRows: updatedHiddenRows,
    });
    setContextMenu(null);
  };

  const executeHideRow = (rIndex: number) => {
    const hiddenRows = sheet.hiddenRows || [];
    if (!hiddenRows.includes(rIndex)) {
      onSheetChange?.({
        ...sheet,
        hiddenRows: [...hiddenRows, rIndex],
      });
    }
    setContextMenu(null);
  };

  const executeUnhideAllRows = () => {
    onSheetChange?.({
      ...sheet,
      hiddenRows: [],
    });
    setContextMenu(null);
  };

  const executeClearRow = (rIndex: number) => {
    const updatedGrid = clearRowContentsInGrid(sheet.grid, rIndex);
    onSheetChange?.({
      ...sheet,
      grid: updatedGrid,
    });
    setContextMenu(null);
  };

  // Column Operations
  const executeCutCol = (cIndex: number) => {
    const colData: Record<number, CellData> = {};
    const colLabel = colIndexToLabel(cIndex);
    Object.entries(sheet.grid).forEach(([key, cell]) => {
      const match = key.match(/^([A-Z]+)(\d+)$/);
      if (match && match[1] === colLabel) {
        colData[parseInt(match[2], 10)] = cell;
      }
    });
    setClipboard({
      type: 'col',
      index: cIndex,
      isCut: true,
      data: colData,
    });
    const updatedGrid = clearColumnContentsInGrid(sheet.grid, cIndex);
    onSheetChange?.({
      ...sheet,
      grid: updatedGrid,
    });
    setContextMenu(null);
  };

  const executeCopyCol = (cIndex: number) => {
    const colData: Record<number, CellData> = {};
    const colLabel = colIndexToLabel(cIndex);
    Object.entries(sheet.grid).forEach(([key, cell]) => {
      const match = key.match(/^([A-Z]+)(\d+)$/);
      if (match && match[1] === colLabel) {
        colData[parseInt(match[2], 10)] = cell;
      }
    });
    setClipboard({
      type: 'col',
      index: cIndex,
      isCut: false,
      data: colData,
    });
    setContextMenu(null);
  };

  const executePasteCol = (cIndex: number) => {
    if (!clipboard || clipboard.type !== 'col') return;
    const newGrid = { ...sheet.grid };
    const targetColLabel = colIndexToLabel(cIndex);
    // Clear target column first
    Object.keys(newGrid).forEach((key) => {
      const match = key.match(/^([A-Z]+)(\d+)$/);
      if (match && match[1] === targetColLabel) {
        delete newGrid[key];
      }
    });
    // Write clipboard data
    Object.entries(clipboard.data).forEach(([rowNumStr, cell]) => {
      const rowNum = parseInt(rowNumStr, 10);
      newGrid[`${targetColLabel}${rowNum}`] = { ...(cell as any) };
    });
    onSheetChange?.({
      ...sheet,
      grid: newGrid,
    });
    if (clipboard.isCut) {
      setClipboard(null);
    }
    setContextMenu(null);
  };

  const executeInsertColLeft = (cIndex: number) => {
    const updatedGrid = insertColumnInGrid(sheet.grid, cIndex);
    const updatedHiddenCols = (sheet.hiddenCols || []).map((idx) =>
      idx >= cIndex ? idx + 1 : idx
    );
    onSheetChange?.({
      ...sheet,
      colCount: sheet.colCount + 1,
      grid: updatedGrid,
      hiddenCols: updatedHiddenCols,
    });
    setContextMenu(null);
  };

  const executeInsertColRight = (cIndex: number) => {
    const updatedGrid = insertColumnInGrid(sheet.grid, cIndex + 1);
    const updatedHiddenCols = (sheet.hiddenCols || []).map((idx) =>
      idx > cIndex ? idx + 1 : idx
    );
    onSheetChange?.({
      ...sheet,
      colCount: sheet.colCount + 1,
      grid: updatedGrid,
      hiddenCols: updatedHiddenCols,
    });
    setContextMenu(null);
  };

  const executeDeleteCol = (cIndex: number) => {
    const updatedGrid = deleteColumnInGrid(sheet.grid, cIndex);
    const updatedHiddenCols = (sheet.hiddenCols || [])
      .filter((idx) => idx !== cIndex)
      .map((idx) => (idx > cIndex ? idx - 1 : idx));
    onSheetChange?.({
      ...sheet,
      colCount: Math.max(1, sheet.colCount - 1),
      grid: updatedGrid,
      hiddenCols: updatedHiddenCols,
    });
    setContextMenu(null);
  };

  const executeHideCol = (cIndex: number) => {
    const hiddenCols = sheet.hiddenCols || [];
    if (!hiddenCols.includes(cIndex)) {
      onSheetChange?.({
        ...sheet,
        hiddenCols: [...hiddenCols, cIndex],
      });
    }
    setContextMenu(null);
  };

  const executeUnhideAllCols = () => {
    onSheetChange?.({
      ...sheet,
      hiddenCols: [],
    });
    setContextMenu(null);
  };

  const executeClearCol = (cIndex: number) => {
    const updatedGrid = clearColumnContentsInGrid(sheet.grid, cIndex);
    onSheetChange?.({
      ...sheet,
      grid: updatedGrid,
    });
    setContextMenu(null);
  };

  const rowCount = Math.max(sheet.rowCount, 15);
  const colCount = Math.max(sheet.colCount, 8);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleCellMouseDown = (rIndex: number, cIndex: number, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only select/drag with left click

    if (e.shiftKey && selection) {
      onSelectionChange({
        startRow: Math.min(selection.startRow, rIndex),
        startCol: Math.min(selection.startCol, cIndex),
        endRow: Math.max(selection.startRow, rIndex),
        endCol: Math.max(selection.startCol, cIndex),
      });
    } else {
      setIsDragging(true);
      setDragStart({ r: rIndex, c: cIndex });
      onSelectionChange({
        startRow: rIndex,
        startCol: cIndex,
        endRow: rIndex,
        endCol: cIndex,
      });
    }
  };

  const handleCellMouseEnter = (rIndex: number, cIndex: number) => {
    if (isDragging && dragStart) {
      onSelectionChange({
        startRow: Math.min(dragStart.r, rIndex),
        startCol: Math.min(dragStart.c, cIndex),
        endRow: Math.max(dragStart.r, rIndex),
        endCol: Math.max(dragStart.c, cIndex),
      });
    }
  };

  const handleCellDoubleClick = (cellKey: string, currentVal: string) => {
    setEditingCell(cellKey);
    setEditValue(currentVal);
  };

  const handleCellSave = (cellKey: string) => {
    onCellUpdate(cellKey, editValue);
    setEditingCell(null);
  };

  const isCellSelected = (r: number, c: number): boolean => {
    if (!selection) return false;
    return (
      r >= selection.startRow &&
      r <= selection.endRow &&
      c >= selection.startCol &&
      c <= selection.endCol
    );
  };

  const isCellSelectionStart = (r: number, c: number): boolean => {
    if (!selection) return false;
    return selection.startRow === r && selection.startCol === c;
  };

  // Select entire row or column when clicking headers
  const handleRowHeaderClick = (rIndex: number) => {
    onSelectionChange({
      startRow: rIndex,
      startCol: 0,
      endRow: rIndex,
      endCol: colCount - 1,
    });
  };

  const handleColHeaderClick = (cIndex: number) => {
    onSelectionChange({
      startRow: 0,
      startCol: cIndex,
      endRow: rowCount - 1,
      endCol: cIndex,
    });
  };

  const activeSlicers = sheet.slicers || [];
  const isRowFilteredOut = (rIndex: number): boolean => {
    // Row 1 (header index 0) is never filtered out
    if (rIndex === 0) return false;
    
    // Check if row matches the active slicers' selected value
    const cellAValue = sheet.grid[`A${rIndex + 1}`]?.value || '';
    if (cellAValue.toLowerCase().includes('total') || cellAValue.toLowerCase().includes('grand')) {
      return false;
    }

    return activeSlicers.some(slicer => {
      if (slicer.selectedValue === null) return false;
      const cellKey = `${slicer.colLabel}${rIndex + 1}`;
      const cellValue = sheet.grid[cellKey]?.value || '';
      return cellValue !== slicer.selectedValue;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 select-none overflow-hidden border border-slate-200 dark:border-slate-800 rounded-none animate-fade-in">
      {/* Slicers & Filters Bar */}
      {sheet.slicers && sheet.slicers.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2.5 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <Filter size={12} className="text-indigo-500" />
            <span>Active Slicers:</span>
          </div>
          {sheet.slicers.map((slicer) => (
            <div key={slicer.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 flex items-center gap-2 shadow-sm animate-in slide-in-from-top-1 duration-200">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{slicer.headerName}:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => onSelectSlicerValue?.(slicer.id, null)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    slicer.selectedValue === null
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  All
                </button>
                {slicer.uniqueValues.map((val) => (
                  <button
                    key={val}
                    onClick={() => onSelectSlicerValue?.(slicer.id, val)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      slicer.selectedValue === val
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onRemoveSlicer?.(slicer.id)}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-md transition-colors cursor-pointer"
                title="Remove Slicer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable Spreadsheet Stage */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse border-spacing-0 table-fixed min-w-[800px]" style={{ zoom: `${zoom}%` }}>
          {/* Column Headers Row */}
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              {/* Corner Header */}
              <th
                style={{
                  width: isExpanded ? '40px' : '56px',
                  minWidth: isExpanded ? '40px' : '56px',
                  maxWidth: isExpanded ? '40px' : '56px'
                }}
                className="h-8 sticky left-0 top-0 z-20 bg-slate-200 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-center transition-all duration-200"
              >
                <FileSpreadsheet size={12} />
              </th>
              {Array.from({ length: colCount }).map((_, cIndex) => {
                const isHidden = sheet.hiddenCols?.includes(cIndex);
                if (isHidden) return null;

                const colLabel = colIndexToLabel(cIndex);
                const isColSelected =
                  selection &&
                  selection.startCol === cIndex &&
                  selection.endCol === cIndex &&
                  selection.startRow === 0 &&
                  selection.endRow === rowCount - 1;

                const currentWidth = colWidths[cIndex] || 112;

                return (
                  <th
                    key={cIndex}
                    onClick={() => handleColHeaderClick(cIndex)}
                    onContextMenu={(e) => handleColContextMenu(e, cIndex)}
                    style={{
                      width: `${currentWidth}px`,
                      minWidth: `${currentWidth}px`,
                      maxWidth: `${currentWidth}px`
                    }}
                    className={`text-xs font-mono py-1.5 font-bold cursor-col-resize sticky top-0 z-10 border-r border-slate-200 dark:border-slate-800 select-none transition-colors relative group/col ${
                      isColSelected
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate block px-1">{colLabel}</span>
                    {/* Resize Handle */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, cIndex)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-transparent group-hover/col:bg-indigo-300/50 hover:!bg-indigo-500 active:!bg-indigo-600 transition-colors z-30"
                      title="Drag to resize column"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Grid Rows */}
          <tbody>
            {Array.from({ length: rowCount }).map((_, rIndex) => {
              const rowLabel = rIndex + 1;
              const isFiltered = isRowFilteredOut(rIndex);
              const isHidden = sheet.hiddenRows?.includes(rIndex);
              const currentHeight = rowHeights[rIndex] || 32;
              return (
                <tr
                  key={rIndex}
                  style={{
                    display: (isFiltered || isHidden) ? 'none' : undefined,
                    height: `${currentHeight}px`
                  }}
                  className={`${(isFiltered || isHidden) ? 'hidden' : ''} hover:bg-slate-50/50 dark:hover:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800`}
                >
                  {/* Row Index Header */}
                  <td
                    onClick={() => handleRowHeaderClick(rIndex)}
                    onContextMenu={(e) => handleRowContextMenu(e, rIndex)}
                    style={{
                      width: isExpanded ? '40px' : '56px',
                      minWidth: isExpanded ? '40px' : '56px',
                      maxWidth: isExpanded ? '40px' : '56px'
                    }}
                    className={`sticky left-0 z-10 text-center text-[10px] font-mono cursor-pointer font-bold border-r border-slate-200 dark:border-slate-800 transition-all duration-200 relative group/row select-none overflow-hidden ${
                      selection &&
                      selection.startRow === rIndex &&
                      selection.endRow === rIndex &&
                      selection.startCol === 0 &&
                      selection.endCol === colCount - 1
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate block px-1">{rowLabel}</span>
                    {/* Row Resize Handle */}
                    <div
                      onMouseDown={(e) => handleRowResizeStart(e, rIndex)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-0 left-0 right-0 h-1.5 cursor-row-resize bg-transparent group-hover/row:bg-indigo-300/50 hover:!bg-indigo-500 active:!bg-indigo-600 transition-colors z-30"
                      title="Drag to resize row"
                    />
                  </td>

                  {/* Columns Cells */}
                  {Array.from({ length: colCount }).map((_, cIndex) => {
                    const isColHidden = sheet.hiddenCols?.includes(cIndex);
                    if (isColHidden) return null;

                    const colLabel = colIndexToLabel(cIndex);
                    const cellKey = `${colLabel}${rowLabel}`;
                    const cell: CellData = sheet.grid[cellKey] || { value: '' };

                    const selected = isCellSelected(rIndex, cIndex);
                    const isStart = isCellSelectionStart(rIndex, cIndex);
                    const isEditing = editingCell === cellKey;
                    const hasAnomaly = anomalies?.includes(cellKey);

                    // Cell styles
                    const style = cell.style || {};
                    const alignClass =
                      style.align === 'center'
                        ? 'text-center'
                        : style.align === 'right'
                        ? 'text-right'
                        : 'text-left';

                    const textStyle = getContrastAdjustedStyles(style, themeMode);

                    const formattedDisplay = cell.computed !== undefined ? cell.computed : cell.value;

                    return (
                      <td
                        key={cIndex}
                        onMouseDown={e => handleCellMouseDown(rIndex, cIndex, e)}
                        onMouseEnter={() => handleCellMouseEnter(rIndex, cIndex)}
                        onDoubleClick={() => handleCellDoubleClick(cellKey, cell.value)}
                        style={textStyle}
                        className={`px-2 text-xs truncate border-r border-slate-200 dark:border-slate-800 relative cursor-cell transition-all group ${alignClass} ${
                          selected
                            ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/30 dark:bg-indigo-950/20'
                            : ''
                        } ${hasAnomaly ? 'bg-orange-50/50 dark:bg-amber-950/20 border-l-2 border-l-orange-500' : ''}`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => handleCellSave(cellKey)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleCellSave(cellKey);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="absolute inset-0 w-full h-full text-xs font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-2 border-2 border-indigo-500 focus:outline-none z-30"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-between">
                            <span className="truncate w-full">{formattedDisplay}</span>
                            {/* Outlier Indicator */}
                            {hasAnomaly && (
                              <span
                                className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-orange-500 hover:scale-125 transition-transform"
                                title="Anomalous outlier detected"
                              />
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sheets Tab Bar at Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {sheets.map(s => {
            const isActive = s.id === activeSheetId;
            return (
              <div key={s.id} className="flex items-center group/tab">
                <button
                  onClick={() => onActiveSheetChange(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800/50 border-transparent'
                  }`}
                >
                  <FileSpreadsheet size={13} />
                  <span>{s.name}</span>
                </button>
                {sheets.length > 1 && (
                  <button
                    onClick={() => onDeleteSheet(s.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-md ml-0.5 opacity-0 group-hover/tab:opacity-100 focus:opacity-100 transition-opacity"
                    title="Delete Sheet"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={onAddSheet}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold border border-dashed border-indigo-200 dark:border-indigo-900"
            title="Create New Sheet"
          >
            <Plus size={13} />
            <span>New Sheet</span>
          </button>

          <button
            onClick={onAddLinkClick}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold border border-dashed border-emerald-200 dark:border-emerald-900"
            title="Add Link: Extract, Analyze & Visualize Data"
          >
            <LinkIcon size={13} />
            <span>+ Add Link</span>
          </button>
        </div>

        {/* Interactive Stats & Controls Footer */}
        <div className="flex items-center gap-3.5 text-xs text-slate-500 font-medium select-none shrink-0 font-mono">
          <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 hidden md:flex">
            <span>{colCount} Cols</span>
            <span>•</span>
            <span>{rowCount} Rows</span>
          </div>

          <span className="text-slate-200/60 dark:text-slate-800/60 hidden md:inline">|</span>

          {/* Autosave Toggle */}
          <button
            onClick={() => onAutosaveToggle?.(!autosave)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
              autosave
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'
            }`}
            title="Toggle Autosave (Saves spreadsheet immediately on any changes to your local browser storage)"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${autosave ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>Autosave: {autosave ? 'ON' : 'OFF'}</span>
          </button>

          {onResetWorkspace && (
            <>
              <span className="text-slate-200/60 dark:text-slate-800/60 hidden md:inline">|</span>
              <button
                onClick={onResetWorkspace}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                title="Reset workbook to clean default templates with top-row headers"
              >
                <RotateCcw size={12} />
                <span>Reset Templates</span>
              </button>
            </>
          )}

          <span className="text-slate-200/60 dark:text-slate-800/60">|</span>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200/50 dark:border-slate-800/50">
            <button
              onClick={() => setZoom(z => Math.max(50, z - 10))}
              disabled={zoom <= 50}
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={12} />
            </button>
            
            <button
              onClick={() => setZoom(100)}
              className="px-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 min-w-[38px] text-center cursor-pointer"
              title="Click to reset zoom to 100%"
            >
              {zoom}%
            </button>

            <button
              onClick={() => setZoom(z => Math.min(150, z + 10))}
              disabled={zoom >= 150}
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 min-w-[200px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100 text-[11px] text-slate-750 dark:text-slate-300"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'row' ? (
            <div className="flex flex-col gap-0.5">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                Row {contextMenu.index + 1} Options
              </div>
              <button
                onClick={() => executeCutRow(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <Scissors size={12} className="text-slate-400 dark:text-slate-500" />
                <span>Cut Row</span>
              </button>
              <button
                onClick={() => executeCopyRow(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <Copy size={12} className="text-slate-400 dark:text-slate-500" />
                <span>Copy Row</span>
              </button>
              <button
                onClick={() => executePasteRow(contextMenu.index)}
                disabled={!clipboard || clipboard.type !== 'row'}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:pointer-events-none"
              >
                <Clipboard size={12} className="text-slate-400 dark:text-slate-500" />
                <span>Paste Row</span>
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
              <button
                onClick={() => executeInsertRowAbove(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <Plus size={12} className="text-indigo-500" />
                <span>Insert 1 Row Above</span>
              </button>
              <button
                onClick={() => executeInsertRowBelow(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <Plus size={12} className="text-indigo-500" />
                <span>Insert 1 Row Below</span>
              </button>
              <button
                onClick={() => executeDeleteRow(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/25 hover:text-red-600 dark:hover:text-red-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <Trash2 size={12} className="text-red-500" />
                <span>Delete Row</span>
              </button>
              <button
                onClick={() => executeHideRow(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <EyeOff size={12} className="text-slate-400 dark:text-slate-500" />
                <span>Hide Row</span>
              </button>
              {sheet.hiddenRows && sheet.hiddenRows.length > 0 && (
                <button
                  onClick={executeUnhideAllRows}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Eye size={12} className="text-indigo-500" />
                  <span>Unhide All Rows</span>
                </button>
              )}
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
              <button
                onClick={() => executeClearRow(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <X size={12} className="text-slate-450 dark:text-slate-500" />
                <span>Clear Contents</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                Column {colIndexToLabel(contextMenu.index)} Options
              </div>
              <button
                onClick={() => executeCutCol(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <Scissors size={12} className="text-slate-400 dark:text-slate-500" />
                <span>Cut Column</span>
              </button>
              <button
                onClick={() => executeCopyCol(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <Copy size={12} className="text-slate-400 dark:text-slate-500" />
                <span>Copy Column</span>
              </button>
              <button
                onClick={() => executePasteCol(contextMenu.index)}
                disabled={!clipboard || clipboard.type !== 'col'}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:pointer-events-none"
              >
                <Clipboard size={12} className="text-slate-400 dark:text-slate-500" />
                <span>Paste Column</span>
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
              <button
                onClick={() => executeInsertColLeft(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <Plus size={12} className="text-indigo-500" />
                <span>Insert 1 Column Left</span>
              </button>
              <button
                onClick={() => executeInsertColRight(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <Plus size={12} className="text-indigo-500" />
                <span>Insert 1 Column Right</span>
              </button>
              <button
                onClick={() => executeDeleteCol(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/25 hover:text-red-600 dark:hover:text-red-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <Trash2 size={12} className="text-red-500" />
                <span>Delete Column</span>
              </button>
              <button
                onClick={() => executeHideCol(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <EyeOff size={12} className="text-slate-400 dark:text-slate-500" />
                <span>Hide Column</span>
              </button>
              {sheet.hiddenCols && sheet.hiddenCols.length > 0 && (
                <button
                  onClick={executeUnhideAllCols}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Eye size={12} className="text-indigo-500" />
                  <span>Unhide All Columns</span>
                </button>
              )}
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
              <button
                onClick={() => executeClearCol(contextMenu.index)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
              >
                <X size={12} className="text-slate-450 dark:text-slate-500" />
                <span>Clear Contents</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
