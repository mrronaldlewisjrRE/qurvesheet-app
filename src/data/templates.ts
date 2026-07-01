import { SheetData, Workbook } from '../types';

export const ANALYTICS_TEMPLATE: SheetData = {
  id: 'analytics_sheet',
  name: 'Sales Performance',
  rowCount: 40,
  colCount: 15,
  grid: {
    A1: { value: 'Region', style: { bold: true, bg: '#1e293b', color: '#ffffff', align: 'left' } },
    B1: { value: 'Q1 Revenue', style: { bold: true, bg: '#1e293b', color: '#ffffff', align: 'right' } },
    C1: { value: 'Q2 Revenue', style: { bold: true, bg: '#1e293b', color: '#ffffff', align: 'right' } },
    D1: { value: 'Growth Rate', style: { bold: true, bg: '#1e293b', color: '#ffffff', align: 'right' } },
    E1: { value: 'Operating Margin', style: { bold: true, bg: '#1e293b', color: '#ffffff', align: 'right' } },
    F1: { value: 'Net Profit', style: { bold: true, bg: '#1e293b', color: '#ffffff', align: 'right' } },

    A2: { value: 'North America', style: { bold: false, align: 'left' } },
    B2: { value: '450000', style: { align: 'right' }, computed: '450000' },
    C2: { value: '520000', style: { align: 'right' }, computed: '520000' },
    D2: { value: '=(C2-B2)/B2', style: { align: 'right', format: 'percent' } },
    E2: { value: '0.24', style: { align: 'right', format: 'percent' } },
    F2: { value: '=MULTIPLY(C2,E2)', style: { align: 'right', format: 'currency' } },

    A3: { value: 'Europe & UK', style: { align: 'left' } },
    B3: { value: '380000', style: { align: 'right' } },
    C3: { value: '410000', style: { align: 'right' } },
    D3: { value: '=(C3-B3)/B3', style: { align: 'right', format: 'percent' } },
    E3: { value: '0.21', style: { align: 'right', format: 'percent' } },
    F3: { value: '=MULTIPLY(C3,E3)', style: { align: 'right', format: 'currency' } },

    A4: { value: 'Asia Pacific', style: { align: 'left' } },
    B4: { value: '290000', style: { align: 'right' } },
    C4: { value: '345000', style: { align: 'right' } },
    D4: { value: '=(C4-B4)/B4', style: { align: 'right', format: 'percent' } },
    E4: { value: '0.28', style: { align: 'right', format: 'percent' } },
    F4: { value: '=MULTIPLY(C4,E4)', style: { align: 'right', format: 'currency' } },

    A5: { value: 'Latin America', style: { align: 'left' } },
    B5: { value: '150000', style: { align: 'right' } },
    C5: { value: '185000', style: { align: 'right' } },
    D5: { value: '=(C5-B5)/B5', style: { align: 'right', format: 'percent' } },
    E5: { value: '0.18', style: { align: 'right', format: 'percent' } },
    F5: { value: '=MULTIPLY(C5,E5)', style: { align: 'right', format: 'currency' } },

    A6: { value: 'Middle East & Africa', style: { align: 'left' } },
    B6: { value: '950000', style: { align: 'right' } }, // Anomaly: high outlier
    C6: { value: '130000', style: { align: 'right' } },
    D6: { value: '=(C6-B6)/B6', style: { align: 'right', format: 'percent' } },
    E6: { value: '0.15', style: { align: 'right', format: 'percent' } },
    F6: { value: '=MULTIPLY(C6,E6)', style: { align: 'right', format: 'currency' } },

    A8: { value: 'Total / Average Summary', style: { bold: true, align: 'left' } },

    A9: { value: 'Overall Q1 Revenue', style: { italic: true, align: 'left' } },
    B9: { value: '=SUM(B2:B6)', style: { bold: true, align: 'right', format: 'currency' } },

    A10: { value: 'Overall Q2 Revenue', style: { italic: true, align: 'left' } },
    C10: { value: '=SUM(C2:C6)', style: { bold: true, align: 'right', format: 'currency' } },

    A11: { value: 'Average Operating Margin', style: { italic: true, align: 'left' } },
    E11: { value: '=AVERAGE(E2:E6)', style: { bold: true, align: 'right', format: 'percent' } },

    A12: { value: 'Max Profit Region', style: { italic: true, align: 'left' } },
    F12: { value: '=MAX(F2:F6)', style: { bold: true, align: 'right', format: 'currency' } },
  },
};

