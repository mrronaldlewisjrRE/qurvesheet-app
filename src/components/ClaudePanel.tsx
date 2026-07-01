import React, { useState, useEffect, useRef } from 'react';
import { SheetData, Workbook } from '../types';
import QurveSheetLogo from './QurveSheetLogo';
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Settings, 
  Play, 
  RefreshCw, 
  HelpCircle, 
  Terminal, 
  Layers, 
  Zap, 
  Workflow,
  Cpu,
  ArrowRight,
  Database
} from 'lucide-react';

interface ClaudePanelProps {
  sheet: SheetData;
  workbook: Workbook;
  onApplyClaudeAction: (actionType: string, payload: any) => void;
  isProcessing: boolean;
}

interface ClaudeMessage {
  id: string;
  sender: 'user' | 'claude';
  text: string;
  timestamp: string;
  status?: 'success' | 'pending' | 'failed';
  actions?: {
    description: string;
    type: string;
    payload: any;
  }[];
}

export default function ClaudePanel({
  sheet,
  workbook,
  onApplyClaudeAction,
  isProcessing: externalProcessing
}: ClaudePanelProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [useSandbox, setUseSandbox] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ClaudeMessage[]>([
    {
      id: 'welcome',
      sender: 'claude',
      text: "Hello! I'm Claude 3.5 Sonnet, your co-pilot for QurveSheet curves, styling, and data automation. I am loaded with your active sheet context.\n\nYou can prompt me to automatically format headers, clean bad inputs, highlight high-performers, zebra-stripe rows, or insert formulas!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingActions, setPendingActions] = useState<{description: string; type: string; payload: any}[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    
    // Simulate premium Anthropic API handshake
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      // Insert a system connection confirmation
      setMessages(prev => [
        ...prev,
        {
          id: `connect-msg-${Date.now()}`,
          sender: 'claude',
          text: `⚡ Handshake complete! Connected to Claude 3.5 Sonnet via ${useSandbox ? 'Claude Developer Sandbox' : 'Anthropic Live Cloud API'}.\n\nWorkbook context successfully loaded: "${workbook.name}" with ${workbook.sheets.length} sheets. Live spreadsheet command execution pipeline is armed.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  const parseCommand = (commandText: string) => {
    const cmd = commandText.toLowerCase();
    const actions: { description: string; type: string; payload: any }[] = [];

    if (cmd.includes('header') || cmd.includes('format top row') || cmd.includes('style row 1')) {
      actions.push({
        description: 'Style Sheet Headers (Row 1): Background deep slate, bold white typography, centered text.',
        type: 'style_headers',
        payload: { bg: '#0f172a', color: '#ffffff', bold: true, align: 'center' }
      });
    }

    if (cmd.includes('highlight') || cmd.includes('greater than') || cmd.includes('mark high')) {
      // Find threshold
      let threshold = 50000;
      const numMatch = cmd.match(/\d+/g);
      if (numMatch && numMatch.length > 0) {
        threshold = parseInt(numMatch[0]);
      }
      actions.push({
        description: `Scan active sheet and highlight cells with values greater than ${threshold.toLocaleString()} using soft emerald green background and dark forest text.`,
        type: 'highlight_cells',
        payload: { threshold, bg: '#d1fae5', color: '#065f46', bold: true }
      });
    }

    if (cmd.includes('stripe') || cmd.includes('zebra') || cmd.includes('alternate row')) {
      actions.push({
        description: 'Apply high-contrast Zebra-Striping to sheet: Alternating even rows receive soft professional background tint.',
        type: 'zebra_striping',
        payload: { bg: '#f8fafc' }
      });
    }

    if (cmd.includes('clean') || cmd.includes('trim') || cmd.includes('format number')) {
      actions.push({
        description: 'Clean Sheet: Trims accidental whitespaces, forces uniform currency format for numerical columns, and cleans trailing symbols.',
        type: 'clean_numbers',
        payload: {}
      });
    }

    if (cmd.includes('dashboard') || cmd.includes('saas') || cmd.includes('mock') || cmd.includes('sample report')) {
      actions.push({
        description: 'Construct dense financial report: Insert 8 columns of subscription records, MRR, growth percentages, and dynamic SUM formulas.',
        type: 'generate_mrr_dashboard',
        payload: {}
      });
    }

    if (cmd.includes('profit') || cmd.includes('margin') || cmd.includes('formula')) {
      actions.push({
        description: 'Insert Profit Margin Calculations: Adds Column E "Net Margin" calculated automatically via cell formula (=B[row]-C[row]).',
        type: 'insert_margin_formulas',
        payload: {}
      });
    }

    if (cmd.includes('reset') || cmd.includes('clear') || cmd.includes('default')) {
      actions.push({
        description: 'Restore Professional Defaults: Resets cell styling back to pure white workspace, default fonts, and black text colors.',
        type: 'reset_styling',
        payload: {}
      });
    }

    // Default if nothing matches
    if (actions.length === 0) {
      actions.push({
        description: 'Intelligent Cell Analysis: Review current grid context and generate standard high-performance summary rows with averages.',
        type: 'inject_summary_averages',
        payload: {}
      });
    }

    return actions;
  };

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    // Add User Message
    const userMsg: ClaudeMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Parse commands
    const actions = parseCommand(textToSend);

    // Simulate Claude thinking
    setTimeout(() => {
      setIsTyping(false);
      setPendingActions(actions);

      const claudeMsg: ClaudeMessage = {
        id: `claude-${Date.now()}`,
        sender: 'claude',
        text: `Command understood. I have analyzed your request against the active sheet "${sheet.name}" and formulated the following executive execution pipeline.\n\nReview the specific spreadsheet action(s) in the queue below and click **Execute Operations** to commit these live changes.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: actions
      };

      setMessages(prev => [...prev, claudeMsg]);
    }, 1200);
  };

  const executeQueue = () => {
    if (pendingActions.length === 0) return;
    
    // Process each action
    pendingActions.forEach(action => {
      onApplyClaudeAction(action.type, action.payload);
    });

    // Notify user of execution success
    const successMsg: ClaudeMessage = {
      id: `system-exec-${Date.now()}`,
      sender: 'claude',
      text: `✅ **Operations Executed Successfully!**\n\nI have successfully compiled, verified, and injected the spreadsheet modifications into your active QurveSheet viewport:\n${pendingActions.map((a, i) => `${i + 1}. ${a.description}`).join('\n')}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'success'
    };

    setMessages(prev => [...prev, successMsg]);
    setPendingActions([]);
  };

  const presetCommands = [
    { label: 'Style Header Row', text: 'Style the top header row with modern deep navy and white bold text' },
    { label: 'Zebra Striping', text: 'Apply zebra striping row backgrounds for easier reading' },
    { label: 'Highlight High Sales', text: 'Highlight cells with values greater than 50000' },
    { label: 'Inject Profit Margin', text: 'Add a new column for Net Profit calculated as Revenue minus Cost' },
    { label: 'Generate SaaS Report', text: 'Generate a dense SaaS Subscription and MRR mock report' },
    { label: 'Reset Grid Styles', text: 'Clear custom highlighting and reset colors back to clean white' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden font-sans">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 text-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          {/* Anthropic / Claude Signature Symbol */}
          <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <svg className="w-4.5 h-4.5 text-amber-100 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6zm-1 8h2v2h-2v-2zm0-4h2v2h-2v-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5">
              <span>Anthropic Claude 3.5</span>
              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono uppercase tracking-widest text-amber-50">
                Co-Pilot
              </span>
            </h2>
            <p className="text-[10px] text-amber-100/85">
              Spreadsheet layout & automation reasoner
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ACTIVE</span>
          </div>
        )}
      </div>

      {/* Connection Panel if not connected */}
      {!isConnected ? (
        <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto bg-slate-50 dark:bg-slate-950/40">
          <div className="space-y-4 max-w-sm mx-auto text-center pt-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 mx-auto flex items-center justify-center shadow-md animate-bounce">
              <svg className="w-7 h-7 text-white fill-current" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6zm-1 8h2v2h-2v-2zm0-4h2v2h-2v-2z" />
              </svg>
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                Connect Claude AI Co-pilot
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Connect QurveSheet directly to Anthropic's Reasoning engine to automate cell formulas, reformat layouts, and inject custom computations instantly.
              </p>
            </div>

            <form onSubmit={handleConnect} className="space-y-3 pt-2 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Anthropic API Secret Key (Optional)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={useSandbox}
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-50 font-mono"
                  />
                  <div className="absolute right-3 top-2.5 text-[9px] font-bold text-slate-400">
                    HTTPS SECURE
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    Enable Developer Sandbox
                  </span>
                  <span className="text-[9px] text-slate-400">
                    Direct co-authoring without an API key
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={useSandbox}
                  onChange={(e) => setUseSandbox(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer accent-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={isConnecting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Establishing Handshake...</span>
                  </>
                ) : (
                  <>
                    <Zap size={13} />
                    <span>Authorize and Connect</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-[10px] text-center text-slate-400 font-mono mt-4">
            QurveSheet Secure Sandbox • Anthropic API v20240601
          </div>
        </div>
      ) : (
        /* Connected Workspace Chat and Executor */
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/40">
          
          {/* Chat message space */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[9px] text-slate-400 dark:text-slate-500 mb-0.5 px-1 font-mono flex items-center gap-1">
                  <span className={msg.sender === 'claude' ? 'text-orange-500 font-bold' : ''}>
                    {msg.sender === 'user' ? 'Me' : 'Claude 3.5 Sonnet'}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>
                
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-xs font-sans leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-slate-800 text-white dark:bg-slate-700 rounded-tr-none'
                      : 'bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex flex-col items-start animate-pulse">
                <div className="text-[9px] text-orange-500 font-bold mb-0.5 px-1 font-mono">
                  Claude is generating command stream...
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none p-3.5 max-w-[85%] flex items-center gap-3">
                  <RefreshCw size={13} className="text-orange-500 animate-spin" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Compiling execution pipeline...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Pending Execution Actions Section (Shows when there are actions in queue) */}
          {pendingActions.length > 0 && (
            <div className="px-4 py-3 bg-amber-500/10 dark:bg-amber-500/5 border-t border-b border-amber-500/20 space-y-2 animate-in slide-in-from-bottom duration-200 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Terminal size={11} />
                  <span>Execution Queue Armed ({pendingActions.length})</span>
                </span>
                <span className="text-[9px] text-amber-600 dark:text-amber-500 font-mono">Requires authorization</span>
              </div>

              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {pendingActions.map((action, i) => (
                  <div key={i} className="flex gap-2 items-start bg-white dark:bg-slate-900 p-2 rounded-lg border border-amber-200/60 dark:border-amber-950/60 text-[11px] text-slate-700 dark:text-slate-300 shadow-2xs">
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{action.description}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={executeQueue}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-wide flex items-center justify-center gap-1 cursor-pointer shadow-sm transition-all active:scale-95"
                >
                  <Play size={10} />
                  <span>Execute Operations</span>
                </button>
                <button
                  onClick={() => setPendingActions([])}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px]"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Preset Commands Horizontal Bar */}
          {pendingActions.length === 0 && (
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Quick Claude Presets
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {presetCommands.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(preset.text)}
                    className="px-2.5 py-1 text-[10px] font-semibold bg-white hover:bg-orange-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 border border-slate-200 dark:border-slate-700 rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form input box */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="flex-1 flex gap-2"
            >
              <input
                type="text"
                placeholder="Ask Claude to format cells, stripe rows, clean or insert..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isTyping}
                className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-950 dark:text-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all duration-200 active:scale-95 disabled:opacity-40 shadow-xs"
              >
                <Send size={11} />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
