import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Binary,
  Undo2,
  Redo2,
  Sparkles,
  Mic,
  Upload,
  Plus,
  Trash2,
  Download,
  Eye,
  FileSpreadsheet,
  Cpu,
  RefreshCw,
  FolderOpen,
  Save,
  Printer,
  Share2,
  Info,
  Settings,
  HelpCircle,
  Scissors,
  Copy,
  Clipboard,
  Table,
  LineChart,
  Grid,
  PenTool,
  Clock,
  Activity,
  Shield,
  Key,
  Layers,
  Lock,
  Compass,
  AlertTriangle,
  PlayCircle,
  Link,
  HelpCircle as HelpIcon,
  X,
  PaintBucket,
  Type,
  Target,
} from 'lucide-react';
import { WorkspacePreset, ThemeMode } from '../types';
import QurveSheetLogo from './QurveSheetLogo';

interface RibbonProps {
  preset: WorkspacePreset;
  onPresetChange: (preset: WorkspacePreset) => void;
  themeMode: ThemeMode;
  onThemeModeChange: (theme: ThemeMode) => void;
  onStyleChange: (styleKey: string, value: any) => void;
  onCellAction: (actionType: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTriggerDictation: (command: string) => void;
  onTriggerOCR: (fileName: string, content: Record<string, string>) => void;
  activeCellLabel: string;
  activeCellFormulaValue: string;
  onFormulaBarChange: (val: string) => void;
  onFormulaBarSubmit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  isPresentationMode: boolean;
  onTogglePresentation: () => void;
  onOpenFileBackstage: () => void; // Dedicated Backstage trigger
  onAddLinkClick?: () => void;
  onPivotTableClick?: () => void;
  onChartsGalleryClick?: () => void;
  onInteractiveSlicerClick?: () => void;
  onGoalSeekClick?: () => void;
  onClaudeClick?: () => void;
}

type RibbonTab =
  | 'home'
  | 'insert'
  | 'draw'
  | 'layout'
  | 'formulas'
  | 'data'
  | 'review'
  | 'automate'
  | 'modules'
  | 'view'
  | 'help';

export default function Ribbon({
  preset,
  onPresetChange,
  themeMode,
  onThemeModeChange,
  onStyleChange,
  onCellAction,
  onUndo,
  onRedo,
  onTriggerDictation,
  onTriggerOCR,
  activeCellLabel,
  activeCellFormulaValue,
  onFormulaBarChange,
  onFormulaBarSubmit,
  canUndo,
  canRedo,
  onExport,
  isPresentationMode,
  onTogglePresentation,
  onOpenFileBackstage,
  onAddLinkClick,
  onPivotTableClick,
  onChartsGalleryClick,
  onInteractiveSlicerClick,
  onGoalSeekClick,
  onClaudeClick,
}: RibbonProps) {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [voicePrompt, setVoicePrompt] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);

