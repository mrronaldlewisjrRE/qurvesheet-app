import { GridData } from '../types';

// Helper: Convert column index (0, 1, 2) to Excel letter ("A", "B", "C")
export function colIndexToLabel(index: number): string {
  let label = '';
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
}

// Helper: Convert Excel letter ("A", "B", "C") to column index (0, 1, 2)
export function colLabelToIndex(label: string): number {
  let index = 0;
  for (let i = 0; i < label.length; i++) {
    index = index * 26 + (label.charCodeAt(i) - 64);
  }
  return index - 1;
}

// Parse cell reference (e.g., "A1" -> { row: 0, col: 0 })
export function parseCellRef(ref: string): { row: number; col: number } | null {
  const match = ref.toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  const colLabel = match[1];
  const rowLabel = match[2];
  return {
    row: parseInt(rowLabel, 10) - 1,
    col: colLabelToIndex(colLabel),
  };
}

// Get all cell keys in a range (e.g., "A1:B3" -> ["A1", "A2", "A3", "B1", "B2", "B3"])
export function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [rangeStr];
  const start = parseCellRef(parts[0]);
  const end = parseCellRef(parts[1]);
  if (!start || !end) return [];

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);

  const keys: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      keys.push(`${colIndexToLabel(c)}${r + 1}`);
    }
  }
  return keys;
}

// Recursively evaluate formula to resolve cell dependency tree
export function evaluateFormula(
  formula: string,
  grid: GridData,
  visited: Set<string> = new Set()
): string {
  if (!formula.startsWith('=')) {
    return formula;
  }

  const cleanFormula = formula.slice(1).trim();
  const upperFormula = cleanFormula.toUpperCase();

  // Guard against circular references
  const formulaSignature = formula;

  try {
    // 1. CAGR Formula: CAGR(end, start, periods) -> ((end/start) ^ (1/periods)) - 1
    if (upperFormula.startsWith('CAGR(')) {
      const argsStr = cleanFormula.slice(5, -1);
      const args = splitArgs(argsStr).map(arg => parseFloat(resolveValue(arg, grid, visited)));
      if (args.length === 3 && args[1] !== 0 && args[2] !== 0) {
        const cagr = Math.pow(args[0] / args[1], 1 / args[2]) - 1;
        return (cagr * 100).toFixed(2); // returns CAGR percentage as string
      }
      return '#VALUE!';
    }

    // 2. SUM Formula
    if (upperFormula.startsWith('SUM(')) {
      const argsStr = cleanFormula.slice(4, -1);
      const args = splitArgs(argsStr);
      let sum = 0;
      for (const arg of args) {
        if (arg.includes(':')) {
          const rangeKeys = expandRange(arg);
          for (const key of rangeKeys) {
            sum += parseFloat(resolveValue(key, grid, visited)) || 0;
          }
        } else {
          sum += parseFloat(resolveValue(arg, grid, visited)) || 0;
        }
      }
      return sum.toString();
    }

    // 3. AVERAGE Formula
    if (upperFormula.startsWith('AVERAGE(')) {
      const argsStr = cleanFormula.slice(8, -1);
      const args = splitArgs(argsStr);
      let sum = 0;
      let count = 0;
      for (const arg of args) {
        if (arg.includes(':')) {
          const rangeKeys = expandRange(arg);
          for (const key of rangeKeys) {
            const val = parseFloat(resolveValue(key, grid, visited));
            if (!isNaN(val)) {
              sum += val;
              count++;
            }
          }
        } else {
          const val = parseFloat(resolveValue(arg, grid, visited));
          if (!isNaN(val)) {
            sum += val;
            count++;
          }
        }
      }
      return count > 0 ? (sum / count).toString() : '0';
    }

    // 4. MIN Formula
    if (upperFormula.startsWith('MIN(')) {
      const argsStr = cleanFormula.slice(4, -1);
      const args = splitArgs(argsStr);
      const values: number[] = [];
      for (const arg of args) {
        if (arg.includes(':')) {
          expandRange(arg).forEach(k => {
            const val = parseFloat(resolveValue(k, grid, visited));
            if (!isNaN(val)) values.push(val);
          });
        } else {
          const val = parseFloat(resolveValue(arg, grid, visited));
          if (!isNaN(val)) values.push(val);
        }
      }
      return values.length > 0 ? Math.min(...values).toString() : '0';
    }

    // 5. MAX Formula
    if (upperFormula.startsWith('MAX(')) {
      const argsStr = cleanFormula.slice(4, -1);
      const args = splitArgs(argsStr);
      const values: number[] = [];
      for (const arg of args) {
        if (arg.includes(':')) {
          expandRange(arg).forEach(k => {
            const val = parseFloat(resolveValue(k, grid, visited));
            if (!isNaN(val)) values.push(val);
          });
        } else {
          const val = parseFloat(resolveValue(arg, grid, visited));
          if (!isNaN(val)) values.push(val);
        }
      }
      return values.length > 0 ? Math.max(...values).toString() : '0';
    }

    // 6. COUNT Formula
    if (upperFormula.startsWith('COUNT(')) {
      const argsStr = cleanFormula.slice(6, -1);
      const args = splitArgs(argsStr);
      let count = 0;
      for (const arg of args) {
        if (arg.includes(':')) {
          expandRange(arg).forEach(k => {
            if (resolveValue(k, grid, visited).trim() !== '') count++;
          });
        } else {
          if (resolveValue(arg, grid, visited).trim() !== '') count++;
        }
      }
      return count.toString();
    }

    // 7. MULTIPLY Formula
    if (upperFormula.startsWith('MULTIPLY(')) {
      const argsStr = cleanFormula.slice(9, -1);
      const args = splitArgs(argsStr).map(arg => parseFloat(resolveValue(arg, grid, visited)) || 0);
      if (args.length >= 2) {
        return args.reduce((acc, curr) => acc * curr, 1).toString();
      }
      return '0';
    }

    // 8. CONCAT Formula
    if (upperFormula.startsWith('CONCAT(')) {
      const argsStr = cleanFormula.slice(7, -1);
      const args = splitArgs(argsStr).map(arg => resolveValue(arg, grid, visited));
      return args.join('');
    }

    // 9. Simple arithmetic fallback (e.g. A1 + B1 or A1 * 1.12)
    // Supports simple operators: +, -, *, /
    if (/[+\-*/]/.test(cleanFormula)) {
      // Find components
      const tokens = cleanFormula.split(/([+\-*/])/).map(t => t.trim());
      
      const firstValStr = resolveValue(tokens[0], grid, visited);
      if (firstValStr.startsWith('#')) return firstValStr;
      let result = parseFloat(firstValStr) || 0;
      
      for (let i = 1; i < tokens.length; i += 2) {
        const op = tokens[i];
        const nextValStr = resolveValue(tokens[i + 1], grid, visited);
        if (nextValStr.startsWith('#')) return nextValStr;
        const nextVal = parseFloat(nextValStr) || 0;
        
        if (op === '+') result += nextVal;
        else if (op === '-') result -= nextVal;
        else if (op === '*') result *= nextVal;
        else if (op === '/') result = nextVal !== 0 ? result / nextVal : 0;
      }
      return result.toString();
    }

    // 10. Simple Cell reference fallback (e.g. "=A1")
    if (/^[A-Z]+[0-9]+$/i.test(cleanFormula)) {
      return resolveValue(cleanFormula, grid, visited);
    }

    return cleanFormula;
  } catch (err) {
    return '#ERR!';
  }
}

