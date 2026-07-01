import React, { useState, useEffect } from 'react';
import Ribbon from './components/Ribbon';
import SpreadsheetGrid from './components/SpreadsheetGrid';
import DashboardStudio from './components/DashboardStudio';
import AIAnalystPanel from './components/AIAnalystPanel';
import MLPanel from './components/MLPanel';
import ClaudePanel from './components/ClaudePanel';
import Backstage from './components/Backstage';
import AddLinkModal from './components/AddLinkModal';
import GoalSeekModal from './components/GoalSeekModal';

// Firebase integrations
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, collection, addDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, signOut, OperationType, handleFirestoreError } from './lib/firebase';
import {
  Workbook,
  SheetData,
  SelectionRange,
  ChartConfig,
  Message,
  AnomalyReport,
  ThemeMode,
  WorkspacePreset,
  GridData,
} from './types';
import { DEFAULT_WORKBOOK, ANALYTICS_TEMPLATE, FINANCE_TEMPLATE, OPERATIONS_TEMPLATE, EXECUTIVE_TEMPLATE } from './data/templates';
import { evaluateFormula, formatValue } from './utils/formula';
import { Sparkles, BarChart, Brain, History, Layout, Minimize, Database, Cpu, Table, LineChart, Grid, Filter, Check, X } from 'lucide-react';

interface HistoryState {
  workbook: Workbook;
  charts: ChartConfig[];
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [preset, setPreset] = useState<WorkspacePreset>('analytics');
  
