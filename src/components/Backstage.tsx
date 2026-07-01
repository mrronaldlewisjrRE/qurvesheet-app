import React, { useState } from 'react';
import {
  Home,
  FilePlus,
  FolderOpen,
  Save,
  FileDown,
  Printer,
  Share2,
  Info,
  Settings,
  X,
  FileSpreadsheet,
  Cpu,
  UserCheck,
  Download,
  Upload,
  Globe,
  Database,
  Lock,
  Eye,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { WorkspacePreset, ThemeMode, SheetData } from '../types';
import { colIndexToLabel } from '../utils/formula';
import QurveSheetLogo from './QurveSheetLogo';

interface BackstageProps {
  isOpen: boolean;
  onClose: () => void;
  onPresetChange: (preset: WorkspacePreset) => void;
  currentPreset: WorkspacePreset;
  onThemeModeChange: (theme: ThemeMode) => void;
  currentTheme: ThemeMode;
  onExport: () => void;
  onImportOCR: (fileName: string, data: Record<string, string>) => void;
  onTriggerDictation: (command: string) => void;
  autosave?: boolean;
  onAutosaveToggle?: (enabled: boolean) => void;
  onManualSave?: () => void;
  activeSheet: SheetData;
  firebaseUser: any;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onGenerateShareLink: () => Promise<string | null>;
  isCoAuthoring: boolean;
  shareLink: string | null;
}

export default function Backstage({
  isOpen,
  onClose,
  onPresetChange,
  currentPreset,
  onThemeModeChange,
  currentTheme,
  onExport,
  onImportOCR,
  onTriggerDictation,
  autosave = true,
  onAutosaveToggle,
  onManualSave,
  activeSheet,
  firebaseUser,
  onGoogleSignIn,
  onGoogleSignOut,
  onGenerateShareLink,
  isCoAuthoring,
  shareLink,
}: BackstageProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'new' | 'open' | 'save' | 'saveas' | 'print' | 'share' | 'info' | 'options'>('home');
  const [newPrompt, setNewPrompt] = useState('');
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [locale, setLocale] = useState('en-US');
  const [calcMode, setCalcMode] = useState<'auto' | 'manual'>('auto');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('editor');
  const [sharedUsers, setSharedUsers] = useState<{ email: string; role: string }[]>([
    { email: 'architect@omnisheet.ai', role: 'owner' },
  ]);
  const [printScaling, setPrintScaling] = useState(100);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [hasGridlines, setHasGridlines] = useState(true);
  const [printColorMode, setPrintColorMode] = useState<'color' | 'bw'>('color');
  const [fitToPage, setFitToPage] = useState(false);
  const [printSides, setPrintSides] = useState<'single' | 'double'>('single');
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [pageRangeOption, setPageRangeOption] = useState<'all' | 'custom'>('all');
  const [pageRangeValue, setPageRangeValue] = useState<string>('1');
  const [printDate] = useState(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  });

  // Find non-empty cells bounding box for Print & Fit-To-Page features
  let maxPopulatedRow = 0; // 0-indexed
  let maxPopulatedCol = 0; // 0-indexed
  let hasAnyPopulatedCells = false;

  if (activeSheet && activeSheet.grid) {
    Object.entries(activeSheet.grid).forEach(([cellKey, cell]) => {
      if (cell && cell.value && cell.value.trim() !== '') {
        const match = cellKey.toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
        if (match) {
          const colLabel = match[1];
          const rowLabel = match[2];
          
          let colIdx = 0;
          for (let i = 0; i < colLabel.length; i++) {
            colIdx = colIdx * 26 + (colLabel.charCodeAt(i) - 64);
          }
          colIdx = colIdx - 1;

          const rowIdx = parseInt(rowLabel, 10) - 1;

          maxPopulatedRow = Math.max(maxPopulatedRow, rowIdx);
          maxPopulatedCol = Math.max(maxPopulatedCol, colIdx);
          hasAnyPopulatedCells = true;
        }
      }
    });
  }

  const printColLimit = hasAnyPopulatedCells 
    ? Math.min(activeSheet.colCount, maxPopulatedCol + 1) 
    : (printOrientation === 'portrait' ? 5 : 7);

  const printRowLimit = hasAnyPopulatedCells 
    ? Math.min(activeSheet.rowCount, maxPopulatedRow + 1) 
    : (printOrientation === 'portrait' ? 12 : 7);

  // Available height in preview card: portrait is ~230px, landscape is ~130px
  const availHeightForTable = printOrientation === 'portrait' ? 230 : 130;
  // Normal row height is 12px, header is 12px. Total unscaled table height:
  const unscaledTableHeight = (printRowLimit + 1) * 12;
  const autoScaleFactor = availHeightForTable / unscaledTableHeight;
  const contentScale = fitToPage ? Math.max(0.35, Math.min(1.0, autoScaleFactor)) : 1.0;

  const tableFontSizeClass = contentScale < 0.5 ? 'text-[5px]' : contentScale < 0.75 ? 'text-[6px]' : 'text-[7px]';
  const headerFontSizeClass = contentScale < 0.5 ? 'text-[4.5px]' : contentScale < 0.75 ? 'text-[5px]' : 'text-[6px]';
  const dynamicRowHeightPx = Math.max(6, Math.round(12 * contentScale));

  if (!isOpen) return null;

  // Recent Files
  const recentFiles = [
    { name: 'SaaS ARR & Churn Forecast 2026.xlsx', size: '2.4 MB', edited: '2 hours ago', preset: 'finance' },
    { name: 'Hardware Parts Supply Chain Ledger.csv', size: '412 KB', edited: 'Yesterday', preset: 'operations' },
    { name: 'Global Sales Performance Analytics.osheet', size: '1.8 MB', edited: '3 days ago', preset: 'analytics' },
    { name: 'Board Meeting Presentation Dashboard.pdf', size: '5.2 MB', edited: '1 week ago', preset: 'executive' },
  ];

  // Scaffolding generator simulating AI spreadsheet creation
  const handleAIScaffoldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    setIsScaffolding(true);
    setTimeout(() => {
      setIsScaffolding(false);
      onTriggerDictation(`Create sheet based on request: ${newPrompt}`);
      onClose();
    }, 1800);
  };

  const handleShareAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    setSharedUsers([...sharedUsers, { email: shareEmail, role: shareRole }]);
    setShareEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex overflow-hidden font-sans select-none">
      {/* Left Backstage Green/Indigo Accent Rail */}
      <div className="w-64 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800/60">
        {/* Title / Back button */}
        <div className="p-5 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base">
            <QurveSheetLogo size={24} showText={true} textSize="md" />
            <span className="text-emerald-400 font-bold tracking-tight text-[9px] bg-slate-900 px-1.5 py-0.5 rounded-full uppercase ml-1">Backstage</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Return to sheet"
          >
            <X size={14} />
          </button>
        </div>

        {/* Backstage Navigation Tabs */}
        <div className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'home' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home size={15} />
            <span>Home</span>
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'new' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FilePlus size={15} />
            <span>New from AI / Template</span>
          </button>
          <button
            onClick={() => setActiveTab('open')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'open' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen size={15} />
            <span>Open & OCR Import</span>
          </button>

          <div className="h-px bg-slate-900 my-2" />

          <button
            onClick={() => {
              onManualSave?.();
              onExport();
              setActiveTab('save');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'save' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save size={15} />
            <span>Save Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab('saveas')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'saveas' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileDown size={15} />
            <span>Save As / Export</span>
          </button>
          <button
            onClick={() => setActiveTab('print')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'print' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer size={15} />
            <span>Print Layout Preview</span>
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'share' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 size={15} />
            <span>Share & Co-Author</span>
          </button>

          <div className="h-px bg-slate-900 my-2" />

          <button
            onClick={() => setActiveTab('info')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'info' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info size={15} />
            <span>Info & Metadata Summary</span>
          </button>
          <button
            onClick={() => setActiveTab('options')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'options' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings size={15} />
            <span>Options & Governance</span>
          </button>
        </div>

        {/* Google Authentication Connection Section */}
        {firebaseUser ? (
          <div className="p-4 border-t border-slate-900 space-y-2.5">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Connected User</div>
            <div className="flex items-center gap-2.5 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || "User"}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center border border-slate-700">
                  {firebaseUser.displayName ? firebaseUser.displayName.charAt(0).toUpperCase() : (firebaseUser.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-200 truncate leading-none mb-0.5">{firebaseUser.displayName || 'OmniUser'}</div>
                <div className="text-[9px] text-slate-500 truncate font-mono">{firebaseUser.email}</div>
              </div>
            </div>
            <button
              onClick={onGoogleSignOut}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 text-[10px] font-semibold rounded-lg transition-all border border-slate-800/80 cursor-pointer text-center block"
            >
              Disconnect Account
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-slate-900 space-y-3">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Cloud Identity</div>
            <button
              onClick={onGoogleSignIn}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.99 1 12 1 7.35 1 3.39 3.67 1.39 7.56l3.85 2.99c.9-2.7 3.42-4.51 6.76-4.51z"/>
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.45h6.45c-.28 1.48-1.12 2.73-2.38 3.58l3.71 2.87c2.17-2 3.42-4.94 3.42-8.56z"/>
                <path fill="#FBBC05" d="M5.24 14.55c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.39 7.16C.5 8.93 0 10.91 0 13s.5 4.07 1.39 5.84l3.85-3.29z"/>
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.71-2.87c-1.03.69-2.35 1.11-4.25 1.11-3.34 0-5.86-1.81-6.76-4.51L1.39 17.11C3.39 21.01 7.35 23 12 23z"/>
              </svg>
              <span>Connect Google Account</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="p-4 border-t border-slate-900 text-[10px] text-slate-500 text-center font-mono space-y-1">
          <div>QurveSheet Enterprise v2.4</div>
          <div className="text-emerald-500 font-semibold flex items-center justify-center gap-1">
            <ShieldCheck size={11} />
            <span>Secure Cloud Connected</span>
          </div>
        </div>
      </div>

      {/* Right backstage detail area */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                  <QurveSheetLogo size={36} />
                  <span>Welcome to QurveSheet Backstage</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select, scaffold, translate, and secure your high-performance financial and analytical models.
                </p>
              </div>

              {/* Quick AI Scaffolder */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                  <Sparkles size={16} className="animate-pulse" />
                  <span>Interactive AI Starter Scaffolder</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-xl">
                  Describe the spreadsheet model you need in plain english. The AI co-pilot will build full column mappings, formats, mock indices, and formula constraints instantly.
                </p>
                <form onSubmit={handleAIScaffoldSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="E.g., ROI projection sheet for real-estate rental with 12% cash-on-cash yield..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isScaffolding || !newPrompt.trim()}
                    className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    {isScaffolding ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                    <span>Scaffold</span>
                  </button>
                </form>
              </div>

              {/* Recent Sheets */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Workspace Workbooks</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recentFiles.map((file, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        onPresetChange(file.preset as WorkspacePreset);
                        onClose();
                      }}
                      className="p-4 bg-white dark:bg-slate-950 hover:bg-emerald-500/5 hover:border-emerald-500/30 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center cursor-pointer transition-all shadow-sm"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{file.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {file.size} • Edited {file.edited}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500">
                        {file.preset}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NEW */}
          {activeTab === 'new' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h1 className="text-xl font-bold">New Spreadsheet Blueprint</h1>
                <p className="text-xs text-slate-500">Start with a clean slate or select highly optimized industry-standard frameworks.</p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => {
                    onTriggerDictation('Create empty worksheet layout');
                    onClose();
                  }}
                  className="p-5 border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all"
                >
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <FilePlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold">Blank Workbook</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Standard grid with formula support</p>
                  </div>
                </div>

                <div
                  onClick={() => {
                    onPresetChange('analytics');
                    onClose();
                  }}
                  className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all"
                >
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-xl">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold">Global Analytics</h3>
                    <p className="text-[10px] text-slate-400 mt-1">International sales & regional z-score</p>
                  </div>
                </div>

                <div
                  onClick={() => {
                    onPresetChange('finance');
                    onClose();
                  }}
                  className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all"
                >
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-xl">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold">SaaS Financial Models</h3>
                    <p className="text-[10px] text-slate-400 mt-1">CAGR, CAC, ACV, and margin projections</p>
                  </div>
                </div>

                <div
                  onClick={() => {
                    onPresetChange('operations');
                    onClose();
                  }}
                  className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all"
                >
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-500 rounded-xl">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold">Hardware Operations</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Lead times, SKU limits, and risk warnings</p>
                  </div>
                </div>

                <div
                  onClick={() => {
                    onPresetChange('executive');
                    onClose();
                  }}
                  className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all"
                >
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-xl">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold">Executive Board Deck</h3>
                    <p className="text-[10px] text-slate-400 mt-1">High level KPIs & quarterly performance</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OPEN & OCR */}
          {activeTab === 'open' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h1 className="text-xl font-bold">Open Workbooks & OCR Scanner</h1>
                <p className="text-xs text-slate-500">Connect cloud nodes, upload standard spreadsheets or import printed scans directly.</p>
              </div>

              {/* OCR Scanner upload zone */}
              <div className="p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                  <Upload size={22} />
                </div>
                <div>
                  <h3 className="text-xs font-bold">Drag and drop scanned PDF/invoice photo</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Supports multi-page PDFs, handwritten notes, and receipts.</p>
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      onImportOCR('invoice_scan_012.png', {
                        A1: 'OCR Reconstructed Invoice',
                        A3: 'Subtotal', D3: '2500',
                        A4: 'Tax Adjust', D4: '=D3*0.15',
                        A5: 'Total Paid', D5: '=SUM(D3:D4)',
                      });
                      onClose();
                    }}
                    className="px-3 py-1.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                  >
                    Load Sample Invoice
                  </button>
                  <button
                    onClick={() => {
                      onImportOCR('balance_sheet_rec.pdf', {
                        A1: 'OCR Recovered Financial Balance Sheet',
                        A3: 'Asset Liquidity', B3: '145000', C3: '162000', D3: '=(C3-B3)/B3',
                      });
                      onClose();
                    }}
                    className="px-3 py-1.5 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                  >
                    Load Balance Sheet PDF
                  </button>
                </div>
              </div>

              {/* Cloud connectors */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cloud Connectors</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium">
                  <button className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 text-center flex items-center gap-2 justify-center">
                    <Globe size={14} className="text-blue-500" />
                    <span>Google Drive</span>
                  </button>
                  <button className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 text-center flex items-center gap-2 justify-center">
                    <Globe size={14} className="text-sky-500" />
                    <span>OneDrive</span>
                  </button>
                  <button className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 text-center flex items-center gap-2 justify-center">
                    <Globe size={14} className="text-amber-500" />
                    <span>AWS S3 Node</span>
                  </button>
                  <button className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 text-center flex items-center gap-2 justify-center">
                    <Database size={14} className="text-emerald-500" />
                    <span>Postgres SQL</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SAVE */}
          {activeTab === 'save' && (
            <div className="space-y-6 text-center py-10 animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <Save size={26} />
              </div>
              <h1 className="text-xl font-bold">Ledger State Synced & Saved</h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                QurveSheet automatically preserves version snapshots in memory with lossless Excel formulas. Offline synchronizer will bundle state and stream back to the master DB when offline connections resume.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer"
              >
                Return to Workbook
              </button>
            </div>
          )}

          {/* TAB 5: SAVE AS / EXPORT */}
          {activeTab === 'saveas' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h1 className="text-xl font-bold">Save As / Lossless Export</h1>
                <p className="text-xs text-slate-500">Retrieve fully formatted workbooks with dynamic arrays, charts, and macro scripts preserved.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold">Lossless Excel (.xlsx)</h3>
                      <p className="text-[10px] text-slate-400">Microsoft Excel compatible formulas & formatting</p>
                    </div>
                  </div>
                  <button
                    onClick={onExport}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download Excel Package</span>
                  </button>
                </div>

                <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-xl">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold">Standard Comma Separated (.csv)</h3>
                      <p className="text-[10px] text-slate-400">Raw tabular layout suited for SQL, Python, or R</p>
                    </div>
                  </div>
                  <button
                    onClick={onExport}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download CSV Data</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PRINT LAYOUT PREVIEW */}
          {activeTab === 'print' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h1 className="text-xl font-bold">Print & Page Layout View</h1>
                <p className="text-xs text-slate-500">Configure paper boundaries, scale multipliers, and margin guides for compliance handoffs.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Print Settings Left */}
                <div className="md:col-span-1 space-y-4 p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Print Parameters</h3>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">Orientation</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrintOrientation('portrait')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          printOrientation === 'portrait'
                            ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="w-3 h-4 border border-current rounded-xs flex flex-col gap-0.5 p-0.5 shrink-0">
                          <div className="w-full h-[1px] bg-current opacity-60" />
                          <div className="w-2/3 h-[1px] bg-current opacity-60" />
                        </div>
                        <span>Portrait</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintOrientation('landscape')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          printOrientation === 'landscape'
                            ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="w-4 h-3 border border-current rounded-xs flex flex-col gap-0.5 p-0.5 shrink-0">
                          <div className="w-full h-[1px] bg-current opacity-60" />
                          <div className="w-2/3 h-[1px] bg-current opacity-60" />
                        </div>
                        <span>Landscape</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] text-slate-400 block font-semibold">Scale multiplier</label>
                      <span className="text-xs font-bold font-mono text-emerald-500">{printScaling}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      step="5"
                      value={printScaling}
                      onChange={(e) => setPrintScaling(parseInt(e.target.value))}
                      disabled={fitToPage}
                      className="w-full accent-emerald-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">Color Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrintColorMode('color')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          printColorMode === 'color'
                            ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Color
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintColorMode('bw')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          printColorMode === 'bw'
                            ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Black & White
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">Print Sides</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrintSides('single')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          printSides === 'single'
                            ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Single Side
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintSides('double')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          printSides === 'double'
                            ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        2-Sided (Duplex)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">Copies</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                          className="w-7 h-7 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={printCopies}
                          onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-10 text-center py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setPrintCopies(printCopies + 1)}
                          className="w-7 h-7 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">Page Range</label>
                      <select
                        value={pageRangeOption}
                        onChange={(e) => setPageRangeOption(e.target.value as any)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Pages</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>

                  {pageRangeOption === 'custom' && (
                    <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                      <label className="text-[10px] text-slate-400 block font-semibold">Enter Range</label>
                      <input
                        type="text"
                        placeholder="e.g. 1-2, 4"
                        value={pageRangeValue}
                        onChange={(e) => setPageRangeValue(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-semibold py-1">
                    <span className="text-slate-500">Render Gridlines</span>
                    <input
                      type="checkbox"
                      checked={hasGridlines}
                      onChange={(e) => setHasGridlines(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold py-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <div className="flex flex-col">
                      <span className="text-slate-500">Fit to Page</span>
                      <span className="text-[9px] text-slate-400 font-normal">Auto-adjust layout limits</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={fitToPage}
                      onChange={(e) => setFitToPage(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={() => {
                      alert('Sending ledger matrices to printer framework...');
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Printer size={13} />
                    <span>Print PDF Ledger</span>
                  </button>
                </div>

                {/* Inline Print Preview right */}
                <div className="md:col-span-2 p-6 bg-slate-200 dark:bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-300 dark:border-slate-800 overflow-hidden min-h-[480px] relative">
                  {/* Floating Action Page Switcher */}
                  <div className="mb-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-1.5 px-3 rounded-xl border border-slate-300/40 dark:border-slate-800/40 flex items-center gap-4 shadow-sm z-10">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Canvas Orientation</span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                      <button
                        onClick={() => setPrintOrientation('portrait')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          printOrientation === 'portrait'
                            ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <div className="w-2.5 h-3 border border-current rounded-xs flex flex-col gap-0.5 p-0.5 shrink-0">
                          <div className="w-full h-[1px] bg-current opacity-60" />
                        </div>
                        <span>Portrait</span>
                      </button>
                      <button
                        onClick={() => setPrintOrientation('landscape')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          printOrientation === 'landscape'
                            ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <div className="w-3.5 h-2.5 border border-current rounded-xs flex flex-col gap-0.5 p-0.5 shrink-0">
                          <div className="w-full h-[1px] bg-current opacity-60" />
                        </div>
                        <span>Landscape</span>
                      </button>
                    </div>
                  </div>

                  {/* Layered Stacked Pages visual for 2-Sided (Duplex) printing */}
                  {printSides === 'double' && (
                    <>
                      <div
                        className={`absolute bg-white/40 border border-slate-300 dark:border-slate-800 rounded shadow-md pointer-events-none transition-all ${
                          printOrientation === 'portrait' ? 'w-[320px] h-[440px] translate-x-2.5 translate-y-2.5' : 'w-[440px] h-[320px] translate-x-2.5 translate-y-2.5'
                        }`}
                        style={{
                          transform: `scale(${printScaling / 100})`,
                          transformOrigin: 'center',
                          filter: printColorMode === 'bw' ? 'grayscale(100%)' : 'none'
                        }}
                      />
                      <div
                        className={`absolute bg-white/70 border border-slate-300 dark:border-slate-800 rounded shadow-sm pointer-events-none transition-all ${
                          printOrientation === 'portrait' ? 'w-[320px] h-[440px] translate-x-1.5 translate-y-1.5' : 'w-[440px] h-[320px] translate-x-1.5 translate-y-1.5'
                        }`}
                        style={{
                          transform: `scale(${printScaling / 100})`,
                          transformOrigin: 'center',
                          filter: printColorMode === 'bw' ? 'grayscale(100%)' : 'none'
                        }}
                      />
                    </>
                  )}

                  <div
                    className={`bg-white text-slate-800 shadow-lg p-6 border rounded shadow-inner flex flex-col justify-between transition-all relative ${
                      printOrientation === 'portrait' ? 'w-[320px] h-[440px]' : 'w-[440px] h-[320px]'
                    }`}
                    style={{
                      transform: `scale(${printScaling / 100})`,
                      transformOrigin: 'center',
                      filter: printColorMode === 'bw' ? 'grayscale(100%) contrast(1.1)' : 'none'
                    }}
                  >
                    {/* Real document layout with live spreadsheet data */}
                    <div className="space-y-3 flex-1 flex flex-col justify-start">
                      <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                        <div className="space-y-0.5">
                          <h4 className="text-[11px] font-bold text-slate-900 tracking-tight uppercase truncate max-w-[180px]">
                            {activeSheet.name}
                          </h4>
                          <span className="text-[7px] text-slate-400 block font-medium">
                            QurveSheet Live Document Handoff
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[7px] text-slate-400 font-mono block">
                            Page 1 of {pageRangeOption === 'custom' ? '2' : '1'} {fitToPage && '• Fit'}
                          </span>
                          <span className="text-[7px] text-emerald-600 font-bold font-mono uppercase">
                            {currentPreset} ACTIVE
                          </span>
                        </div>
                      </div>

                      {/* Live Date Block */}
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex justify-between items-center text-[7px] text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[6px]">Generation Date</span>
                          <span className="font-mono font-bold text-slate-700">{printDate}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[6px]">Data Metrics</span>
                          <span className="font-mono font-bold text-slate-700">
                            {Object.keys(activeSheet.grid).length} populated cells
                          </span>
                        </div>
                      </div>

                      {/* Live Spreadsheet Grid representation */}
                      <div className="border border-slate-200 rounded overflow-hidden flex-1 flex flex-col bg-white">
                        <table style={{ fontSize: tableFontSizeClass === 'text-[5px]' ? '5px' : tableFontSizeClass === 'text-[6px]' ? '6px' : '7px' }} className="w-full border-collapse text-slate-700 table-fixed">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                              <th style={{ height: `${dynamicRowHeightPx}px`, fontSize: headerFontSizeClass === 'text-[4.5px]' ? '4.5px' : headerFontSizeClass === 'text-[5px]' ? '5px' : '6px' }} className="w-5 border-r border-slate-200 text-slate-400 font-mono text-center"></th>
                              {Array.from({ length: printColLimit }).map((_, cIndex) => (
                                <th key={cIndex} style={{ height: `${dynamicRowHeightPx}px`, fontSize: headerFontSizeClass === 'text-[4.5px]' ? '4.5px' : headerFontSizeClass === 'text-[5px]' ? '5px' : '6px' }} className="border-r border-slate-200 font-mono font-bold text-slate-500 text-center">
                                  {colIndexToLabel(cIndex)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: printRowLimit }).map((_, rIndex) => {
                              const rowLabel = rIndex + 1;
                              return (
                                <tr key={rIndex} className="border-b border-slate-100 last:border-b-0">
                                  <td style={{ height: `${dynamicRowHeightPx}px`, fontSize: tableFontSizeClass === 'text-[5px]' ? '5px' : tableFontSizeClass === 'text-[6px]' ? '6px' : '7px' }} className="bg-slate-50 border-r border-slate-200 text-center font-mono font-bold text-slate-400">
                                    {rowLabel}
                                  </td>
                                  {Array.from({ length: printColLimit }).map((_, cIndex) => {
                                    const colLabel = colIndexToLabel(cIndex);
                                    const cellKey = `${colLabel}${rowLabel}`;
                                    const cell = activeSheet.grid[cellKey];
                                    const displayValue = cell ? (cell.computed !== undefined ? cell.computed : cell.value) : '';
                                    const style = cell?.style || {};
                                    const alignClass = style.align === 'center' ? 'text-center' : style.align === 'right' ? 'text-right' : 'text-left';
                                    
                                    const cellStyles: React.CSSProperties = {
                                      fontWeight: style.bold ? 'bold' : 'normal',
                                      fontStyle: style.italic ? 'italic' : 'normal',
                                      textDecoration: style.underline ? 'underline' : 'none',
                                      backgroundColor: style.bg || undefined,
                                      color: style.color || undefined,
                                    };

                                    return (
                                      <td
                                        key={cIndex}
                                        style={{ ...cellStyles, height: `${dynamicRowHeightPx}px`, fontSize: tableFontSizeClass === 'text-[5px]' ? '5px' : tableFontSizeClass === 'text-[6px]' ? '6px' : '7px' }}
                                        className={`px-1 truncate ${hasGridlines ? 'border-r border-slate-100 last:border-r-0' : ''} ${alignClass}`}
                                      >
                                        {displayValue}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2 flex justify-between text-[6px] text-slate-400 font-mono">
                      <span>Ref: {currentPreset.toUpperCase()}-LEDGER</span>
                      <span className="font-bold uppercase text-emerald-600">
                        {printCopies > 1 ? `${printCopies} Copies` : '1 Copy'} • {pageRangeOption === 'all' ? 'All Pages' : `Range: pgs ${pageRangeValue || '1'}`} • {printSides === 'double' ? 'Duplex (2-sided)' : 'Simplex (1-sided)'}
                      </span>
                      <span>SECURE LOCAL LIVE VIEW</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SHARE */}
          {activeTab === 'share' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h1 className="text-xl font-bold">Collaborative Workspace Sharing</h1>
                  <p className="text-xs text-slate-500">Stream changes in real-time. Secured via Firebase Firestore sub-16ms synchronization pipeline.</p>
                </div>
                {isCoAuthoring && (
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-bold rounded-full flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Live Co-Authoring Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Real-time Team Sharing Link Connection */}
                <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                      <Globe size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Co-Authoring & Team Links</h3>
                      <p className="text-[11px] text-slate-400">Generate a unique cloud workspace token link. Anyone with this link can view or edit this sheet simultaneously in real-time.</p>
                    </div>
                  </div>

                  {shareLink ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dynamic Cloud Sync Link</span>
                        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                          <ShieldCheck size={12} />
                          At-Rest Encrypted
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareLink}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded-xl px-3 py-2 font-mono focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(shareLink);
                            alert("Team co-authoring link copied to clipboard! Share it with your colleagues to start editing together.");
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
                        >
                          Copy Link
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        💡 <strong>How to use:</strong> Send this link to anyone in your team. They can open it directly in their browser. All formulas, values, cell styles, and slicers will sync instantly in real-time!
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-3">
                      <div className="text-slate-400 flex justify-center">
                        <Globe size={32} />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold">This ledger is currently local to your browser session</div>
                        <div className="text-[10px] text-slate-400">Upgrade this workspace to the cloud database to enable secure collaboration.</div>
                      </div>
                      <button
                        onClick={async () => {
                          const url = await onGenerateShareLink();
                          if (url) {
                            alert("Secure Cloud workspace successfully initialized! Your team link is now ready.");
                          }
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Share2 size={13} />
                        <span>Generate Collaborative Team Link</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Invite */}
                <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invite Co-authors</h3>
                  <form onSubmit={handleShareAdd} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold block">Email Address</label>
                      <input
                        type="email"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        placeholder="analyst@firm.com"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold block">Access Role</label>
                      <select
                        value={shareRole}
                        onChange={(e) => setShareRole(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                      >
                        <option value="editor">Editor (Full CRDT sync)</option>
                        <option value="commenter">Commenter Only</option>
                        <option value="viewer">Viewer (Read-only)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 size={12} />
                      <span>Grant Access Token</span>
                    </button>
                  </form>
                </div>

                {/* Active users */}
                <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Authorized Collaborators</h3>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {sharedUsers.map((user, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{user.email}</span>
                          <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                            {user.role}
                          </span>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: INFO */}
          {activeTab === 'info' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h1 className="text-xl font-bold">Workbook Metadata & Inspection</h1>
                <p className="text-xs text-slate-500">Inspect formula precedents, check personal signature traces and compile natural-language summaries.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workbook Statistics</h3>
                  <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 py-1.5">
                      <span>Assigned Preset</span>
                      <span className="font-mono text-emerald-500 capitalize">{currentPreset}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 py-1.5">
                      <span>Maximum Row Capacity</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">Infinite (Virtualized 10M cells limit)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 py-1.5">
                      <span>Calculation Engine status</span>
                      <span className="text-emerald-500 font-bold">GPU ACCELERATED</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span>Locale Config</span>
                      <span className="font-mono text-indigo-500">en-US (Period separation)</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security & Signatures</h3>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl space-y-1">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">AES-256 Active</div>
                      <div className="text-[10px] text-slate-400">All cells and formula strings are encrypted at rest.</div>
                    </div>
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl space-y-1">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">GDPR / CCPA Compliant</div>
                      <div className="text-[10px] text-slate-400">Personal metadata and workbook trace signatures cleared automatically.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: OPTIONS / SETTINGS */}
          {activeTab === 'options' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h1 className="text-xl font-bold">Settings & Compliance Options</h1>
                <p className="text-xs text-slate-500">Configure global formula recursion depth, locale preferences and AI provider credentials.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Formulas & calculation */}
                <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Calculation Modes</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold block">Recalculation Strategy</label>
                      <select
                        value={calcMode}
                        onChange={(e) => setCalcMode(e.target.value as any)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none font-semibold"
                      >
                        <option value="auto">Automatic (Recalculate dirty graph instantly)</option>
                        <option value="manual">Manual (Recalculate on F9 / Calculate Now button)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold block">UI Locale Code</label>
                      <select
                        value={locale}
                        onChange={(e) => setLocale(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                      >
                        <option value="en-US">en-US (Comma thousand, Period decimal)</option>
                        <option value="de-DE">de-DE (Period thousand, Comma decimal)</option>
                        <option value="ar-SA">ar-SA (RTL / Right-to-Left alignment force)</option>
                      </select>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-900">
                      <label className="text-[11px] text-slate-400 font-semibold block mb-1">Workbook Autosave</label>
                      <button
                        type="button"
                        onClick={() => onAutosaveToggle?.(!autosave)}
                        className={`w-full px-3 py-2 text-xs rounded-lg border text-left font-semibold flex items-center justify-between transition-all ${
                          autosave
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <span>{autosave ? 'Autosave Enabled (Live Sync)' : 'Autosave Disabled (Memory Only)'}</span>
                        <div className={`w-2 h-2 rounded-full ${autosave ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Credentials */}
                <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Co-pilot credentials</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold block">Primary Engine Model</label>
                      <select
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none font-semibold"
                      >
                        <option value="gemini">Google Gemini 1.5 Flash (Ultralight latency)</option>
                        <option value="claude">Anthropic Claude 3.5 Sonnet (Formula specialist)</option>
                        <option value="openai">OpenAI GPT-4o (Data analysis model)</option>
                        <option value="local">Local Llama 3 via Ollama (100% on-device privacy)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold block">Encryption Key Source</label>
                      <input
                        type="password"
                        value="••••••••••••••••••••••••••••"
                        disabled
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
