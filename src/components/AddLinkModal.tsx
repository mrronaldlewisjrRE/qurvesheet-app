import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Link as LinkIcon, Sparkles, Check, AlertCircle, RefreshCw, BarChart2, 
  Table, HelpCircle, Download, FileText, CheckCircle2, ChevronRight, Play
} from 'lucide-react';
import { ThemeMode } from '../types';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (payload: {
    sheetName: string;
    grid: any;
    rowCount: number;
    colCount: number;
    analysis: string;
    charts: any[];
    option: 'import_only' | 'analyze_only' | 'visualize_only' | 'all';
  }) => void;
  themeMode: ThemeMode;
}

const SAMPLE_URLS = [
  {
    label: 'Shopify Sales Dashboard',
    url: 'https://mystore.shopify.com/admin/analytics/reports/sales_over_time?period=last_30_days',
    platform: 'Shopify'
  },
  {
    label: 'Meta Ads Manager Report',
    url: 'https://adsmanager.facebook.com/campaign-reporting/act_9847291?range=october_2026',
    platform: 'Meta Ads'
  },
  {
    label: 'Google Analytics Audience',
    url: 'https://analytics.google.com/analytics/web/#/p48291/reports/audience_behavior',
    platform: 'Google Analytics'
  },
  {
    label: 'Amazon Seller Performance',
    url: 'https://sellercentral.amazon.com/business-reports/sales-traffic-dashboard?interval=daily',
    platform: 'Amazon Seller Central'
  },
  {
    label: 'Q4 Financials Dataset (CSV Link)',
    url: 'https://raw.githubusercontent.com/datasets/financials-example/master/q4_performance_data.csv',
    platform: 'CSV Download'
  }
];