// Split argument string respecting nested parens/ranges (e.g. "A1,B2" or "A1:B3, C4")
function splitArgs(argsStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let parenDepth = 0;
  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    if (char === ',' && parenDepth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current) result.push(current.trim());
  return result;
}

// Resolve individual cell or constant value
function resolveValue(token: string, grid: GridData, visited: Set<string>): string {
  const trimmed = token.trim();
  
  // 1. String literal in quotes (e.g. "Sales - Q1")
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  // 2. Cell Reference (e.g. A1, B12)
  if (/^[A-Z]+[0-9]+$/i.test(trimmed)) {
    const cellKey = trimmed.toUpperCase();
    if (visited.has(cellKey)) {
      return '#REF!'; // Circular reference detection
    }
    const cell = grid[cellKey];
    if (!cell) return '0';

    const newVisited = new Set(visited);
    newVisited.add(cellKey);

    if (cell.value.startsWith('=')) {
      return evaluateFormula(cell.value, grid, newVisited);
    }
    return cell.value;
  }

  // 3. Nested formula call (e.g., SUM(A1:B3) or CAGR(A2, A1, 5))
  if (/^[A-Z]+\(.*\)$/i.test(trimmed)) {
    return evaluateFormula('=' + trimmed, grid, visited);
  }

  // 4. Mathematical expression as argument (e.g., A1+1 or B2*2)
  if (/[+\-*/]/.test(trimmed)) {
    return evaluateFormula('=' + trimmed, grid, visited);
  }

  // 5. Raw number or string constant
  return trimmed;
}

// Formatter helper based on cell style
export function formatValue(value: string, format?: string): string {
  if (!value || isNaN(Number(value))) {
    return value;
  }

  const num = Number(value);
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  }
  if (format === 'percent') {
    return (num * 100).toFixed(1) + '%';
  }
  if (format === 'number') {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  }
  return value;
}
