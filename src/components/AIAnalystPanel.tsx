import React, { useState, useEffect, useRef } from 'react';
import { Message, SheetData } from '../types';
import {
  MessageSquare,
  Sparkles,
  Send,
  HelpCircle,
  Play,
  Cpu,
  CornerDownLeft,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface AIAnalystPanelProps {
  sheet: SheetData;
  messages: Message[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  onApplySuggestedAction: (action: any) => void;
}

export default function AIAnalystPanel({
  sheet,
  messages,
  onSendMessage,
  isProcessing,
  onApplySuggestedAction,
}: AIAnalystPanelProps) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Context-aware smart prompt suggestions
  const getSuggestions = () => {
    if (sheet.id === 'analytics_sheet') {
      return [
        'Find regional sales outliers & anomalies.',
        'Forecast North America revenue next year.',
        'Which region has the maximum operating margin?',
        'Add a column for Q3 Forecast assuming 12% growth.',
      ];
    } else if (sheet.id === 'finance_sheet') {
      return [
        'Calculate compound annual growth rate (CAGR) for MRR.',
        'What is our average LTV to CAC ratio?',
        'How does contracted contract value change from Y1 to Y5?',
        'Explain the LTV to CAC formula.',
      ];
    } else if (sheet.id === 'operations_sheet') {
      return [
        'Which SKU has the highest stock risk level?',
        'Calculate average lead time for all RAM/GPU products.',
        'Recommend reorder point adjustments.',
        'Predict inventory shortages in next 30 days.',
      ];
    }
    return [
      'Summarize sheet metrics.',
      'Suggest a visualization chart.',
      'Find duplicates or typos.',
      'Explain the sheet structure.',
    ];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  // Scroll to bottom when messages list updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500 animate-pulse" />
            <span>AI Spreadsheet Analyst</span>
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Powered by Gemini • Realtime sheet context mapped automatically
          </p>
        </div>
        <div className="p-1 px-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/40 rounded-full border border-indigo-100 dark:border-indigo-900/50">
          Agent Active
        </div>
      </div>

      {/* Messages dialogue box */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <HelpCircle size={28} className="mx-auto text-indigo-300 dark:text-indigo-800 mb-2" />
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Ask any analytics question
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[240px] mx-auto mt-0.5">
              QurveSheet AI automatically inspects your formulas, values, and styles to supply immediate expert insights.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="text-[9px] text-slate-400 dark:text-slate-500 mb-0.5 px-1 font-mono">
              {msg.sender === 'user' ? 'Me' : 'QurveSheet AI'} • {msg.timestamp}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-sm font-sans leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-800'
              }`}
            >
              {/* Markdown simulation */}
              <div className="space-y-1.5 whitespace-pre-wrap">{msg.text}</div>

              {/* Suggested Action Widget */}
              {msg.suggestedAction && msg.suggestedAction.type && (
                <div className="mt-4 p-3 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950 rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <Cpu size={12} />
                    <span>SUGGESTED AUTOMATION ACTIVE</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    {msg.suggestedAction.type === 'apply_formula' && (
                      <span>Apply Excel formula <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-indigo-500">{msg.suggestedAction.payload.formula}</code> in cell <strong className="font-mono text-slate-700 dark:text-slate-300">{msg.suggestedAction.payload.cell}</strong></span>
                    )}
                    {msg.suggestedAction.type === 'update_cells' && (
                      <span>Modify multiple cells simultaneously with recommended repairs</span>
                    )}
                    {msg.suggestedAction.type === 'create_chart' && (
                      <span>Compile a new <strong className="capitalize">{msg.suggestedAction.payload.type} Chart</strong>: <strong>&quot;{msg.suggestedAction.payload.title}&quot;</strong></span>
                    )}
                  </div>
                  <button
                    onClick={() => onApplySuggestedAction(msg.suggestedAction)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all"
                  >
                    <Play size={10} />
                    <span>Execute Suggested Action</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex flex-col items-start">
            <div className="text-[9px] text-indigo-500 font-bold mb-0.5 px-1 font-mono animate-pulse">
              QurveSheet AI is thinking...
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 border border-indigo-100 dark:border-indigo-950 rounded-2xl rounded-bl-none p-3 max-w-[85%] flex items-center gap-3">
              <RefreshCw size={14} className="text-indigo-500 animate-spin" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Inspecting sheet matrices and calculating...
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Smart Suggested Prompts panel */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">
          <Lightbulb size={12} className="text-amber-500" />
          <span>Recommended for current workspace</span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
          {getSuggestions().map((s, index) => (
            <button
              key={index}
              onClick={() => onSendMessage(s)}
              className="text-[10px] text-left text-slate-600 dark:text-slate-300 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 rounded-lg p-1.5 px-2.5 transition-all truncate max-w-full font-medium"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI about this sheet or request a formula..."
          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || isProcessing}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