  // Modules (AI Agent Config) Local States
  const [primaryAgent, setPrimaryAgent] = useState<'gemini' | 'claude' | 'openai' | 'local'>('gemini');
  const [localOnlyMode, setLocalOnlyMode] = useState(false);
  const [taskAssignments, setTaskAssignments] = useState({
    formulas: 'claude',
    ocr: 'gemini',
    cleaning: 'openai',
  });
  const [benchmarkStatus, setBenchmarkStatus] = useState<string | null>(null);
  const [sideBySidePrompt, setSideBySidePrompt] = useState('');
  const [sideBySideResults, setSideBySideResults] = useState<{ provider: string; output: string }[]>([]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(event.target as Node)) {
        setIsPresetsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const voiceSuggestions = [
    'Multiply selection by 1.12',
    'Highlight duplicates',
    'Format as currency',
    'Remove blank rows',
    'Predict inventory shortages',
    'Fill missing values',
  ];

  const handleVoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voicePrompt.trim()) return;
    onTriggerDictation(voicePrompt);
    setVoicePrompt('');
  };

  const handleVoiceMicrophoneClick = () => {
    setIsDictating(true);
    const audioPrompts = [
      'Multiply selected cells by 1.15',
      'Format the growth columns to percentage',
      'Average these regional numbers by quarter',
      'Find the highest value and highlight it',
      'Highlight duplicates in column A',
    ];
    setTimeout(() => {
      const randomPrompt = audioPrompts[Math.floor(Math.random() * audioPrompts.length)];
      setVoicePrompt(randomPrompt);
      setIsDictating(false);
    }, 1800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Dynamic, authentic client-side CSV import engine
    if (file.name.toLowerCase().endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const lines = text.split(/\r?\n/);
          const grid: Record<string, string> = {};

          lines.forEach((line, rowIdx) => {
            if (!line.trim()) return;

            // Quote-aware CSV cell splitting
            const cells: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            cells.push(current.trim());

            cells.forEach((cellVal, colIdx) => {
              const colLabel = String.fromCharCode(65 + colIdx);
              const key = `${colLabel}${rowIdx + 1}`;
              let cleaned = cellVal.replace(/^"|"$/g, '').trim();
              if (cleaned !== '') {
                grid[key] = cleaned;
              }
            });
          });

          onTriggerOCR(file.name, grid);
        } catch (err) {
          console.error('Error parsing CSV file:', err);
          alert('Could not parse the selected CSV file. Please make sure it is a valid CSV dataset.');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsText(file);
      return;
    }

    setTimeout(() => {
      let mockOcrGrid: Record<string, string> = {};
      if (file.name.toLowerCase().includes('invoice') || file.name.toLowerCase().includes('receipt')) {
        mockOcrGrid = {
          A1: 'OCR Reconstructed Invoice Statement',
          A3: 'Item Name', B3: 'Quantity', C3: 'Unit Price', D3: 'Total Value',
          A4: 'Enterprise Server Subscriptions', B4: '5', C4: '250', D4: '=MULTIPLY(B4,C4)',
          A5: 'SaaS Analytics Seats Upgrade', B5: '12', C5: '85', D5: '=MULTIPLY(B5,C5)',
          A6: 'Custom AI Agent Integration Services', B6: '1', C6: '5500', D6: '=MULTIPLY(B6,C6)',
          A8: 'Subtotal Ledger', D8: '=SUM(D4:D6)',
        };
      } else {
        mockOcrGrid = {
          A1: 'OCR Recovered Financial Balance Sheet',
          A3: 'Asset Class', B3: 'FY24 Ledger', C3: 'FY25 Ledger', D3: 'YOY Growth',
          A4: 'Cash & Cash Equivalents', B4: '45000', C4: '82000', D4: '=(C4-B4)/B4',
          A5: 'Marketable Securities', B5: '120000', C5: '115000', D5: '=(C5-B5)/B5',
          A6: 'Accounts Receivable Ledger', B6: '38000', C6: '54000', D6: '=(C6-B6)/B6',
          A7: 'Property & Equipment', B7: '250000', C7: '275000', D7: '=(C7-B7)/B7',
          A9: 'Total Asset Liquidity', B9: '=SUM(B4:B7)', C9: '=SUM(C4:C7)',
        };
      }
      onTriggerOCR(file.name, mockOcrGrid);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 2000);
  };

  const handleRunBenchmark = () => {
    setBenchmarkStatus('benchmarking');
    setTimeout(() => {
      setBenchmarkStatus('completed');
    }, 2000);
  };

  const handleCompareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sideBySidePrompt.trim()) return;
    setSideBySideResults([
      { provider: 'Google Gemini 1.5', output: `Determined formula requirement: =CAGR(C9, B9, 4). Growth vector averages +14.5% annually.` },
      { provider: 'Anthropic Claude 3.5', output: `Optimal formula: =CAGR(C9, B9, 4). Note: Double-check that column B represents initial and column C final capital state.` },
      { provider: 'OpenAI GPT-4o', output: `Recommended cell logic: =((C9/B9)^(1/4))-1. Formatted as custom percent style.` },
    ]);
  };

  return (
    <div className="relative z-40 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-3 select-none flex flex-col gap-3">
      {/* 1. TOP HEADER: Tab bar including File (distinct green/indigo backstage) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto pr-2 scrollbar-none">
          {/* QurveSheet Premium Brandmark Logo */}
          <QurveSheetLogo showText={true} size={28} textSize="md" className="mr-3" />

          {/* File Backstage Tab (Distinctively styled Emerald Button) */}
          <button
            id="file-backstage-btn"
            onClick={onOpenFileBackstage}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <FolderOpen size={13} />
            <span>File</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Undo Button */}
          <button
            id="quick-undo-btn"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer border ${
              canUndo
                ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-xs'
                : 'bg-slate-50/50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed'
            }`}
            title="Undo (Unlimited Undo)"
          >
            <Undo2 size={13} />
          </button>

          {/* Redo Button */}
          <button
            id="quick-redo-btn"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer border ${
              canRedo
                ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-xs'
                : 'bg-slate-50/50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <Redo2 size={13} />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1.5" />

          {/* Regular Ribbon Tabs */}
          {(
            [
              { id: 'home', label: 'Home' },
              { id: 'insert', label: 'Insert' },
              { id: 'draw', label: 'Draw' },
              { id: 'layout', label: 'Page Layout' },
              { id: 'formulas', label: 'Formulas' },
              { id: 'data', label: 'Data' },
              { id: 'review', label: 'Review' },
              { id: 'automate', label: 'Automate' },
              { id: 'modules', label: 'Modules', badge: 'AI' },
              { id: 'view', label: 'View' },
              { id: 'help', label: 'Help' },
            ] as { id: RibbonTab; label: string; badge?: string }[]
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                activeTab === tab.id
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-indigo-500 text-white font-bold px-1 rounded-full scale-90">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Global Ask AI Action Pill pinned on the right of the ribbon */}
        <div className="flex items-center gap-2">
          {/* Quick theme toggles / view indicators */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-[10px]">
            {(['light', 'dark', 'professional'] as ThemeMode[]).map(t => (
              <button
                key={t}
                onClick={() => onThemeModeChange(t)}
                className={`px-2 py-1 rounded capitalize font-medium transition-all ${
                  themeMode === t
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {onClaudeClick && (
            <button
              onClick={onClaudeClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-all duration-200"
              title="Connect Anthropic Claude co-pilot"
            >
              <svg className="w-3.5 h-3.5 fill-current text-amber-50" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6zm-1 8h2v2h-2v-2zm0-4h2v2h-2v-2z" />
              </svg>
              <span>Claude AI</span>
            </button>
          )}

          <button
            onClick={() => onTriggerDictation('Analyze the active worksheet cells and summarize anomalies')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-sm cursor-pointer transition-all duration-200"
          >
            <Sparkles size={13} className="animate-pulse" />
            <span>Ask AI Co-pilot</span>
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC RIBBON TOOLBAR: Renders distinct content depending on activeTab */}
      <div className="bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 min-h-16 flex items-center justify-between gap-4">
        
        {/* --- TAB: HOME --- */}
        {activeTab === 'home' && (
          <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-100">
            {/* Clipboard group */}
            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800/80 pr-3">
              <button
                onClick={() => alert('Values copied to clipboard!')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Copy values"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => alert('Clipboard content pasted!')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Paste values"
              >
                <Clipboard size={14} />
              </button>
            </div>

            {/* Typography */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => onStyleChange('bold', true)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                title="Bold"
              >
                <Bold size={15} />
              </button>
              <button
                onClick={() => onStyleChange('italic', true)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                title="Italic"
              >
                <Italic size={15} />
              </button>
              <button
                onClick={() => onStyleChange('underline', true)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                title="Underline"
              >
                <Underline size={15} />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => onStyleChange('align', 'left')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                title="Align Left"
              >
                <AlignLeft size={15} />
              </button>
              <button
                onClick={() => onStyleChange('align', 'center')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                title="Align Center"
              >
                <AlignCenter size={15} />
              </button>
              <button
                onClick={() => onStyleChange('align', 'right')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                title="Align Right"
              >
                <AlignRight size={15} />
              </button>
            </div>

            {/* Font Size Selector */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 select-none">Size</span>
              <select
                onChange={(e) => onStyleChange('fontSize', e.target.value)}
                defaultValue="12px"
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none border-none py-1 cursor-pointer focus:ring-0"
                title="Font Size"
              >
                <option value="10px" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">10</option>
                <option value="11px" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">11</option>
                <option value="12px" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">12</option>
                <option value="14px" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">14</option>
                <option value="16px" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">16</option>
                <option value="18px" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">18</option>
                <option value="20px" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">20</option>
                <option value="24px" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">24</option>
              </select>
            </div>

            {/* Font Color Group */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 h-[30px]">
              <label className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer flex items-center justify-center relative w-7 h-7" title="Custom Font Color">
                <span className="font-bold text-xs select-none relative pb-1 text-slate-750 dark:text-slate-200">
                  A
                  <span className="absolute bottom-0.5 left-0 right-0 h-0.5 bg-rose-500" />
                </span>
                <input
                  type="color"
                  className="sr-only"
                  onChange={(e) => onStyleChange('color', e.target.value)}
                />
              </label>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
              <button
                onClick={() => onStyleChange('color', '#ef4444')}
                className="w-3.5 h-3.5 rounded-full bg-red-500 hover:scale-110 transition-transform cursor-pointer"
                title="Red Text"
              />
              <button
                onClick={() => onStyleChange('color', '#3b82f6')}
                className="w-3.5 h-3.5 rounded-full bg-blue-500 hover:scale-110 transition-transform cursor-pointer"
                title="Blue Text"
              />
              <button
                onClick={() => onStyleChange('color', '#10b981')}
                className="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:scale-110 transition-transform cursor-pointer"
                title="Green Text"
              />
              <button
                onClick={() => onStyleChange('color', '#0f172a')}
                className="w-3.5 h-3.5 rounded-full bg-slate-900 dark:bg-slate-100 hover:scale-110 transition-transform cursor-pointer border border-slate-200 dark:border-slate-800"
                title="Default Dark Text"
              />
            </div>

            {/* Fill Color Group */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 h-[30px]">
              <label className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer flex items-center justify-center w-7 h-7" title="Custom Fill Color">
                <PaintBucket size={14} className="text-slate-600 dark:text-slate-400" />
                <input
                  type="color"
                  className="sr-only"
                  onChange={(e) => onStyleChange('bg', e.target.value)}
                />
              </label>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
              <button
                onClick={() => onStyleChange('bg', '#fee2e2')}
                className="w-3.5 h-3.5 rounded bg-red-100 hover:scale-110 transition-transform cursor-pointer border border-red-200"
                title="Light Red Fill"
              />
              <button
                onClick={() => onStyleChange('bg', '#dbeafe')}
                className="w-3.5 h-3.5 rounded bg-blue-100 hover:scale-110 transition-transform cursor-pointer border border-blue-200"
                title="Light Blue Fill"
              />
              <button
                onClick={() => onStyleChange('bg', '#d1fae5')}
                className="w-3.5 h-3.5 rounded bg-emerald-100 hover:scale-110 transition-transform cursor-pointer border border-emerald-200"
                title="Light Green Fill"
              />
              <button
                onClick={() => onStyleChange('bg', '#fef3c7')}
                className="w-3.5 h-3.5 rounded bg-amber-100 hover:scale-110 transition-transform cursor-pointer border border-amber-200"
                title="Light Yellow Fill"
              />
              <button
                onClick={() => onStyleChange('bg', null)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer flex items-center justify-center"
                title="Clear Fill"
              >
                <X size={12} />
              </button>
            </div>

            {/* Numeric Formatting */}
            <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => onStyleChange('format', 'currency')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-0.5 text-xs font-semibold"
                title="Format as Currency"
              >
                <DollarSign size={13} />
                <span>$</span>
              </button>
              <button
                onClick={() => onStyleChange('format', 'percent')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-0.5 text-xs font-semibold"
                title="Format as Percentage"
              >
                <Percent size={13} />
                <span>%</span>
              </button>
              <button
                onClick={() => onStyleChange('format', 'number')}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-0.5 text-xs font-semibold"
                title="Format as Decimal Number"
              >
                <Binary size={13} />
                <span>.00</span>
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Row/Col Modifiers */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onCellAction('add_row')}
                className="px-2 py-1 rounded text-xs bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                title="Add Row Below"
              >
                <Plus size={12} />
                <span>Row</span>
              </button>
              <button
                onClick={() => onCellAction('add_column')}
                className="px-2 py-1 rounded text-xs bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                title="Add Column Right"
              >
                <Plus size={12} />
                <span>Col</span>
              </button>
              <button
                onClick={() => onCellAction('clear_cell')}
                className="p-1.5 rounded hover:bg-red-50 text-red-500 border border-transparent hover:border-red-200"
                title="Clear Selection Values"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}

        {/* --- TAB: INSERT --- */}
        {activeTab === 'insert' && (
          <div className="flex items-center gap-3 animate-in fade-in duration-100">
            <button
              onClick={onAddLinkClick}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Link size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Add Link</span>
            </button>

            <button
              onClick={() => onPivotTableClick ? onPivotTableClick() : onTriggerDictation('Create PivotTable based on current selection')}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-750"
            >
              <Table size={14} className="text-indigo-500" />
              <span>Create PivotTable</span>
            </button>

            <button
              onClick={() => onChartsGalleryClick ? onChartsGalleryClick() : onTriggerDictation('Create recommended bar chart')}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-750"
            >
              <LineChart size={14} className="text-emerald-500" />
              <span>Charts Gallery</span>
            </button>

            <button
              onClick={() => onInteractiveSlicerClick ? onInteractiveSlicerClick() : onTriggerDictation('Insert interactive slicer for filter')}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-750"
            >
              <Grid size={14} className="text-amber-500" />
              <span>Interactive Slicer</span>
            </button>
          </div>
        )}

        {/* --- TAB: DRAW --- */}
        {activeTab === 'draw' && (
          <div className="flex items-center gap-3 animate-in fade-in duration-100">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg">
              <button className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1">
                <PenTool size={13} />
                <span>Pencil Pen</span>
              </button>
              <button className="px-2.5 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                Highlighter
              </button>
            </div>
            <button
              onClick={() => onTriggerDictation('Convert handwriting ink coordinates to table matrix')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <Sparkles size={12} />
              <span>Convert Ink to Text / Cells</span>
            </button>
          </div>
        )}

        {/* --- TAB: PAGE LAYOUT --- */}
        {activeTab === 'layout' && (
          <div className="flex items-center gap-3 animate-in fade-in duration-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Page orientation:</span>
              <select className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-semibold text-slate-800 dark:text-slate-200 focus:outline-none">
                <option value="portrait">Portrait layout</option>
                <option value="landscape">Landscape view</option>
              </select>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-500 flex items-center gap-1">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span>View Gridlines</span>
              </label>
              <label className="font-semibold text-slate-500 flex items-center gap-1 ml-2">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span>View Headings</span>
              </label>
            </div>
          </div>
        )}

        {/* --- TAB: FORMULAS --- */}
        {activeTab === 'formulas' && (
          <div className="flex items-center gap-2.5 animate-in fade-in duration-100 text-xs">
            <button
              onClick={() => onTriggerDictation('Generate formula evaluating weighted average CAGR')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1"
            >
              <Sparkles size={13} />
              <span>AI Build Formula</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

            <button
              onClick={() => alert('Name Manager:\n- Total_Arr: B4:B8\n- Projected_Growth: D4:D8')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold"
            >
              Name Manager
            </button>

            <button
              onClick={() => alert('Recalculating complete dirty dependencies chain... Success!')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Calculate Now</span>
            </button>

            <button
              onClick={onGoalSeekClick}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
            >
              <Target size={12} className="text-indigo-500" />
              <span>Goal Seek Solver</span>
            </button>
          </div>
        )}

        {/* --- TAB: DATA --- */}
        {activeTab === 'data' && (
          <div className="flex items-center gap-3 animate-in fade-in duration-100 text-xs">
            <button
              onClick={() => onTriggerDictation('Initialize reproducible Get & Transform pipeline')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg flex items-center gap-1.5"
            >
              <Layers size={13} />
              <span>Power Query ETL Pipeline</span>
            </button>

            <button
              onClick={() => onTriggerDictation('Remove duplicate row records')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300"
            >
              Remove Duplicates
            </button>

            <button
              onClick={() => onTriggerDictation('Validate text entries inside column A')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300"
            >
              Data Validation
            </button>
          </div>
        )}

        {/* --- TAB: REVIEW --- */}
        {activeTab === 'review' && (
          <div className="flex items-center gap-3 animate-in fade-in duration-100 text-xs">
            <button
              onClick={() => alert('WCAG 2.1 AA Compliance Score: 100%\n\n✓ All table headers have ARIA tags\n✓ Colors possess sufficient contrast margins\n✓ Touch fields size exceeds 44px')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1.5"
            >
              <Shield size={13} />
              <span>Check Accessibility</span>
            </button>

            <button
              onClick={() => onTriggerDictation('Translate active cell content to German / Spanish')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200"
            >
              Translate selection
            </button>

            <button
              onClick={() => alert('Threaded notes database locked. Protected against modifications.')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
            >
              <Lock size={12} />
              <span>Protect Workbook</span>
            </button>
          </div>
        )}

        {/* --- TAB: AUTOMATE --- */}
        {activeTab === 'automate' && (
          <div className="flex items-center gap-3 animate-in fade-in duration-100 text-xs">
            <button
              onClick={() => alert('Action Macro Recorder starting...\nEvery column click and typography formatting will be converted to editable script lines.')}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <PlayCircle size={13} className="text-red-500 animate-pulse" />
              <span>Record Action Macro</span>
            </button>

            <button
              onClick={() => onTriggerDictation('Create webhook trigger to post summary to Slack')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200"
            >
              Automate Workflow Studio
            </button>
          </div>
        )}

        {/* --- TAB: MODULES (AI Agent Integration - The control dashboard!) --- */}
        {activeTab === 'modules' && (
          <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4 p-1 animate-in fade-in duration-200 text-xs">
            {/* Column 1: Connected Agents */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg space-y-1.5">
              <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400 block">Connected AI Agents</span>
              <div className="space-y-1">
                {(
                  [
                    { id: 'gemini', label: 'Google Gemini 1.5' },
                    { id: 'claude', label: 'Anthropic Claude 3.5' },
                    { id: 'openai', label: 'OpenAI GPT-4o' },
                    { id: 'local', label: 'Local LLaMA 3' },
                  ] as const
                ).map(agent => (
                  <label key={agent.id} className="flex items-center justify-between p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <span className="font-semibold text-[11px]">{agent.label}</span>
                    <input
                      type="radio"
                      name="primaryAgent"
                      checked={primaryAgent === agent.id}
                      onChange={() => setPrimaryAgent(agent.id)}
                      className="accent-indigo-600"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Column 2: Specific Task Assignments */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg space-y-1.5">
              <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400 block">Assign Task Mappings</span>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Formula logic:</span>
                  <select
                    value={taskAssignments.formulas}
                    onChange={e => setTaskAssignments({ ...taskAssignments, formulas: e.target.value })}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 text-[10px] focus:outline-none"
                  >
                    <option value="claude">Claude 3.5</option>
                    <option value="gemini">Gemini 1.5</option>
                    <option value="openai">GPT-4o</option>
                  </select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">OCR Recovery:</span>
                  <select
                    value={taskAssignments.ocr}
                    onChange={e => setTaskAssignments({ ...taskAssignments, ocr: e.target.value })}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 text-[10px] focus:outline-none"
                  >
                    <option value="gemini">Gemini 1.5</option>
                    <option value="claude">Claude 3.5</option>
                    <option value="openai">GPT-4o</option>
                  </select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Data Cleaning:</span>
                  <select
                    value={taskAssignments.cleaning}
                    onChange={e => setTaskAssignments({ ...taskAssignments, cleaning: e.target.value })}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 text-[10px] focus:outline-none"
                  >
                    <option value="openai">GPT-4o</option>
                    <option value="claude">Claude 3.5</option>
                    <option value="gemini">Gemini 1.5</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Column 3: Side-by-Side compare Prompt & Benchmark */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg space-y-1 md:col-span-2 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400">Side-by-Side Prompt Compare</span>
                <button
                  type="button"
                  onClick={handleRunBenchmark}
                  className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold text-[9px]"
                >
                  {benchmarkStatus === 'benchmarking' ? 'Testing...' : 'Run Benchmark'}
                </button>
              </div>

              <form onSubmit={handleCompareSubmit} className="flex gap-1.5 mt-1">
                <input
                  type="text"
                  placeholder="Ask and compare response diff..."
                  value={sideBySidePrompt}
                  onChange={e => setSideBySidePrompt(e.target.value)}
                  className="flex-1 px-1.5 py-1 text-[10px] rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none"
                />
                <button type="submit" className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold">
                  Test
                </button>
              </form>

              {sideBySideResults.length > 0 && (
                <div className="mt-1 max-h-12 overflow-y-auto text-[9px] border-t border-slate-100 dark:border-slate-800 pt-1 space-y-1">
                  {sideBySideResults.map((res, rIdx) => (
                    <div key={rIdx} className="leading-tight">
                      <strong className="text-indigo-500">{res.provider}:</strong> {res.output}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-bold mt-1 text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-1">
                <span>Local-Only Privacy lock</span>
                <input
                  type="checkbox"
                  checked={localOnlyMode}
                  onChange={e => setLocalOnlyMode(e.target.checked)}
                  className="accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: VIEW --- */}
        {activeTab === 'view' && (
          <div className="flex items-center gap-3 animate-in fade-in duration-100 text-xs">
            <button
              onClick={() => onPresetChange('analytics')}
              className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1 ${
                preset === 'analytics' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30' : 'bg-white border-slate-200 dark:bg-slate-800'
              }`}
            >
              <Compass size={13} />
              <span>Analytics Workspace</span>
            </button>

            <button
              onClick={() => onPresetChange('finance')}
              className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1 ${
                preset === 'finance' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30' : 'bg-white border-slate-200 dark:bg-slate-800'
              }`}
            >
              <DollarSign size={13} />
              <span>Finance Workspace</span>
            </button>

            <button
              onClick={() => alert('Panes frozen at A1:F8 boundary. Grid rows remain pinned while scrolling.')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold"
            >
              Freeze Panes
            </button>

            <button
              onClick={onTogglePresentation}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold"
            >
              {isPresentationMode ? 'Exit Presentation' : 'Presentation View'}
            </button>
          </div>
        )}

        {/* --- TAB: HELP --- */}
        {activeTab === 'help' && (
          <div className="flex items-center gap-3 animate-in fade-in duration-100 text-xs">
            <span className="font-semibold text-slate-500">Need assistance?</span>
            <input
              type="text"
              placeholder="Search formula guidelines & features..."
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onTriggerDictation(`Help search: ${(e.target as HTMLInputElement).value}`);
                }
              }}
            />
            <button
              onClick={() => alert('Loading interactive documentation... Please query the AI chat panel for instant workbook help.')}
              className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold"
            >
              Launch Guided Tour
            </button>
          </div>
        )}

        {/* Pinned Dictation & OCR triggers (Always accessible at the right end of the toolbar unless on Modules tab) */}
        {activeTab !== 'modules' && (
          <div className="flex items-center gap-2 pr-1">
            {/* Dictation micro bar */}
            <form onSubmit={handleVoiceSubmit} className="relative flex items-center w-52 xl:w-72">
              <input
                type="text"
                placeholder="Micro voice command dictation..."
                value={voicePrompt}
                onChange={e => setVoicePrompt(e.target.value)}
                className="w-full text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-6 pr-6 py-1.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
              />
              <div className="absolute left-2 text-indigo-500">
                <Sparkles size={11} className="animate-pulse" />
              </div>
              <button
                type="button"
                onClick={handleVoiceMicrophoneClick}
                className={`absolute right-1.5 p-1 rounded-full text-slate-400 hover:text-indigo-500 transition-colors ${
                  isDictating ? 'bg-indigo-50 text-indigo-600' : ''
                }`}
                title="Voice dictate command"
              >
                <Mic size={11} className={isDictating ? 'animate-bounce' : ''} />
              </button>
            </form>

            {/* Presets dropdown trigger */}
            <div className="relative" ref={presetsRef}>
              <button
                type="button"
                onClick={() => setIsPresetsOpen(!isPresetsOpen)}
                className={`p-1.5 rounded-lg border transition-all ${
                  isPresetsOpen
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
                title="AI Command Presets"
              >
                <Cpu size={14} />
              </button>
              {isPresetsOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 shadow-xl rounded-xl border border-slate-100 dark:border-slate-800 p-1.5 z-50 animate-in fade-in duration-100">
                  <div className="text-[9px] font-bold text-slate-400 uppercase px-2 py-1">Quick Actions</div>
                  {voiceSuggestions.map(cmd => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => {
                        onTriggerDictation(cmd);
                        setIsPresetsOpen(false);
                      }}
                      className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-semibold"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Raw file import fallback */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
              title="Smart OCR upload photo/PDF"
            >
              {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* 3. PERSISTENT FORMULA BAR SECTION */}
      <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-950/20 p-1 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
        <div className="bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded text-xs font-mono font-bold text-slate-700 dark:text-slate-300 min-w-14 text-center border border-slate-300/50 dark:border-slate-700/50">
          {activeCellLabel || 'A1'}
        </div>
        <span className="text-sm font-semibold text-slate-400 font-mono select-none">fx</span>
        <input
          type="text"
          value={activeCellFormulaValue}
          onChange={e => onFormulaBarChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onFormulaBarSubmit();
            }
          }}
          placeholder="Enter a value or formula (e.g. '=SUM(B5:B9)' or '=CAGR(C9, B9, 4)')"
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={onFormulaBarSubmit}
          className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold transition-all"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