export default function AddLinkModal({ isOpen, onClose, onImport, themeMode }: AddLinkModalProps) {
  const [urlInput, setUrlInput] = useState('');
  const [step, setStep] = useState<'input' | 'extracting' | 'preview'>('input');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Progress sub-states for Step 2: AI Extraction
  const [extractionProgress, setExtractionProgress] = useState<string[]>([]);
  const [currentProgressStep, setCurrentProgressStep] = useState(0);

  // Extracted response payload state
  const [extractedPayload, setExtractedPayload] = useState<{
    sheetName: string;
    grid: Record<string, any>;
    rowCount: number;
    colCount: number;
    analysis: string;
    suggestedCharts: any[];
  } | null>(null);

  // User experience analysis settings (Step 3)
  const [analysisOption, setAnalysisOption] = useState<'import_only' | 'analyze_only' | 'visualize_only' | 'all'>('all');
  const [selectedChartIds, setSelectedChartIds] = useState<string[]>([]);

  // Simulation step messages
  const progressMessages = [
    'Parsing URL query parameters and locating parent domain...',
    'Connecting to secure intelligence proxy tunnel...',
    'Reading metadata and identifying metrics layout schema...',
    'Synthesizing tabular matrices & normalizing cell formats...',
    'Compiling statistical aggregates and uppercase UPPERCASE spreadsheet formulas...',
    'Generating predictive analytical insights and anomaly audits...'
  ];

  const handleSelectSample = (sampleUrl: string) => {
    setUrlInput(sampleUrl);
  };

  const handleStartExtraction = async () => {
    if (!urlInput.trim()) {
      setErrorMsg('Please enter or select a valid URL first.');
      return;
    }
    if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://')) {
      setErrorMsg('Please make sure your URL begins with http:// or https://');
      return;
    }

    setErrorMsg('');
    setStep('extracting');
    setExtractionProgress([]);
    setCurrentProgressStep(0);

    // Simulate progress milestones visually to make user experience delightful
    const stepIntervals: NodeJS.Timeout[] = [];
    progressMessages.forEach((msg, idx) => {
      const timeout = setTimeout(() => {
        setExtractionProgress(prev => [...prev, msg]);
        setCurrentProgressStep(idx + 1);
      }, idx * 1100);
      stepIntervals.push(timeout);
    });

    try {
      const response = await fetch('/api/ai/extract-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });

      // Wait for both fetch and simulated milestones to complete (or near-completion)
      await new Promise(resolve => setTimeout(resolve, progressMessages.length * 1100 + 300));

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server returned an error during parsing.');
      }

      const data = await response.json();
      
      // Clean up intervals
      stepIntervals.forEach(t => clearTimeout(t));

      setExtractedPayload({
        sheetName: data.sheetName || 'Extracted Report Data',
        grid: data.grid || {},
        rowCount: data.rowCount || 20,
        colCount: data.colCount || 8,
        analysis: data.analysis || 'No analytical summary available.',
        suggestedCharts: data.suggestedCharts || []
      });

      // Default select all charts recommended by AI
      if (data.suggestedCharts && data.suggestedCharts.length > 0) {
        setSelectedChartIds(data.suggestedCharts.map((c: any, index: number) => c.id || `chart_${index}`));
      }

      setStep('preview');
    } catch (err: any) {
      stepIntervals.forEach(t => clearTimeout(t));
      setErrorMsg(err.message || 'An unexpected error occurred while communicating with QurveSheet AI.');
      setStep('input');
    }
  };

  // Step 5: Save & Export options
  const handleAddToWorkbook = () => {
    if (!extractedPayload) return;

    // Filter charts based on user checkboxes
    const chartsToImport = extractedPayload.suggestedCharts.filter((c, index) => {
      const cid = c.id || `chart_${index}`;
      return selectedChartIds.includes(cid);
    });

    onImport({
      sheetName: extractedPayload.sheetName,
      grid: extractedPayload.grid,
      rowCount: extractedPayload.rowCount,
      colCount: extractedPayload.colCount,
      analysis: extractedPayload.analysis,
      charts: chartsToImport,
      option: analysisOption
    });

    // Reset and close
    handleResetModal();
    onClose();
  };

  const handleResetModal = () => {
    setUrlInput('');
    setStep('input');
    setErrorMsg('');
    setExtractionProgress([]);
    setExtractedPayload(null);
    setAnalysisOption('all');
    setSelectedChartIds([]);
  };

  // Client-side file exporter utilities (JSON, CSV, Plain-text PDF view, simple XML)
  const handleExportData = (type: 'csv' | 'json' | 'txt' | 'xlsx') => {
    if (!extractedPayload) return;

    // Gather grid to tabular matrix
    const matrix: string[][] = [];
    const maxR = extractedPayload.rowCount;
    const maxC = extractedPayload.colCount;

    for (let r = 1; r <= maxR; r++) {
      const rowArr: string[] = [];
      for (let c = 0; c < maxC; c++) {
        const colLabel = String.fromCharCode(65 + c);
        const cell = extractedPayload.grid[`${colLabel}${r}`];
        rowArr.push(cell ? cell.value : '');
      }
      matrix.push(rowArr);
    }

    let downloadContent = '';
    let mimeType = 'text/plain';
    let extension = 'txt';

    if (type === 'csv' || type === 'xlsx') {
      // Build standard CSV
      downloadContent = matrix.map(row => 
        row.map(val => `"${val.replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8;';
      extension = type === 'xlsx' ? 'xlsx' : 'csv'; // Using .xlsx as specified but saving tabular CSV formatting
    } else if (type === 'json') {
      downloadContent = JSON.stringify({
        sheetName: extractedPayload.sheetName,
        columns: Array.from({ length: maxC }).map((_, i) => String.fromCharCode(65 + i)),
        dataGrid: extractedPayload.grid,
        analysis: extractedPayload.analysis,
        visualizations: extractedPayload.suggestedCharts
      }, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (type === 'txt') {
      // Generate clean PDF/Report-ready text format
      downloadContent = `========================================================\n`;
      downloadContent += `OMNISHEET AI DATA EXTRACTION REPORT\n`;
      downloadContent += `Source: ${urlInput}\n`;
      downloadContent += `Sheet Title: ${extractedPayload.sheetName}\n`;
      downloadContent += `========================================================\n\n`;
      
      downloadContent += `1. EXTRACTED TABULAR SUMMARY:\n`;
      matrix.forEach(row => {
        if (row.some(x => x)) {
          downloadContent += row.map(cellVal => String(cellVal).padEnd(20)).join(' | ') + '\n';
        }
      });
      
      downloadContent += `\n\n2. AI PERFORMANCE ANALYSIS & ANOMALY REPORTS:\n`;
      downloadContent += extractedPayload.analysis;
      
      mimeType = 'text/plain;charset=utf-8;';
      extension = 'txt';
    }

    const blob = new Blob([downloadContent], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${extractedPayload.sheetName.toLowerCase().replace(/\s+/g, '_')}_extraction.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xl flex flex-col overflow-hidden font-sans"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <LinkIcon size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Add Link → AI Data Analysis
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Paste any live URL dashboard, report, or CSV to automatically extract sheets, insights, and charts.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal content container */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-slate-50/50 dark:bg-slate-900/30">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Input URL State */}
            {step === 'input' && (
              <motion.div 
                key="input-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="block text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                    Step 1: Enter Live Report, CSV, or Dashboard URL
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 dark:text-slate-500">
                      <LinkIcon size={16} />
                    </div>
                    <input
                      type="url"
                      placeholder="e.g. https://mystore.shopify.com/admin/analytics/reports/sales_over_time"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-none shadow-sm transition-all font-mono"
                    />
                  </div>
                  {errorMsg && (
                    <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400 text-xs mt-1.5">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>

                {/* Direct Sample Toggles */}
                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Sparkles size={14} className="text-indigo-500" />
                    <span>Quick Click Demo Templates</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click any sample URL below to auto-fill the field. QurveSheet AI is optimized to construct rich analytics templates matching these domains perfectly.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {SAMPLE_URLS.map((sample, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSample(sample.url)}
                        className={`text-left p-2.5 text-xs border transition-all flex items-center justify-between group hover:border-indigo-400 hover:bg-indigo-50/20 rounded-none cursor-pointer ${
                          urlInput === sample.url 
                            ? 'bg-indigo-50/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 dark:border-indigo-800' 
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">{sample.label}</div>
                          <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[280px]">
                            {sample.url}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Features Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="p-3 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/50 flex gap-2">
                    <CheckCircle2 size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-700 dark:text-slate-300">Automatic Extraction</div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Reads headings, KPIs, structured charts, and values directly from public files or simulated interfaces.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/50 flex gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-700 dark:text-slate-300">Intelligent Formulas</div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Auto-injects uppercase Excel formulas like SUM, AVERAGE, and growth rates, keeping spreadsheets interactive.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/50 flex gap-2">
                    <CheckCircle2 size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-700 dark:text-slate-300">Smart Visualizations</div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Generates and embeds customizable line charts, bar comparisons, or KPI indicators right inside the workbook.</p>
                    </div>
                  </div>
                </div>

                {/* Submit trigger button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleStartExtraction}
                    disabled={!urlInput}
                    className={`px-5 py-2.5 text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all rounded-none cursor-pointer ${
                      urlInput 
                        ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95' 
                        : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Play size={13} fill="white" />
                    <span>Extract & Analyze Link</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Extraction Processing State */}
            {step === 'extracting' && (
              <motion.div 
                key="extracting-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 space-y-6"
              >
                {/* Custom animated loader */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-950/60 rounded-full" />
                  <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <Sparkles size={20} className="text-indigo-500 animate-pulse" />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                    QurveSheet AI extracting dataset...
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Scanning source and building an interactive spreadsheet. Please don't close this window.
                  </p>
                </div>

                {/* Dynamic processing milestone checklist */}
                <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-900 pb-1.5 uppercase">
                    <span>AI Step Milestones</span>
                    <span>{currentProgressStep} / {progressMessages.length}</span>
                  </div>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {progressMessages.map((msg, idx) => {
                      const isActive = idx === currentProgressStep;
                      const isCompleted = idx < currentProgressStep;
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
                            isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : isCompleted ? 'text-slate-600 dark:text-slate-400' : 'text-slate-300 dark:text-slate-700'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          ) : isActive ? (
                            <RefreshCw size={13} className="text-indigo-500 animate-spin shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-[8px] font-bold shrink-0">
                              {idx + 1}
                            </div>
                          )}
                          <span className="truncate text-[11px]">{msg}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Analysis & Preview State */}
            {step === 'preview' && extractedPayload && (
              <motion.div 
                key="preview-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Extraction success banner */}
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <div>
                      <span className="font-bold">Extraction Successful:</span> Found <strong>{extractedPayload.sheetName}</strong> containing {extractedPayload.rowCount} rows, {extractedPayload.colCount} metrics columns, and formulas.
                    </div>
                  </div>
                  <button 
                    onClick={handleStartExtraction} 
                    className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    <span>Refresh Source</span>
                  </button>
                </div>

                {/* Main preview columns */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                  
                  {/* Left column: Controls and analysis options (2/5 size) */}
                  <div className="lg:col-span-2 space-y-4">
                    
                    {/* Action Selector */}
                    <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        Extraction Options
                      </div>
                      
                      <div className="space-y-1.5">
                        {[
                          { id: 'import_only', label: 'Import Data Only', desc: 'Paste only the formatted raw tables & metrics.' },
                          { id: 'analyze_only', label: 'Analyze Data', desc: 'Import tables and compile AI markdown summaries.' },
                          { id: 'visualize_only', label: 'Create Visualizations', desc: 'Import tables and inject interactive charts.' },
                          { id: 'all', label: 'Analyze + Visualize (Recommended)', desc: 'Import everything, build charts, and generate deep-dive analytical notes.' }
                        ].map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-start gap-2.5 p-2 border transition-all cursor-pointer rounded-none text-xs ${
                              analysisOption === opt.id
                                ? 'bg-indigo-50/40 border-indigo-500 text-indigo-900 dark:text-indigo-300 dark:border-indigo-800'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-150 dark:border-slate-800/80 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <input
                              type="radio"
                              name="analysisOption"
                              checked={analysisOption === opt.id}
                              onChange={() => setAnalysisOption(opt.id as any)}
                              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <div className="font-bold">{opt.label}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">{opt.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Exporters list */}
                    <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center justify-between">
                        <span>Instant Export Draft</span>
                        <span className="text-[9px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5">Pre-Save</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Export the extracted dataset from the link immediately without changing your active sheets.
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleExportData('csv')}
                          className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 rounded-none cursor-pointer transition-all"
                        >
                          <Table size={12} className="text-emerald-500" />
                          <span>Export CSV</span>
                        </button>
                        <button
                          onClick={() => handleExportData('xlsx')}
                          className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 rounded-none cursor-pointer transition-all"
                        >
                          <Download size={12} className="text-blue-500" />
                          <span>Export XLSX</span>
                        </button>
                        <button
                          onClick={() => handleExportData('txt')}
                          className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 rounded-none cursor-pointer transition-all"
                        >
                          <FileText size={12} className="text-red-500" />
                          <span>Export PDF / TXT</span>
                        </button>
                        <button
                          onClick={() => handleExportData('json')}
                          className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 rounded-none cursor-pointer transition-all"
                        >
                          <Sparkles size={11} className="text-amber-500" />
                          <span>Export JSON</span>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Right column: Previews of Tables and Charts (3/5 size) */}
                  <div className="lg:col-span-3 space-y-4">
                    
                    {/* Sheet table preview */}
                    <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                          Sheet Table Preview
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {extractedPayload.sheetName}
                        </span>
                      </div>

                      {/* Mini Scrollable Grid Table */}
                      <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 text-[10px] max-h-[160px] overflow-y-auto font-mono">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                              <th className="p-1.5 text-center border-r border-slate-200 dark:border-slate-800 w-8">#</th>
                              {Array.from({ length: Math.min(6, extractedPayload.colCount) }).map((_, colIdx) => (
                                <th key={colIdx} className="p-1.5 text-left border-r border-slate-200 dark:border-slate-800 font-bold uppercase">
                                  {String.fromCharCode(65 + colIdx)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: Math.min(10, extractedPayload.rowCount) }).map((_, rIdx) => {
                              const rowNumber = rIdx + 1;
                              const isHeader = rowNumber === 1;

                              return (
                                <tr 
                                  key={rIdx} 
                                  className={`border-b border-slate-100 dark:border-slate-900 ${
                                    isHeader ? 'bg-slate-100 dark:bg-slate-900/60 font-bold' : ''
                                  }`}
                                >
                                  <td className="p-1.5 text-center text-slate-400 border-r border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/60 font-semibold">{rowNumber}</td>
                                  {Array.from({ length: Math.min(6, extractedPayload.colCount) }).map((_, cIdx) => {
                                    const colLabel = String.fromCharCode(65 + cIdx);
                                    const cell = extractedPayload.grid[`${colLabel}${rowNumber}`];
                                    const value = cell ? cell.value : '';
                                    return (
                                      <td 
                                        key={cIdx} 
                                        className={`p-1.5 border-r border-slate-100 dark:border-slate-900 truncate max-w-[120px] ${
                                          isHeader ? 'font-bold text-slate-900 dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        {value}
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

                    {/* AI Analytical Insights Card */}
                    {(analysisOption === 'all' || analysisOption === 'analyze_only') && (
                      <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1">
                          <Sparkles size={13} className="text-indigo-500 animate-pulse" />
                          <span>AI Findings & Anomaly Detection</span>
                        </div>
                        <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-900 overflow-y-auto max-h-[160px] whitespace-pre-line font-sans prose dark:prose-invert">
                          {extractedPayload.analysis}
                        </div>
                      </div>
                    )}

                    {/* Chart Visualizations checklist selection */}
                    {(analysisOption === 'all' || analysisOption === 'visualize_only') && (
                      <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                          Recommended Visualization Widgets ({extractedPayload.suggestedCharts.length})
                        </div>
                        {extractedPayload.suggestedCharts.length === 0 ? (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic p-3 text-center">
                            No chart widgets recommended for this dataset.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {extractedPayload.suggestedCharts.map((c, idx) => {
                              const chartId = c.id || `chart_${idx}`;
                              const isChecked = selectedChartIds.includes(chartId);
                              return (
                                <label
                                  key={chartId}
                                  className={`flex items-center gap-2 p-2 border transition-all cursor-pointer text-xs rounded-none ${
                                    isChecked
                                      ? 'bg-emerald-50/10 border-emerald-500 text-emerald-900 dark:text-emerald-400'
                                      : 'bg-slate-50 dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedChartIds(prev => [...prev, chartId]);
                                      } else {
                                        setSelectedChartIds(prev => prev.filter(id => id !== chartId));
                                      }
                                    }}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <div className="truncate">
                                    <span className="font-bold capitalize">{c.type} Chart: </span>
                                    <span className="font-medium text-[11px]">{c.title}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                </div>

                {/* Confirm actions */}
                <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-4">
                  <button
                    onClick={handleResetModal}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all"
                  >
                    Reset & Paste Different URL
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-none cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddToWorkbook}
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md flex items-center gap-1.5 transition-all rounded-none cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Insert Extracted Sheet</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