export const FINANCE_TEMPLATE: SheetData = {
  id: 'finance_sheet',
  name: 'CFO Forecast Model',
  rowCount: 40,
  colCount: 15,
  grid: {
    A1: { value: 'Metric / SaaS Kpis', style: { bold: true, bg: '#0f172a', color: '#ffffff' } },
    B1: { value: 'Year 1', style: { bold: true, bg: '#0f172a', color: '#ffffff', align: 'right' } },
    C1: { value: 'Year 2', style: { bold: true, bg: '#0f172a', color: '#ffffff', align: 'right' } },
    D1: { value: 'Year 3', style: { bold: true, bg: '#0f172a', color: '#ffffff', align: 'right' } },
    E1: { value: 'Year 4', style: { bold: true, bg: '#0f172a', color: '#ffffff', align: 'right' } },
    F1: { value: 'Year 5', style: { bold: true, bg: '#0f172a', color: '#ffffff', align: 'right' } },
    G1: { value: 'CAGR (%)', style: { bold: true, bg: '#0f172a', color: '#ffffff', align: 'right' } },

    A2: { value: 'Monthly Recurring Revenue (MRR)', style: { align: 'left' } },
    B2: { value: '25000', style: { align: 'right' } },
    C2: { value: '55000', style: { align: 'right' } },
    D2: { value: '110000', style: { align: 'right' } },
    E2: { value: '220000', style: { align: 'right' } },
    F2: { value: '450000', style: { align: 'right' } },
    G2: { value: '=CAGR(F2,B2,4)', style: { bold: true, align: 'right', format: 'percent' } },

    A3: { value: 'Annual Run Rate (ARR)', style: { align: 'left' } },
    B3: { value: '=MULTIPLY(B2,12)', style: { align: 'right', format: 'currency' } },
    C3: { value: '=MULTIPLY(C2,12)', style: { align: 'right', format: 'currency' } },
    D3: { value: '=MULTIPLY(D2,12)', style: { align: 'right', format: 'currency' } },
    E3: { value: '=MULTIPLY(E2,12)', style: { align: 'right', format: 'currency' } },
    F3: { value: '=MULTIPLY(F2,12)', style: { align: 'right', format: 'currency' } },

    A4: { value: 'Customer Acquisition Cost (CAC)', style: { align: 'left' } },
    B4: { value: '1200', style: { align: 'right' } },
    C4: { value: '1050', style: { align: 'right' } },
    D4: { value: '980', style: { align: 'right' } },
    E4: { value: '920', style: { align: 'right' } },
    F4: { value: '850', style: { align: 'right' } },

    A5: { value: 'Average Contract Value (ACV)', style: { align: 'left' } },
    B5: { value: '3600', style: { align: 'right' } },
    C5: { value: '4100', style: { align: 'right' } },
    D5: { value: '4500', style: { align: 'right' } },
    E5: { value: '5000', style: { align: 'right' } },
    F5: { value: '5500', style: { align: 'right' } },

    A6: { value: 'LTV to CAC Ratio', style: { align: 'left', bold: true } },
    B6: { value: '=(B5/B4)', style: { align: 'right', format: 'number' } },
    C6: { value: '=(C5/C4)', style: { align: 'right', format: 'number' } },
    D6: { value: '=(D5/D4)', style: { align: 'right', format: 'number' } },
    E6: { value: '=(E5/E4)', style: { align: 'right', format: 'number' } },
    F6: { value: '=(F5/F4)', style: { align: 'right', format: 'number' } },
  },
};

