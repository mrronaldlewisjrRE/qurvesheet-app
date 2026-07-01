export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  bg?: string;
  align?: 'left' | 'center' | 'right';
  format?: 'general' | 'currency' | 'percent' | 'number' | 'date';
  fontSize?: string;
}

export interface CellData {
  value: string; // The raw input (e.g. "1200" or "=SUM(A1:A5)")
  computed?: string; // The evaluated visual output (e.g. "$1,200.00")
  style?: CellStyle;
}

export type GridData = Record<string, CellData>; // key format: "A1", "B12"

export interface SheetData {
  id: string;
  name: string;
  grid: GridData;
  rowCount: number;
  colCount: number;
  slicers?: SlicerConfig[];
  hiddenRows?: number[];
  hiddenCols?: number[];
}

export interface SlicerConfig {
  id: string;
  colIndex: number;
  colLabel: string;
  headerName: string;
  uniqueValues: string[];
  selectedValue: string | null;
}

export interface Workbook {
  id: string;
  name: string;
  sheets: SheetData[];
  activeSheetId: string;
  firestoreId?: string;
}

export type WorkspacePreset = 'analytics' | 'finance' | 'operations' | 'executive' | 'developer';

export type ThemeMode = 'light' | 'dark' | 'professional';

export interface SelectionRange {
  startRow: number; // 0-indexed
  startCol: number; // 0-indexed
  endRow: number;
  endCol: number;
}

export interface HistoryItem {
  timestamp: string;
  label: string;
  workbook: Workbook;
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'scatter' | 'radar' | 'pie' | 'waterfall' | 'kpi';
  title: string;
  data: any[];
  xKey: string;
  yKeys: string[];
  kpiValue?: string;
  kpiLabel?: string;
  sheetId?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: 'apply_formula' | 'update_cells' | 'create_chart' | 'fill_data';
    payload: any;
  };
}

export interface AnomalyReport {
  cell: string;
  value: string;
  reason: string;
  score: number;
}
