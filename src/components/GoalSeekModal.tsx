import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Target, Cpu, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { SheetData } from '../types';
import { evaluateFormula } from '../utils/formula';

interface GoalSeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetData;
  onApplyResult: (cellKey: string, newValue: string) => void;
}

export default function GoalSeekModal({ isOpen, onClose, sheet, onApplyResult }: GoalSeekModalProps) {
  const [setCell, setSetCell] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [changingCell, setChangingCell] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [solveResult, setSolveResult] = useState<{
    success: boolean;
    val: number;
    originalVal: number;
    iterations: number;
    finalDiff: number;
    errorMsg?: string;
  } | null>(null);

  // Get lists of potential Set Cells (contain formula) and Changing Cells (numeric constants)
  const formulaCells: { key: string; formula: string; computed: string }[] = [];
  const numericCells: { key: string; value: string }[] = [];

  Object.entries(sheet.grid).forEach(([key, cell]) => {
    if (cell.value.startsWith('=')) {
      formulaCells.push({
        key,
        formula: cell.value,
        computed: cell.computed || '0'
      });
    } else if (!isNaN(parseFloat(cell.value))) {
      numericCells.push({
        key,
        value: cell.value
      });
    }
  });

  // Pre-fill fields on mount or when sheet changes
  useEffect(() => {
    if (formulaCells.length > 0 && !setCell) {
      setSetCell(formulaCells[0].key);
    }
    if (numericCells.length > 0 && !changingCell) {
      setChangingCell(numericCells[0].key);
    }
    setSolveResult(null);
  }, [sheet, isOpen]);

  const handleSolve = () => {
    if (!setCell || !changingCell || targetValue === '') {
      return;
    }

    setIsSolving(true);
    setSolveResult(null);

    // Run in a small timeout to let the UI spin
    setTimeout(() => {
      const targetNum = parseFloat(targetValue);
      if (isNaN(targetNum)) {
        setSolveResult({
          success: false,
          val: 0,
          originalVal: 0,
          iterations: 0,
          finalDiff: 0,
          errorMsg: 'Invalid target value. Please enter a valid number.'
        });
        setIsSolving(false);
        return;
      }

      const origVal = parseFloat(sheet.grid[changingCell]?.value || '0');

      // Secant Solver setup
      let x0 = origVal;
      if (isNaN(x0)) x0 = 1.0;

      // Evaluation helper: resolves all formulas on the cloned grid with a candidate value
      const evaluateWithCandidate = (candidateVal: number): number => {
        const tempGrid = { ...sheet.grid };
        tempGrid[changingCell] = {
          ...tempGrid[changingCell],
          value: candidateVal.toString()
        };

        const evaluatedGrid = { ...tempGrid };
        
        // Evaluate formulas iteratively (up to 3 times to resolve basic nested chains)
        for (let iter = 0; iter < 3; iter++) {
          Object.keys(tempGrid).forEach((key) => {
            const cell = tempGrid[key];
            if (cell.value && cell.value.startsWith('=')) {
              const computed = evaluateFormula(cell.value, evaluatedGrid);
              evaluatedGrid[key] = {
                ...cell,
                computed: computed
              };
            } else {
              evaluatedGrid[key] = {
                ...cell,
                computed: cell.value
              };
            }
          });
        }

        const targetCell = evaluatedGrid[setCell];
        if (!targetCell) return NaN;

        // Clean target cell computed string to a clean number
        const cleanStr = (targetCell.computed || targetCell.value)
          .replace(/[^0-9.-]/g, '');
        return parseFloat(cleanStr);
      };

      try {
        let y0 = evaluateWithCandidate(x0) - targetNum;
        
        if (Math.abs(y0) < 0.0001) {
          setSolveResult({
            success: true,
            val: x0,
            originalVal: origVal,
            iterations: 0,
            finalDiff: y0
          });
          setIsSolving(false);
          return;
        }

        // If derivative is undefined, step slightly
        let x1 = x0 !== 0 ? x0 * 1.05 : 1.0;
        let y1 = evaluateWithCandidate(x1) - targetNum;

        let iterations = 0;
        let finalX = x0;
        let converged = false;

        while (iterations < 60) {
          if (Math.abs(y1 - y0) < 1e-12) {
            // Add a small perturbation to avoid divide by zero
            x1 += 0.01;
            y1 = evaluateWithCandidate(x1) - targetNum;
          }

          const xNext = x1 - y1 * (x1 - x0) / (y1 - y0);
          
          // Safety boundary constraint checks: avoid infinite or NaN updates
          if (isNaN(xNext) || !isFinite(xNext)) {
            break;
          }

          const yNext = evaluateWithCandidate(xNext) - targetNum;

          if (Math.abs(yNext) < 0.001) {
            finalX = xNext;
            converged = true;
            iterations++;
            break;
          }

          x0 = x1;
          y0 = y1;
          x1 = xNext;
          y1 = yNext;
          finalX = xNext;
          iterations++;
        }

        const finalDiff = evaluateWithCandidate(finalX) - targetNum;
        if (converged || Math.abs(finalDiff) < 0.1) {
          setSolveResult({
            success: true,
            val: finalX,
            originalVal: origVal,
            iterations,
            finalDiff
          });
        } else {
          setSolveResult({
            success: false,
            val: finalX,
            originalVal: origVal,
            iterations,
            finalDiff,
            errorMsg: 'Goal Seek could not find a stable solution. The target might be mathematically unreachable with this variable.'
          });
        }
      } catch (err: any) {
        setSolveResult({
          success: false,
          val: 0,
          originalVal: origVal,
          iterations: 0,
          finalDiff: 0,
          errorMsg: `An error occurred during solving: ${err.message || err}`
        });
      }
      setIsSolving(false);
    }, 1000);
  };

  const handleApply = () => {
    if (solveResult && solveResult.success) {
      onApplyResult(changingCell, solveResult.val.toFixed(2));
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Goal Seek solver</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Reverse-calculate formula variables automatically
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4">
              {formulaCells.length === 0 ? (
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-3 text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold block">No Formulas Found</span>
                    To use Goal Seek, your spreadsheet must contain at least one cell with a valid formula (e.g., starts with `=`).
                  </div>
                </div>
              ) : (
                <>
                  {/* Form inputs */}
                  <div className="space-y-3.5">
                    {/* 1. Set Cell */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Set Cell (Contains Formula)
                      </label>
                      <select
                        value={setCell}
                        onChange={(e) => {
                          setSetCell(e.target.value);
                          setSolveResult(null);
                        }}
                        className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        {formulaCells.map((c) => (
                          <option key={c.key} value={c.key}>
                            Cell {c.key} ({c.formula}) — current: {c.computed}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Target Value */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        To Value (Desired Outcome)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 50000 or 0.15"
                        value={targetValue}
                        onChange={(e) => {
                          setTargetValue(e.target.value);
                          setSolveResult(null);
                        }}
                        className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* 3. Changing Cell */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        By Changing Cell (Variable Constant)
                      </label>
                      <select
                        value={changingCell}
                        onChange={(e) => {
                          setChangingCell(e.target.value);
                          setSolveResult(null);
                        }}
                        className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        {numericCells.map((c) => (
                          <option key={c.key} value={c.key}>
                            Cell {c.key} — current: {c.value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Solver Button */}
                  <button
                    onClick={handleSolve}
                    disabled={isSolving || targetValue === ''}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSolving ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Running Newton-Secant iterations...</span>
                      </>
                    ) : (
                      <>
                        <Cpu size={13} />
                        <span>Solve Goal Seek</span>
                      </>
                    )}
                  </button>

                  {/* Results Stage */}
                  {solveResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border ${
                        solveResult.success
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30'
                          : 'bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/30'
                      }`}
                    >
                      {solveResult.success ? (
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                            <Check size={14} />
                            <span>Target Solution Converged!</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 leading-normal">
                            To achieve the target outcome of <strong className="font-mono text-slate-700 dark:text-slate-300">{targetValue}</strong> in cell <strong className="font-mono text-slate-700 dark:text-slate-300">{setCell}</strong>, the input value of cell <strong className="font-mono text-slate-700 dark:text-slate-300">{changingCell}</strong> must be set to:
                          </p>
                          <div className="py-2.5 px-3 bg-white dark:bg-slate-950 rounded-lg border border-emerald-100 dark:border-emerald-950 text-center font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 shadow-inner">
                            {solveResult.val.toFixed(4)}
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 font-mono">
                            <span>Iterations: {solveResult.iterations}</span>
                            <span>Precision Error: {solveResult.finalDiff.toFixed(6)}</span>
                          </div>
                          <button
                            onClick={handleApply}
                            className="w-full mt-2 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                          >
                            Apply to Spreadsheet
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-xs text-red-600 dark:text-red-400">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertCircle size={14} />
                            <span>Solver Failed</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 leading-normal">
                            {solveResult.errorMsg}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