export const OPERATIONS_TEMPLATE: SheetData = {
  id: 'operations_sheet',
  name: 'Supply Chain & Inventory',
  rowCount: 40,
  colCount: 15,
  grid: {
    A1: { value: 'SKU Code', style: { bold: true, bg: '#0369a1', color: '#ffffff' } },
    B1: { value: 'Current Stock', style: { bold: true, bg: '#0369a1', color: '#ffffff', align: 'right' } },
    C1: { value: 'Reorder Point', style: { bold: true, bg: '#0369a1', color: '#ffffff', align: 'right' } },
    D1: { value: 'Lead Time (Days)', style: { bold: true, bg: '#0369a1', color: '#ffffff', align: 'right' } },
    E1: { value: 'Daily Demand Rate', style: { bold: true, bg: '#0369a1', color: '#ffffff', align: 'right' } },
    F1: { value: 'Shortage Risk Level', style: { bold: true, bg: '#0369a1', color: '#ffffff', align: 'center' } },

    A2: { value: 'SKU-8809-RAM', style: { align: 'left' } },
    B2: { value: '120', style: { align: 'right' } },
    C2: { value: '150', style: { align: 'right' } },
    D2: { value: '14', style: { align: 'right' } },
    E2: { value: '12', style: { align: 'right' } },
    F2: { value: 'CRITICAL', style: { align: 'center', bold: true, color: '#ef4444' } },

    A3: { value: 'SKU-2342-GPU', style: { align: 'left' } },
    B3: { value: '450', style: { align: 'right' } },
    C3: { value: '300', style: { align: 'right' } },
    D3: { value: '25', style: { align: 'right' } },
    E3: { value: '8', style: { align: 'right' } },
    F3: { value: 'LOW', style: { align: 'center', bold: true, color: '#10b981' } },

    A4: { value: 'SKU-9908-SSD', style: { align: 'left' } },
    B4: { value: '15', style: { align: 'right' } },
    C4: { value: '80', style: { align: 'right' } },
    D4: { value: '21', style: { align: 'right' } },
    E4: { value: '5', style: { align: 'right' } },
    F4: { value: 'CRITICAL', style: { align: 'center', bold: true, color: '#ef4444' } },

    A5: { value: 'SKU-1029-CPU', style: { align: 'left' } },
    B5: { value: '95', style: { align: 'right' } },
    C5: { value: '100', style: { align: 'right' } },
    D5: { value: '10', style: { align: 'right' } },
    E5: { value: '6', style: { align: 'right' } },
    F5: { value: 'MEDIUM', style: { align: 'center', bold: true, color: '#f59e0b' } },

    A6: { value: 'SKU-5542-PSU', style: { align: 'left' } },
    B6: { value: '1200', style: { align: 'right' } },
    C6: { value: '400', style: { align: 'right' } },
    D6: { value: '5', style: { align: 'right' } },
    E6: { value: '24', style: { align: 'right' } },
    F6: { value: 'LOW', style: { align: 'center', bold: true, color: '#10b981' } },
  },
};

export const EXECUTIVE_TEMPLATE: SheetData = {
  id: 'executive_sheet',
  name: 'Executive KPI Dashboard',
  rowCount: 40,
  colCount: 15,
  grid: {
    A1: { value: 'Key Performance Indicator', style: { bold: true, bg: '#581c87', color: '#ffffff' } },
    B1: { value: 'Target Goal', style: { bold: true, bg: '#581c87', color: '#ffffff', align: 'right' } },
    C1: { value: 'Current YTD', style: { bold: true, bg: '#581c87', color: '#ffffff', align: 'right' } },
    D1: { value: 'Variance (%)', style: { bold: true, bg: '#581c87', color: '#ffffff', align: 'right' } },
    E1: { value: 'Status', style: { bold: true, bg: '#581c87', color: '#ffffff', align: 'center' } },

    A2: { value: 'Customer Net Promoter Score (NPS)', style: { align: 'left' } },
    B2: { value: '75', style: { align: 'right' } },
    C2: { value: '78', style: { align: 'right' } },
    D2: { value: '=(C2-B2)/B2', style: { align: 'right', format: 'percent' } },
    E2: { value: 'EXCEEDED', style: { align: 'center', bold: true, color: '#10b981' } },

    A3: { value: 'Annual Gross Margin Rate', style: { align: 'left' } },
    B3: { value: '0.65', style: { align: 'right' } },
    C3: { value: '0.62', style: { align: 'right' } },
    D3: { value: '=(C3-B3)/B3', style: { align: 'right', format: 'percent' } },
    E3: { value: 'WARNING', style: { align: 'center', bold: true, color: '#f59e0b' } },

    A4: { value: 'Net Promoter Score Growth', style: { align: 'left' } },
    B4: { value: '0.10', style: { align: 'right' } },
    C4: { value: '0.12', style: { align: 'right' } },
    D4: { value: '=(C4-B4)/B4', style: { align: 'right', format: 'percent' } },
    E4: { value: 'EXCEEDED', style: { align: 'center', bold: true, color: '#10b981' } },

    A5: { value: 'Employee Retention Rate', style: { align: 'left' } },
    B5: { value: '0.90', style: { align: 'right' } },
    C5: { value: '0.92', style: { align: 'right' } },
    D5: { value: '=(C5-B5)/B5', style: { align: 'right', format: 'percent' } },
    E5: { value: 'EXCEEDED', style: { align: 'center', bold: true, color: '#10b981' } },
  },
};

export const DEFAULT_WORKBOOK: Workbook = {
  id: 'omnisheet_workbook',
  name: 'Global Enterprise Model',
  sheets: [ANALYTICS_TEMPLATE, FINANCE_TEMPLATE, OPERATIONS_TEMPLATE, EXECUTIVE_TEMPLATE],
  activeSheetId: 'analytics_sheet',
};