  // Firebase Auth and Collaboration states
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoadingSharedWorkbook, setIsLoadingSharedWorkbook] = useState<boolean>(false);
  const [isCoAuthoring, setIsCoAuthoring] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const [autosave, setAutosave] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ai_spreadsheet_autosave');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [workbook, setWorkbook] = useState<Workbook>(() => {
    try {
      const savedAutosave = localStorage.getItem('ai_spreadsheet_autosave');
      if (savedAutosave !== 'false') {
        const savedWorkbook = localStorage.getItem('ai_spreadsheet_workbook');
        if (savedWorkbook) {
          const parsed = JSON.parse(savedWorkbook);
          // Check if parsed workbook has legacy structures (e.g. headers at row 4 instead of row 1, or corporate titles)
          const isLegacy = parsed.sheets?.some((s: any) => {
            if (s.id === 'analytics_sheet' && s.grid?.['A1']?.value !== 'Region') return true;
            if (s.id === 'finance_sheet' && s.grid?.['A1']?.value !== 'Metric / SaaS Kpis') return true;
            if (s.id === 'operations_sheet' && s.grid?.['A1']?.value !== 'SKU Code') return true;
            if (s.id === 'executive_sheet' && s.grid?.['A1']?.value !== 'Key Performance Indicator') return true;
            return false;
          });
          if (!isLegacy) {
            return parsed;
          }
          console.log("Legacy workbook detected, reverting to clean top-row header template.");
        }
      }
    } catch (e) {
      console.error("Failed to load saved workbook", e);
    }
    return DEFAULT_WORKBOOK;
  });

  const [selection, setSelection] = useState<SelectionRange | null>({
    startRow: 1,
    startCol: 0,
    endRow: 5,
    endCol: 5,
  });

  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    try {
      const savedAutosave = localStorage.getItem('ai_spreadsheet_autosave');
      if (savedAutosave !== 'false') {
        const savedWorkbook = localStorage.getItem('ai_spreadsheet_workbook');
        if (savedWorkbook) {
          const parsed = JSON.parse(savedWorkbook);
          const isLegacy = parsed.sheets?.some((s: any) => {
            if (s.id === 'analytics_sheet' && s.grid?.['A1']?.value !== 'Region') return true;
            if (s.id === 'finance_sheet' && s.grid?.['A1']?.value !== 'Metric / SaaS Kpis') return true;
            if (s.id === 'operations_sheet' && s.grid?.['A1']?.value !== 'SKU Code') return true;
            if (s.id === 'executive_sheet' && s.grid?.['A1']?.value !== 'Key Performance Indicator') return true;
            return false;
          });
          if (isLegacy) {
            return [];
          }
        }
        const savedCharts = localStorage.getItem('ai_spreadsheet_charts');
        if (savedCharts) {
          return JSON.parse(savedCharts);
        }
      }
    } catch (e) {
      console.error("Failed to load saved charts", e);
    }
    return [];
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isBackstageOpen, setIsBackstageOpen] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [isPivotModalOpen, setIsPivotModalOpen] = useState(false);
  const [isChartsGalleryOpen, setIsChartsGalleryOpen] = useState(false);
  const [isSlicerModalOpen, setIsSlicerModalOpen] = useState(false);
  const [isGoalSeekOpen, setIsGoalSeekOpen] = useState(false);
  
  // Modal Form States
  const [pivotRowCol, setPivotRowCol] = useState('A');
  const [pivotValCol, setPivotValCol] = useState('B');
  const [pivotAggFunc, setPivotAggFunc] = useState('SUM');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'scatter' | 'radar' | 'pie'>('bar');
  const [chartTitle, setChartTitle] = useState('');
  const [chartXCol, setChartXCol] = useState('A');
  const [chartYCol, setChartYCol] = useState('B');
  const [slicerCol, setSlicerCol] = useState('A');

  const [sidebarTab, setSidebarTab] = useState<'all' | 'dashboard' | 'analyst' | 'ml' | 'claude'>('all');

  // Undo/Redo History Stack
  const [historyStack, setHistoryStack] = useState<HistoryState[]>(() => [
    { workbook, charts }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sync autosave states
  useEffect(() => {
    try {
      localStorage.setItem('ai_spreadsheet_autosave', String(autosave));
      if (autosave) {
        localStorage.setItem('ai_spreadsheet_workbook', JSON.stringify(workbook));
        localStorage.setItem('ai_spreadsheet_charts', JSON.stringify(charts));
      } else {
        localStorage.removeItem('ai_spreadsheet_workbook');
        localStorage.removeItem('ai_spreadsheet_charts');
      }
    } catch (e) {
      console.error("Failed to sync to localStorage", e);
    }
  }, [autosave, workbook, charts]);

  const handleManualSave = () => {
    try {
      localStorage.setItem('ai_spreadsheet_workbook', JSON.stringify(workbook));
      localStorage.setItem('ai_spreadsheet_charts', JSON.stringify(charts));
    } catch (e) {
      console.error("Failed to manually save", e);
    }
  };

  // Import Link Data handler
  const handleImportLinkData = (payload: {
    sheetName: string;
    grid: any;
    rowCount: number;
    colCount: number;
    analysis: string;
    charts: any[];
    option: 'import_only' | 'analyze_only' | 'visualize_only' | 'all';
  }) => {
    const { sheetName, grid, rowCount, colCount, analysis, charts: recommendedCharts, option } = payload;

    // Create unique ID for the new sheet
    const newSheetId = `sheet_link_${Date.now()}`;
    const newSheet: SheetData = {
      id: newSheetId,
      name: sheetName,
      rowCount: Math.max(rowCount, 25),
      colCount: Math.max(colCount, 12),
      grid: grid
    };

    // Calculate workbook sheets
    const updatedSheets = [...workbook.sheets, newSheet];
    const recalculatedSheets = runWorkbookRecalculations(updatedSheets);

    const updatedWorkbook = {
      ...workbook,
      sheets: recalculatedSheets,
      activeSheetId: newSheetId
    };

    setWorkbook(updatedWorkbook);

    let nextCharts = charts;
    // If visualizing or all, inject charts
    if (option === 'all' || option === 'visualize_only') {
      const formattedCharts: ChartConfig[] = recommendedCharts.map((c, index) => ({
        id: `chart_link_${Date.now()}_${index}`,
        type: c.type || 'bar',
        title: c.title || 'Chart Title',
        xKey: c.xKey,
        yKeys: c.yKeys,
        data: c.data || [],
        kpiValue: c.kpiValue,
        kpiLabel: c.kpiLabel,
        sheetId: newSheetId
      }));
      nextCharts = [...charts, ...formattedCharts];
      setCharts(nextCharts);
      setSidebarTab('dashboard');
    }

    saveToHistory(updatedWorkbook, nextCharts);

    // If analyzing or all, append messages
    if (option === 'all' || option === 'analyze_only') {
      const analysisMessage: Message = {
        id: `msg_link_${Date.now()}`,
        sender: 'ai',
        text: `### 📊 AI URL Extraction Analysis: ${sheetName}\n\nI have successfully extracted, cleaned, and loaded the data. Here is the analytical deep dive:\n\n${analysis}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, analysisMessage]);
      setSidebarTab('analyst');
    }
  };

  // Active sheet reference
  const activeSheet = workbook.sheets.find((s) => s.id === workbook.activeSheetId) || workbook.sheets[0];

  // Recalculate computed values whenever grid values are modified
  const runWorkbookRecalculations = (sheetsList: SheetData[]): SheetData[] => {
    return sheetsList.map((sheet) => {
      const recalculatedGrid = { ...sheet.grid };
      // Resolve static formulas iteratively
      Object.keys(sheet.grid).forEach((key) => {
        const cell = sheet.grid[key];
        if (cell.value && cell.value.startsWith('=')) {
          const computed = evaluateFormula(cell.value, recalculatedGrid);
          recalculatedGrid[key] = {
            ...cell,
            computed: formatValue(computed, cell.style?.format),
          };
        } else {
          recalculatedGrid[key] = {
            ...cell,
            computed: formatValue(cell.value, cell.style?.format),
          };
        }
      });
      return { ...sheet, grid: recalculatedGrid };
    });
  };

  // Push workbook and charts state onto historical stack for undo/redo
  const saveToHistory = (newWorkbook: Workbook, newCharts: ChartConfig[] = charts) => {
    const updatedHistory = historyStack.slice(0, historyIndex + 1);
    setHistoryStack([...updatedHistory, { workbook: newWorkbook, charts: newCharts }]);
    setHistoryIndex(updatedHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setWorkbook(historyStack[prevIndex].workbook);
      setCharts(historyStack[prevIndex].charts);
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setWorkbook(historyStack[nextIndex].workbook);
      setCharts(historyStack[nextIndex].charts);
    }
  };

  // Preset workspace selection callback
  const handlePresetChange = (newPreset: WorkspacePreset) => {
    setPreset(newPreset);
    let activeSheetId = 'analytics_sheet';
    if (newPreset === 'finance') activeSheetId = 'finance_sheet';
    else if (newPreset === 'operations') activeSheetId = 'operations_sheet';
    else if (newPreset === 'executive') activeSheetId = 'executive_sheet';

    const updatedWorkbook = {
      ...workbook,
      activeSheetId,
    };
    setWorkbook(updatedWorkbook);
    setCharts([]);
    setAnomalies([]);
    saveToHistory(updatedWorkbook, []);
  };

  const handleResetWorkspace = () => {
    try {
      localStorage.removeItem('ai_spreadsheet_workbook');
      localStorage.removeItem('ai_spreadsheet_charts');
    } catch (e) {
      console.error(e);
    }
    setWorkbook(DEFAULT_WORKBOOK);
    setCharts([]);
    setAnomalies([]);
    setHistoryStack([{ workbook: DEFAULT_WORKBOOK, charts: [] }]);
    setHistoryIndex(0);
    setSelection({
      startRow: 1,
      startCol: 0,
      endRow: 5,
      endCol: 5,
    });
  };

  // Update cell values from grid selection or formula bar
  const handleCellUpdate = (cellKey: string, newValue: string) => {
    const uppercaseKey = cellKey.toUpperCase();
    const updatedSheets = workbook.sheets.map((sheet) => {
      if (sheet.id === workbook.activeSheetId) {
        const currentStyle = sheet.grid[uppercaseKey]?.style || {};
        const updatedGrid = {
          ...sheet.grid,
          [uppercaseKey]: {
            value: newValue,
            style: currentStyle,
          },
        };
        return { ...sheet, grid: updatedGrid };
      }
      return sheet;
    });

    const recalculatedSheets = runWorkbookRecalculations(updatedSheets);
    const updatedWorkbook = {
      ...workbook,
      sheets: recalculatedSheets,
    };

    setWorkbook(updatedWorkbook);
    saveToHistory(updatedWorkbook);
  };

  const handleSheetChange = (updatedSheet: any) => {
    const updatedSheets = workbook.sheets.map((s) => {
      if (s.id === updatedSheet.id) {
        return updatedSheet;
      }
      return s;
    });

    const recalculatedSheets = runWorkbookRecalculations(updatedSheets);
    const updatedWorkbook = {
      ...workbook,
      sheets: recalculatedSheets,
    };

    setWorkbook(updatedWorkbook);
    saveToHistory(updatedWorkbook);
  };

  // Format active selection styles
  const handleStyleChange = (styleKey: string, value: any) => {
    if (!selection) return;

    const updatedSheets = workbook.sheets.map((sheet) => {
      if (sheet.id === workbook.activeSheetId) {
        const updatedGrid = { ...sheet.grid };

        for (let r = selection.startRow; r <= selection.endRow; r++) {
          for (let c = selection.startCol; c <= selection.endCol; c++) {
            const label = `${String.fromCharCode(65 + c)}${r + 1}`;
            const cell = updatedGrid[label] || { value: '' };
            const nextStyle = { ...cell.style };

            if (styleKey === 'bold') nextStyle.bold = !nextStyle.bold;
            else if (styleKey === 'italic') nextStyle.italic = !nextStyle.italic;
            else if (styleKey === 'underline') nextStyle.underline = !nextStyle.underline;
            else if (styleKey === 'align') nextStyle.align = value;
            else if (styleKey === 'format') nextStyle.format = value;
            else if (styleKey === 'color') nextStyle.color = value;
            else if (styleKey === 'bg') nextStyle.bg = value;
            else if (styleKey === 'fontSize') nextStyle.fontSize = value;

            updatedGrid[label] = { ...cell, style: nextStyle };
          }
        }
        return { ...sheet, grid: updatedGrid };
      }
      return sheet;
    });

    const recalculatedSheets = runWorkbookRecalculations(updatedSheets);
    const updatedWorkbook = {
      ...workbook,
      sheets: recalculatedSheets,
    };

    setWorkbook(updatedWorkbook);
    saveToHistory(updatedWorkbook);
  };

  // Cell actions: Add Row, Clear selection, Add Column
  const handleCellAction = (actionType: string) => {
    if (actionType === 'clear_cell' && selection) {
      const updatedSheets = workbook.sheets.map((sheet) => {
        if (sheet.id === workbook.activeSheetId) {
          const updatedGrid = { ...sheet.grid };
          for (let r = selection.startRow; r <= selection.endRow; r++) {
            for (let c = selection.startCol; c <= selection.endCol; c++) {
              const label = `${String.fromCharCode(65 + c)}${r + 1}`;
              delete updatedGrid[label];
            }
          }
          return { ...sheet, grid: updatedGrid };
        }
        return sheet;
      });

      const recalculatedSheets = runWorkbookRecalculations(updatedSheets);
      const updatedWorkbook = { ...workbook, sheets: recalculatedSheets };
      setWorkbook(updatedWorkbook);
      saveToHistory(updatedWorkbook);
    } else if (actionType === 'add_row') {
      const updatedSheets = workbook.sheets.map((sheet) => {
        if (sheet.id === workbook.activeSheetId) {
          return { ...sheet, rowCount: sheet.rowCount + 5 };
        }
        return sheet;
      });
      const updatedWorkbook = { ...workbook, sheets: updatedSheets };
      setWorkbook(updatedWorkbook);
      saveToHistory(updatedWorkbook);
    } else if (actionType === 'add_column') {
      const updatedSheets = workbook.sheets.map((sheet) => {
        if (sheet.id === workbook.activeSheetId) {
          return { ...sheet, colCount: sheet.colCount + 2 };
        }
        return sheet;
      });
      const updatedWorkbook = { ...workbook, sheets: updatedSheets };
      setWorkbook(updatedWorkbook);
      saveToHistory(updatedWorkbook);
    }
  };

  // AI Assistant Analysis execution
  const handleSendMessage = async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: activeSheet.name,
          grid: activeSheet.grid,
          selection,
          prompt: text,
          previousMessages: messages.slice(-5),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.analysis,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedAction: data.suggestedAction,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Server error occurred');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `Error processing request: ${err.message || 'Check your internet connection or Gemini API secrets.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply suggested actions back to spreadsheet
  const handleApplySuggestedAction = (suggestedAction: any) => {
    if (!suggestedAction || suggestedAction.type === 'none') return;

    if (suggestedAction.type === 'apply_formula') {
      const { cell, formula } = suggestedAction.payload;
      handleCellUpdate(cell, formula);
    } else if (suggestedAction.type === 'update_cells') {
      const cellEdits = suggestedAction.payload;
      const updatedSheets = workbook.sheets.map((sheet) => {
        if (sheet.id === workbook.activeSheetId) {
          const updatedGrid = { ...sheet.grid };
          Object.entries(cellEdits).forEach(([cellKey, cellVal]: [string, any]) => {
            const currentStyle = updatedGrid[cellKey]?.style || {};
            updatedGrid[cellKey] = {
              value: cellVal.toString(),
              style: currentStyle,
            };
          });
          return { ...sheet, grid: updatedGrid };
        }
        return sheet;
      });

      const recalculatedSheets = runWorkbookRecalculations(updatedSheets);
      const updatedWorkbook = { ...workbook, sheets: recalculatedSheets };
      setWorkbook(updatedWorkbook);
      saveToHistory(updatedWorkbook);
    } else if (suggestedAction.type === 'create_chart') {
      const chartPayload = suggestedAction.payload;
      const newChart: ChartConfig = {
        id: `chart_${Date.now()}`,
        type: chartPayload.type || 'bar',
        title: chartPayload.title || 'AI Generated Chart',
        data: chartPayload.data || [],
        xKey: chartPayload.xKey || 'label',
        yKeys: chartPayload.yKeys || [],
        sheetId: workbook.activeSheetId,
      };
      const updatedCharts = [...charts, newChart];
      setCharts(updatedCharts);
      saveToHistory(workbook, updatedCharts);
    }
  };

  // Apply operations defined by Claude AI
  const handleApplyClaudeAction = (actionType: string, payload: any) => {
    const updatedSheets = workbook.sheets.map((sheet) => {
      if (sheet.id === workbook.activeSheetId) {
        const updatedGrid = { ...sheet.grid };

        if (actionType === 'style_headers') {
          // Format Row 1 cells: A1, B1, C1, ...
          for (let col = 0; col < sheet.colCount; col++) {
            const letter = String.fromCharCode(65 + col); // A, B, C...
            const cellKey = `${letter}1`;
            updatedGrid[cellKey] = {
              ...updatedGrid[cellKey] || { value: '' },
              style: {
                ...(updatedGrid[cellKey]?.style || {}),
                bg: payload.bg,
                color: payload.color,
                bold: payload.bold,
                align: payload.align
              }
            };
          }
        } 
        else if (actionType === 'highlight_cells') {
          // Scan all cells and color if value > threshold
          Object.keys(updatedGrid).forEach((cellKey) => {
            const cellData = updatedGrid[cellKey];
            if (cellData) {
              const val = parseFloat((cellData.value || '').replace(/[^0-9.-]/g, ''));
              if (!isNaN(val) && val > payload.threshold) {
                updatedGrid[cellKey] = {
                  ...cellData,
                  style: {
                    ...(cellData.style || {}),
                    bg: payload.bg,
                    color: payload.color,
                    bold: payload.bold
                  }
                };
              }
            }
          });
        } 
        else if (actionType === 'zebra_striping') {
          // Alternating rows starting from row 2
          for (let row = 1; row < sheet.rowCount; row++) {
            for (let col = 0; col < sheet.colCount; col++) {
              const letter = String.fromCharCode(65 + col);
              const cellKey = `${letter}${row + 1}`;
              if (row % 2 === 1) { // 2nd, 4th, 6th rows...
                updatedGrid[cellKey] = {
                  ...updatedGrid[cellKey] || { value: '' },
                  style: {
                    ...(updatedGrid[cellKey]?.style || {}),
                    bg: payload.bg
                  }
                };
              } else {
                // Clear background for other rows to enforce striping contrast
                const currentStyle = { ...(updatedGrid[cellKey]?.style || {}) };
                delete currentStyle.bg;
                updatedGrid[cellKey] = {
                  ...updatedGrid[cellKey] || { value: '' },
                  style: currentStyle
                };
              }
            }
          }
        } 
        else if (actionType === 'clean_numbers') {
          Object.keys(updatedGrid).forEach((cellKey) => {
            const cellData = updatedGrid[cellKey];
            if (cellData) {
              const trimmed = (cellData.value || '').trim();
              // If numerical, format as currency or standard
              const val = parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
              if (!isNaN(val) && !trimmed.startsWith('=')) {
                updatedGrid[cellKey] = {
                  ...cellData,
                  value: trimmed,
                  style: {
                    ...(cellData.style || {}),
                    format: 'currency'
                  }
                };
              } else {
                updatedGrid[cellKey] = {
                  ...cellData,
                  value: trimmed
                };
              }
            }
          });
        } 
        else if (actionType === 'generate_mrr_dashboard') {
          // Empty previous grid
          const newGrid: Record<string, any> = {};
          
          const headers = ['Metric', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Q1 Revenue', 'Q2 Revenue'];
          const rows = [
            ['Active Subscribers', '1250', '1480', '1750', '2100', '2450', '2900', '=SUM(B2:D2)', '=SUM(E2:G2)'],
            ['Average ARPU ($)', '39', '39', '42', '42', '45', '45', '=AVERAGE(B3:D3)', '=AVERAGE(E3:G3)'],
            ['SaaS MRR Revenue', '=B2*B3', '=C2*C3', '=D2*D3', '=E2*E3', '=F2*F3', '=G2*G3', '=SUM(B4:D4)', '=SUM(E4:G4)'],
            ['Marketing Spend', '8500', '9800', '11000', '12500', '14000', '15500', '=SUM(B5:D5)', '=SUM(E5:G5)'],
            ['Net Profit', '=B4-B5', '=C4-C5', '=D4-D5', '=E4-E5', '=F4-F5', '=G4-G5', '=SUM(B6:D6)', '=SUM(E6:G6)']
          ];

          // Fill headers
          headers.forEach((h, colIdx) => {
            const letter = String.fromCharCode(65 + colIdx);
            newGrid[`${letter}1`] = {
              value: h,
              style: { bold: true, bg: '#0f172a', color: '#ffffff', align: 'center' }
            };
          });

          // Fill rows
          rows.forEach((row, rowIdx) => {
            const rowNum = rowIdx + 2;
            row.forEach((val, colIdx) => {
              const letter = String.fromCharCode(65 + colIdx);
              const isFormula = val.startsWith('=');
              const isLabel = colIdx === 0;
              newGrid[`${letter}${rowNum}`] = {
                value: val,
                style: {
                  bold: isLabel || rowNum === 6,
                  bg: rowNum === 6 ? '#f0fdf4' : undefined,
                  color: rowNum === 6 ? '#166534' : undefined,
                  format: (!isFormula && !isLabel && rowIdx !== 0) ? 'currency' : undefined
                }
              };
            });
          });

          return { ...sheet, grid: newGrid, rowCount: 15, colCount: 10 };
        } 
        else if (actionType === 'insert_margin_formulas') {
          // Check if SaaS MRR is row 4, Cost is row 5, we can insert Profit Margin percentages in row 7!
          const rowNum = 7;
          const labelCell = `A${rowNum}`;
          updatedGrid[labelCell] = {
            value: 'Net Profit Margin %',
            style: { bold: true, bg: '#fef3c7', color: '#92400e' }
          };

          for (let col = 1; col < 7; col++) {
            const letter = String.fromCharCode(65 + col);
            const profitCell = `${letter}5`;
            const revCell = `${letter}4`;
            const marginCell = `${letter}${rowNum}`;
            updatedGrid[marginCell] = {
              value: `=${profitCell}/${revCell}`,
              style: { format: 'percent', bold: true, bg: '#fef3c7', color: '#92400e' }
            };
          }
        } 
        else if (actionType === 'reset_styling') {
          Object.keys(updatedGrid).forEach((cellKey) => {
            const cellData = updatedGrid[cellKey];
            if (cellData) {
              updatedGrid[cellKey] = {
                ...cellData,
                style: {}
              };
            }
          });
        }

        return { ...sheet, grid: updatedGrid };
      }
      return sheet;
    });

    const recalculatedSheets = runWorkbookRecalculations(updatedSheets);
    const updatedWorkbook = { ...workbook, sheets: recalculatedSheets };
    setWorkbook(updatedWorkbook);
    saveToHistory(updatedWorkbook);
  };

  // OCR Simulator Handler
  const handleTriggerOCR = (fileName: string, ocrGrid: Record<string, string>) => {
    const mockOcrSheet: SheetData = {
      id: `ocr_sheet_${Date.now()}`,
      name: `OCR - ${fileName.slice(0, 10)}`,
      rowCount: 20,
      colCount: 10,
      grid: {},
    };

    Object.entries(ocrGrid).forEach(([key, val]) => {
      mockOcrSheet.grid[key] = {
        value: val,
        style: key.startsWith('A') && key === 'A1' ? { bold: true } : {},
      };
    });

    const recalculatedSheets = runWorkbookRecalculations([mockOcrSheet]);
    const updatedSheets = [...workbook.sheets, recalculatedSheets[0]];
    const updatedWorkbook = {
      ...workbook,
      sheets: updatedSheets,
      activeSheetId: mockOcrSheet.id,
    };

    setWorkbook(updatedWorkbook);
    saveToHistory(updatedWorkbook);

    // AI confirmation message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: `✨ **OCR Extraction Successful**! I detected file matrices inside your document: "${fileName}". \n\nI created a new tab called **"${mockOcrSheet.name}"**, rotated skewed records, formatted merged cells, and reconstructed standard mathematical cell relationships recursively. Check out the calculated formulas!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Dictation/Voice simulation processor
  const handleTriggerDictation = (command: string) => {
    handleSendMessage(command);
  };

  // Sensitivity variables applicator
  const handleApplyWhatIf = (multipliers: { cost: number; price: number; churn: number }) => {
    // Model What-If calculations dynamically over current active values
    const updatedSheets = workbook.sheets.map((sheet) => {
      if (sheet.id === workbook.activeSheetId) {
        const updatedGrid = { ...sheet.grid };
        // Traverse cells; if they are numeric, modify them dynamically with slider multipliers
        Object.entries(sheet.grid).forEach(([key, cellRaw]) => {
          const cell = cellRaw as any;
          const val = parseFloat(cell.value);
          if (!isNaN(val) && cell.value && !cell.value.startsWith('=')) {
            // Check contextual tags of keys
            if (key.includes('7') && sheet.id === 'finance_sheet') {
              // CAC values scaled by cost
              updatedGrid[key] = {
                ...cell,
                computed: formatValue((val * multipliers.cost).toString(), cell.style?.format),
              };
            } else if (key.includes('8') && sheet.id === 'finance_sheet') {
              // ACV values scaled by price
              updatedGrid[key] = {
                ...cell,
                computed: formatValue((val * multipliers.price).toString(), cell.style?.format),
              };
            }
          }
        });
        return { ...sheet, grid: updatedGrid };
      }
      return sheet;
    });

    const recalculatedSheets = runWorkbookRecalculations(updatedSheets);
    setWorkbook({
      ...workbook,
      sheets: recalculatedSheets,
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = '';
    const rowCount = activeSheet.rowCount;
    const colCount = activeSheet.colCount;

    for (let r = 1; r <= rowCount; r++) {
      const rowCells: string[] = [];
      for (let c = 0; c < colCount; c++) {
        const colLabel = String.fromCharCode(65 + c);
        const cell = activeSheet.grid[`${colLabel}${r}`];
        const val = cell ? cell.computed || cell.value : '';
        rowCells.push(`"${val.replace(/"/g, '""')}"`);
      }
      csvContent += rowCells.join(',') + '\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeSheet.name.replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sheets management tabs
  const handleAddSheet = () => {
    const newSheet: SheetData = {
      id: `sheet_${Date.now()}`,
      name: `Sheet ${workbook.sheets.length + 1}`,
      rowCount: 25,
      colCount: 10,
      grid: {},
    };
    const updatedWorkbook = {
      ...workbook,
      sheets: [...workbook.sheets, newSheet],
      activeSheetId: newSheet.id,
    };
    setWorkbook(updatedWorkbook);
    saveToHistory(updatedWorkbook);
  };

  const handleDeleteSheet = (id: string) => {
    const updatedSheets = workbook.sheets.filter((s) => s.id !== id);
    const nextActiveId = workbook.activeSheetId === id ? updatedSheets[0].id : workbook.activeSheetId;
    const updatedWorkbook = {
      ...workbook,
      sheets: updatedSheets,
      activeSheetId: nextActiveId,
    };
    setWorkbook(updatedWorkbook);
    
    // Also delete any connected charts!
    const updatedCharts = charts.filter((c) => c.sheetId !== id);
    setCharts(updatedCharts);
    
    saveToHistory(updatedWorkbook, updatedCharts);
  };

  // Custom Insert Menu Handlers
  const handleCreatePivotTable = (rowCol: string, valCol: string, aggFunc: string) => {
    const active = workbook.sheets.find((s) => s.id === workbook.activeSheetId) || workbook.sheets[0];
    const rowHeader = active.grid[`${rowCol}1`]?.value || `Column ${rowCol}`;
    const valHeader = active.grid[`${valCol}1`]?.value || `Column ${valCol}`;
    
    // Group values
    const groups: Record<string, number[]> = {};
    for (let r = 2; r <= active.rowCount; r++) {
      const rowVal = active.grid[`${rowCol}${r}`]?.value;
      const numericValStr = active.grid[`${valCol}${r}`]?.value;
      if (!rowVal || rowVal.trim() === '' || rowVal.toLowerCase().includes('total') || rowVal.toLowerCase().includes('grand')) continue;
      
      const parsedNum = parseFloat(numericValStr?.replace(/[^0-9.-]/g, '') || '') || 0;
      if (!groups[rowVal]) {
        groups[rowVal] = [];
      }
      groups[rowVal].push(parsedNum);
    }
    
    // Build new grid
    const newGrid: GridData = {};
    
    // Header Row 1
    newGrid['A1'] = { value: rowHeader, computed: rowHeader, style: { bold: true, bg: '#1e293b', color: '#ffffff' } };
    newGrid['B1'] = { value: `${aggFunc} of ${valHeader}`, computed: `${aggFunc} of ${valHeader}`, style: { bold: true, bg: '#1e293b', color: '#ffffff' } };
    
    let currentRow = 2;
    let totalSum = 0;
    let totalCount = 0;
    
    Object.entries(groups).forEach(([category, numbers]) => {
      let finalVal = 0;
      if (aggFunc === 'SUM') {
        finalVal = numbers.reduce((a, b) => a + b, 0);
      } else if (aggFunc === 'AVERAGE') {
        finalVal = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
      } else if (aggFunc === 'COUNT') {
        finalVal = numbers.length;
      }
      
      totalSum += finalVal;
      totalCount++;
      
      const displayVal = formatValue(finalVal.toString(), 'currency');
      
      newGrid[`A${currentRow}`] = { value: category, computed: category, style: { align: 'left' } };
      newGrid[`B${currentRow}`] = { value: finalVal.toString(), computed: displayVal, style: { align: 'right' } };
      currentRow++;
    });
    
    // Total Row
    const grandTotalVal = aggFunc === 'AVERAGE' ? (totalCount ? totalSum / totalCount : 0) : totalSum;
    newGrid[`A${currentRow}`] = { value: 'Grand Total', computed: 'Grand Total', style: { bold: true, bg: '#f1f5f9' } };
    newGrid[`B${currentRow}`] = { value: grandTotalVal.toString(), computed: formatValue(grandTotalVal.toString(), 'currency'), style: { bold: true, bg: '#f1f5f9', align: 'right' } };
    
    const newSheet: SheetData = {
      id: `pivot_${Date.now()}`,
      name: `Pivot - ${active.name}`,
      rowCount: currentRow,
      colCount: 2,
      grid: newGrid,
    };
    
    const updatedWorkbook = {
      ...workbook,
      sheets: [...workbook.sheets, newSheet],
      activeSheetId: newSheet.id,
    };
    
    setWorkbook(updatedWorkbook);
    saveToHistory(updatedWorkbook);
    setIsPivotModalOpen(false);
    
    // Add nice system message
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: `✨ **Pivot Table successfully created!**\n\nI processed **${totalCount} unique groupings** of "${rowHeader}" against "${valHeader}" using the **${aggFunc}** aggregation function.\n\nA new tab called **"${newSheet.name}"** has been added to your workbook with a fully formatted summary card and a double-line grand total summation.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  const handleCreateChartFromGallery = (type: string, title: string, xCol: string, yCols: string[]) => {
    const active = workbook.sheets.find((s) => s.id === workbook.activeSheetId) || workbook.sheets[0];
    const xHeaderName = active.grid[`${xCol}1`]?.value || `Column ${xCol}`;
    
    // Gather row data
    const rawData: any[] = [];
    for (let r = 2; r <= active.rowCount; r++) {
      const xVal = active.grid[`${xCol}${r}`]?.value;
      if (!xVal || xVal.trim() === '' || xVal.toLowerCase().includes('total') || xVal.toLowerCase().includes('grand')) continue;
      
      const record: any = { label: xVal };
      yCols.forEach((yCol) => {
        const yHeaderName = active.grid[`${yCol}1`]?.value || `Column ${yCol}`;
        const yValStr = active.grid[`${yCol}${r}`]?.value || '0';
        const parsedNum = parseFloat(yValStr.replace(/[^0-9.-]/g, '')) || 0;
        record[yHeaderName] = parsedNum;
      });
      rawData.push(record);
    }
    
    if (rawData.length === 0) return;
    
    const yHeaderNames = yCols.map((yCol) => active.grid[`${yCol}1`]?.value || `Column ${yCol}`);
    
    const newChart: ChartConfig = {
      id: `chart_${Date.now()}`,
      type: type as any,
      title: title || `${yHeaderNames.join(' & ')} by ${xHeaderName}`,
      data: rawData,
      xKey: 'label',
      yKeys: yHeaderNames,
      sheetId: active.id,
    };
    
    const updatedCharts = [...charts, newChart];
    setCharts(updatedCharts);
    saveToHistory(workbook, updatedCharts);
    setIsChartsGalleryOpen(false);
    setSidebarTab('dashboard'); // switch to dashboard so they immediately see it!
  };

  const handleAddChart = (newChart: ChartConfig) => {
    const chartWithSheet = {
      ...newChart,
      sheetId: newChart.sheetId || workbook.activeSheetId
    };
    const updatedCharts = [...charts, chartWithSheet];
    setCharts(updatedCharts);
    saveToHistory(workbook, updatedCharts);
  };

  const handleRemoveChart = (id: string) => {
    const updatedCharts = charts.filter((c) => c.id !== id);
    setCharts(updatedCharts);
    saveToHistory(workbook, updatedCharts);
  };

  const handleCreateSlicer = (colLabel: string) => {
    const active = workbook.sheets.find((s) => s.id === workbook.activeSheetId) || workbook.sheets[0];
    const colIndex = colLabel.charCodeAt(0) - 65;
    const headerName = active.grid[`${colLabel}1`]?.value || `Column ${colLabel}`;
    
    // Extract unique values
    const uniqueValsSet = new Set<string>();
    for (let r = 2; r <= active.rowCount; r++) {
      const val = active.grid[`${colLabel}${r}`]?.value;
      if (val && val.trim() !== '' && !val.toLowerCase().includes('total') && !val.toLowerCase().includes('grand')) {
        uniqueValsSet.add(val.trim());
      }
    }
    
    const uniqueValues = Array.from(uniqueValsSet);
    if (uniqueValues.length === 0) return;
    
    const newSlicer = {
      id: `slicer_${Date.now()}`,
      colIndex,
      colLabel,
      headerName,
      uniqueValues,
      selectedValue: null,
    };
    
    const updatedSheets = workbook.sheets.map((sheet) => {
      if (sheet.id === workbook.activeSheetId) {
        return {
          ...sheet,
          slicers: [...(sheet.slicers || []), newSlicer],
        };
      }
      return sheet;
    });
    
    const updatedWorkbook = { ...workbook, sheets: updatedSheets };
    setWorkbook(updatedWorkbook);
    saveToHistory(updatedWorkbook);
    setIsSlicerModalOpen(false);
  };

  const handleSelectSlicerValue = (slicerId: string, value: string | null) => {
    const updatedSheets = workbook.sheets.map((sheet) => {
      if (sheet.id === workbook.activeSheetId) {
        const updatedSlicers = (sheet.slicers || []).map((s) => {
          if (s.id === slicerId) {
            return { ...s, selectedValue: value };
          }
          return s;
        });
        return { ...sheet, slicers: updatedSlicers };
      }
      return sheet;
    });
    const updatedWorkbook = { ...workbook, sheets: updatedSheets };
    setWorkbook(updatedWorkbook);
    saveToHistory(updatedWorkbook);
  };

  const handleRemoveSlicer = (slicerId: string) => {
    const updatedSheets = workbook.sheets.map((sheet) => {
      if (sheet.id === workbook.activeSheetId) {
        const updatedSlicers = (sheet.slicers || []).filter((s) => s.id !== slicerId);
        return { ...sheet, slicers: updatedSlicers };
      }
      return sheet;
    });
    const updatedWorkbook = { ...workbook, sheets: updatedSheets };
    setWorkbook(updatedWorkbook);
    saveToHistory(updatedWorkbook);
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Google Sign-In failed:", e);
      alert("Sign-In failed. Please check network connections or browser popups.");
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Google Sign-Out failed:", e);
    }
  };

  const handleGenerateShareLink = async (): Promise<string | null> => {
    let docId = workbook.firestoreId;
    if (!docId) {
      try {
        const collectionRef = collection(db, "spreadsheets");
        const docRef = await addDoc(collectionRef, {
          workbook: {
            id: workbook.id,
            name: workbook.name,
            sheets: workbook.sheets,
            activeSheetId: workbook.activeSheetId
          },
          charts: charts,
          ownerId: auth.currentUser?.uid || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        docId = docRef.id;
        setWorkbook((prev) => ({ ...prev, firestoreId: docId }));
      } catch (err) {
        console.error("Error creating Firestore shared sheet:", err);
        alert("Could not initialize real-time database sheet. Please try again.");
        handleFirestoreError(err, OperationType.CREATE, "spreadsheets");
        return null;
      }
    }
    const fullUrl = `${window.location.origin}${window.location.pathname}?share=${docId}`;
    setShareLink(fullUrl);
    setIsCoAuthoring(true);
    return fullUrl;
  };

  // Listen to Firebase Auth state change
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  // Load and subscribe to shared real-time team workbook from query parameters (?share=docId)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    if (shareId) {
      setIsLoadingSharedWorkbook(true);
      setIsCoAuthoring(true);
      setShareLink(window.location.href);

      const unsub = onSnapshot(doc(db, "spreadsheets", shareId), (docSnap) => {
        setIsLoadingSharedWorkbook(false);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.workbook) {
            const incomingJson = JSON.stringify(data.workbook);
            setWorkbook((prev) => {
              const currentJson = JSON.stringify({
                id: prev.id,
                name: prev.name,
                sheets: prev.sheets,
                activeSheetId: prev.activeSheetId
              });
              if (incomingJson !== currentJson) {
                return { ...data.workbook, firestoreId: shareId };
              }
              return prev;
            });
            if (data.charts) {
              const incomingChartsJson = JSON.stringify(data.charts);
              setCharts((prev) => {
                const currentChartsJson = JSON.stringify(prev);
                if (incomingChartsJson !== currentChartsJson) {
                  return data.charts;
                }
                return prev;
              });
            }
          }
        } else {
          console.error("Shared workbook document not found in Firestore.");
          setIsCoAuthoring(false);
          alert("The shared workspace link is invalid or has been deleted. Reverting to local workspace.");
        }
      }, (error) => {
        console.error("Firestore onSnapshot subscription error:", error);
        setIsCoAuthoring(false);
        setIsLoadingSharedWorkbook(false);
        handleFirestoreError(error, OperationType.GET, `spreadsheets/${shareId}`);
      });

      return () => unsub();
    }
  }, []);

  // Debounced Cloud autosave syncing to Firestore if firestoreId exists
  useEffect(() => {
    if (workbook.firestoreId) {
      const handler = setTimeout(async () => {
        try {
          const docRef = doc(db, "spreadsheets", workbook.firestoreId!);
          await setDoc(docRef, {
            workbook: {
              id: workbook.id,
              name: workbook.name,
              sheets: workbook.sheets,
              activeSheetId: workbook.activeSheetId
            },
            charts: charts,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log("Auto-synced workbook modification to Cloud:", workbook.firestoreId);
        } catch (e) {
          console.error("Failed cloud co-authoring sync:", e);
          handleFirestoreError(e, OperationType.WRITE, `spreadsheets/${workbook.firestoreId}`);
        }
      }, 500);

      return () => clearTimeout(handler);
    }
  }, [workbook, charts]);

  // Evaluate initial templates calculations on startup
  useEffect(() => {
    const initialRecalculated = runWorkbookRecalculations(workbook.sheets);
    const initialWorkbook = { ...workbook, sheets: initialRecalculated };
    setWorkbook(initialWorkbook);
    setHistoryStack([{ workbook: initialWorkbook, charts }]);
  }, []);

  return (
    <div className={`min-h-screen font-sans ${themeMode === 'dark' ? 'bg-slate-950 text-slate-100 dark' : themeMode === 'professional' ? 'bg-[#f8fafc] text-slate-800 professional' : 'bg-slate-50 text-slate-800'}`}>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Ribbon Header Toolbar */}
        <Ribbon
          preset={preset}
          onPresetChange={handlePresetChange}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          onStyleChange={handleStyleChange}
          onCellAction={handleCellAction}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onTriggerDictation={handleTriggerDictation}
          onTriggerOCR={handleTriggerOCR}
          activeCellLabel={
            selection
              ? `${String.fromCharCode(65 + selection.startCol)}${selection.startRow + 1}`
              : 'A1'
          }
          activeCellFormulaValue={
            selection
              ? activeSheet.grid[`${String.fromCharCode(65 + selection.startCol)}${selection.startRow + 1}`]?.value || ''
              : ''
          }
          onFormulaBarChange={(val) => {
            if (selection) {
              const cellKey = `${String.fromCharCode(65 + selection.startCol)}${selection.startRow + 1}`;
              handleCellUpdate(cellKey, val);
            }
          }}
          onFormulaBarSubmit={() => {}}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < historyStack.length - 1}
          onExport={handleExportCSV}
          isPresentationMode={isPresentationMode}
          onTogglePresentation={() => setIsPresentationMode(!isPresentationMode)}
          onOpenFileBackstage={() => setIsBackstageOpen(true)}
          onAddLinkClick={() => setIsAddLinkOpen(true)}
          onPivotTableClick={() => setIsPivotModalOpen(true)}
          onChartsGalleryClick={() => setIsChartsGalleryOpen(true)}
          onInteractiveSlicerClick={() => setIsSlicerModalOpen(true)}
          onGoalSeekClick={() => setIsGoalSeekOpen(true)}
          onClaudeClick={() => setSidebarTab('claude')}
        />

        {/* Backstage Overlay View */}
        <Backstage
          isOpen={isBackstageOpen}
          onClose={() => setIsBackstageOpen(false)}
          onPresetChange={handlePresetChange}
          currentPreset={preset}
          onThemeModeChange={setThemeMode}
          currentTheme={themeMode}
          onExport={handleExportCSV}
          onImportOCR={(fileName, content) => {
            handleTriggerOCR(fileName, content);
            setIsBackstageOpen(false);
          }}
          onTriggerDictation={(cmd) => {
            handleTriggerDictation(cmd);
            setIsBackstageOpen(false);
          }}
          autosave={autosave}
          onAutosaveToggle={setAutosave}
          onManualSave={handleManualSave}
          activeSheet={activeSheet}
          firebaseUser={firebaseUser}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          onGenerateShareLink={handleGenerateShareLink}
          isCoAuthoring={isCoAuthoring}
          shareLink={shareLink}
        />

        {/* Real-time Co-Authoring Synchronizing Loader overlay */}
        {isLoadingSharedWorkbook && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md text-white select-none">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-12 h-12 rounded-full border-4 border-emerald-500/20 animate-pulse" />
                <Database className="text-emerald-500 animate-bounce" size={32} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-slate-100">Synchronizing Team Workspace</h3>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Connecting to live cloud spreadsheet session... Sub-16ms co-authoring synchronization pipeline activating.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Link AI Extraction Modal */}
        <AddLinkModal
          isOpen={isAddLinkOpen}
          onClose={() => setIsAddLinkOpen(false)}
          onImport={handleImportLinkData}
          themeMode={themeMode}
        />

        {/* Goal Seek Solver Modal */}
        <GoalSeekModal
          isOpen={isGoalSeekOpen}
          onClose={() => setIsGoalSeekOpen(false)}
          sheet={activeSheet}
          onApplyResult={(cellKey, val) => {
            handleCellUpdate(cellKey, val);
          }}
        />

        {/* Dynamic Column Headers Helper for Custom Modals */}
        {(() => {
          const getColHeaders = () => {
            const headers: { label: string; value: string }[] = [];
            const active = workbook.sheets.find((s) => s.id === workbook.activeSheetId) || workbook.sheets[0];
            for (let c = 0; c < active.colCount; c++) {
              const colLabel = String.fromCharCode(65 + c);
              const val = active.grid[`${colLabel}1`]?.value;
              if (val && val.trim() !== '') {
                headers.push({ label: colLabel, value: val });
              } else {
                headers.push({ label: colLabel, value: `Column ${colLabel}` });
              }
            }
            return headers;
          };

          return (
            <>
              {/* PivotTable Creation Modal */}
              {isPivotModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <Table size={18} />
                        <h3 className="font-bold text-sm tracking-tight">Create PivotTable</h3>
                      </div>
                      <button
                        onClick={() => setIsPivotModalOpen(false)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Synthesize and group your dataset values into a dynamic, formatted pivot summary sheet.
                      </p>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                          Row Dimension Column (Category)
                        </label>
                        <select
                          value={pivotRowCol}
                          onChange={(e) => setPivotRowCol(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {getColHeaders().map((h) => (
                            <option key={h.label} value={h.label}>
                              Column {h.label} ({h.value})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                          Value Metric Column (Numeric)
                        </label>
                        <select
                          value={pivotValCol}
                          onChange={(e) => setPivotValCol(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {getColHeaders().map((h) => (
                            <option key={h.label} value={h.label}>
                              Column {h.label} ({h.value})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                          Aggregation Function
                        </label>
                        <select
                          value={pivotAggFunc}
                          onChange={(e) => setPivotAggFunc(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="SUM">SUM (Totals)</option>
                          <option value="AVERAGE">AVERAGE (Mean)</option>
                          <option value="COUNT">COUNT (Frequency)</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setIsPivotModalOpen(false)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCreatePivotTable(pivotRowCol, pivotValCol, pivotAggFunc)}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        Generate PivotTable
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Charts Gallery Configuration Modal */}
              {isChartsGalleryOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <LineChart size={18} />
                        <h3 className="font-bold text-sm tracking-tight">Charts Gallery Configurator</h3>
                      </div>
                      <button
                        onClick={() => setIsChartsGalleryOpen(false)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                          Select Chart Visualizer Style
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { type: 'bar', label: 'Bar' },
                            { type: 'line', label: 'Line' },
                            { type: 'pie', label: 'Pie' },
                            { type: 'scatter', label: 'Scatter' },
                            { type: 'radar', label: 'Radar' },
                          ].map((opt) => (
                            <button
                              key={opt.type}
                              onClick={() => setChartType(opt.type as any)}
                              className={`p-2 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                chartType === opt.type
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-600 dark:text-emerald-400'
                                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="text-[10px] font-bold">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                          Chart Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={chartTitle}
                          onChange={(e) => setChartTitle(e.target.value)}
                          placeholder="Enter visualizer title..."
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                            X-Axis Label (Column)
                          </label>
                          <select
                            value={chartXCol}
                            onChange={(e) => setChartXCol(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {getColHeaders().map((h) => (
                              <option key={h.label} value={h.label}>
                                {h.label} - {h.value}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                            Y-Axis Value (Column)
                          </label>
                          <select
                            value={chartYCol}
                            onChange={(e) => setChartYCol(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {getColHeaders().map((h) => (
                              <option key={h.label} value={h.label}>
                                {h.label} - {h.value}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setIsChartsGalleryOpen(false)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCreateChartFromGallery(chartType, chartTitle, chartXCol, [chartYCol])}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-750 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        Insert Chart
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Slicer Creation Modal */}
              {isSlicerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="bg-amber-500 px-6 py-4 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <Grid size={18} />
                        <h3 className="font-bold text-sm tracking-tight">Insert Interactive Slicer</h3>
                      </div>
                      <button
                        onClick={() => setIsSlicerModalOpen(false)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Select a category or metric column to add a quick interactive slicer pill control filter to your workspace.
                      </p>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                          Target Column to Filter By
                        </label>
                        <select
                          value={slicerCol}
                          onChange={(e) => setSlicerCol(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {getColHeaders().map((h) => (
                            <option key={h.label} value={h.label}>
                              Column {h.label} ({h.value})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setIsSlicerModalOpen(false)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCreateSlicer(slicerCol)}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        Create Slicer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Main Workspace Stage */}
        <div className="flex-1 flex overflow-hidden p-3 gap-3">
          {/* Main Sheet Grid (Large Stage) */}
          <div className="flex-[3] flex flex-col overflow-hidden h-full">
            <SpreadsheetGrid
              sheet={activeSheet}
              onCellUpdate={handleCellUpdate}
              selection={selection}
              onSelectionChange={setSelection}
              sheets={workbook.sheets}
              activeSheetId={workbook.activeSheetId}
              onActiveSheetChange={(id) => {
                setWorkbook({ ...workbook, activeSheetId: id });
              }}
              onAddSheet={handleAddSheet}
              onDeleteSheet={handleDeleteSheet}
              anomalies={anomalies}
              themeMode={themeMode}
              autosave={autosave}
              onAutosaveToggle={setAutosave}
              onResetWorkspace={handleResetWorkspace}
              onAddLinkClick={() => setIsAddLinkOpen(true)}
              onSelectSlicerValue={handleSelectSlicerValue}
              onRemoveSlicer={handleRemoveSlicer}
              isExpanded={isPresentationMode}
              onSheetChange={handleSheetChange}
            />
          </div>

          {/* Sidebar Panels Panel Grid (Glassmorphism layout) */}
          {!isPresentationMode && (
            <div className="flex-[2] flex flex-col gap-3 h-full overflow-hidden min-w-[400px]">
              {/* Sidebar Tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold shrink-0 gap-0.5">
                <button
                  onClick={() => setSidebarTab('all')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    sidebarTab === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Layout size={12} />
                  <span>All</span>
                </button>
                <button
                  onClick={() => setSidebarTab('dashboard')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    sidebarTab === 'dashboard'
                      ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <BarChart size={12} />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setSidebarTab('analyst')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    sidebarTab === 'analyst'
                      ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Sparkles size={12} />
                  <span>Analyst</span>
                </button>
                <button
                  onClick={() => setSidebarTab('ml')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    sidebarTab === 'ml'
                      ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Brain size={12} />
                  <span>ML</span>
                </button>
                {/* Claude Co-pilot Tab Button */}
                <button
                  onClick={() => setSidebarTab('claude')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all border border-transparent ${
                    sidebarTab === 'claude'
                      ? 'bg-amber-600 text-white shadow-sm border-amber-500'
                      : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6zm-1 8h2v2h-2v-2zm0-4h2v2h-2v-2z" />
                  </svg>
                  <span className="font-bold">Claude</span>
                </button>
              </div>

              {/* Sidebar Content Area */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 min-h-0 scrollbar-none">
                {(sidebarTab === 'all' || sidebarTab === 'dashboard') && (
                  <div className={sidebarTab === 'all' ? 'h-[440px] shrink-0' : 'flex-1 min-h-[400px]'}>
                    <DashboardStudio
                      charts={charts}
                      sheet={activeSheet}
                      onAddChart={handleAddChart}
                      onRemoveChart={handleRemoveChart}
                      onTriggerDashboardBuilder={handleTriggerDictation}
                      isBuilding={isProcessing}
                    />
                  </div>
                )}

                {(sidebarTab === 'all' || sidebarTab === 'analyst') && (
                  <div className={sidebarTab === 'all' ? 'h-[440px] shrink-0' : 'flex-1 min-h-[400px]'}>
                    <AIAnalystPanel
                      sheet={activeSheet}
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      isProcessing={isProcessing}
                      onApplySuggestedAction={handleApplySuggestedAction}
                    />
                  </div>
                )}

                {(sidebarTab === 'all' || sidebarTab === 'ml') && (
                  <div className={sidebarTab === 'all' ? 'h-[440px] shrink-0' : 'flex-1 min-h-[400px]'}>
                    <MLPanel
                      sheet={activeSheet}
                      onDetectAnomalies={(reports) => {
                        const keys = reports.map((r) => r.cell).filter((c) => c !== 'General Audit');
                        setAnomalies(keys);
                      }}
                      onForecast={() => {}}
                      onApplyWhatIf={handleApplyWhatIf}
                    />
                  </div>
                )}

                {/* Claude Co-pilot Content View */}
                {(sidebarTab === 'all' || sidebarTab === 'claude') && (
                  <div className={sidebarTab === 'all' ? 'h-[480px] shrink-0' : 'flex-1 min-h-[400px]'}>
                    <ClaudePanel
                      sheet={activeSheet}
                      workbook={workbook}
                      onApplyClaudeAction={handleApplyClaudeAction}
                      isProcessing={isProcessing}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
