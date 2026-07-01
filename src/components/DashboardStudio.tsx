import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartConfig, SheetData } from '../types';
import { Sparkles, Trash2, LayoutGrid, BarChart3, TrendingUp, Compass, Sliders, Filter, RefreshCw } from 'lucide-react';

interface DashboardStudioProps {
  charts: ChartConfig[];
  sheet: SheetData;
  onAddChart: (chart: ChartConfig) => void;
  onRemoveChart: (id: string) => void;
  onTriggerDashboardBuilder: (request: string) => void;
  isBuilding: boolean;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function DashboardStudio({
  charts,
  sheet,
  onAddChart,
  onRemoveChart,
  onTriggerDashboardBuilder,
  isBuilding,
}: DashboardStudioProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedChartType, setSelectedChartType] = useState<string>('all');

  // Parse raw sheet grid data to extract valid numeric metrics for quick charts
  const extractQuickChartData = () => {
    // Look at columns: Region/Name, Q1, Q2, Profit, CAC, Target, YTD
    // Let's inspect known templates to return friendly structures
    const data: any[] = [];
    if (sheet.id === 'analytics_sheet') {
      const regions = ['North America', 'Europe & UK', 'Asia Pacific', 'Latin America', 'Middle East & Africa'];
      const rows = [2, 3, 4, 5, 6];
      regions.forEach((region, i) => {
        const row = rows[i];
        const q1 = parseFloat(sheet.grid[`B${row}`]?.value) || 0;
        const q2 = parseFloat(sheet.grid[`C${row}`]?.value) || 0;
        const margin = parseFloat(sheet.grid[`E${row}`]?.value) || 0;
        data.push({
          label: region,
          q1Revenue: q1,
          q2Revenue: q2,
          profit: q2 * margin,
          margin: margin * 100,
        });
      });
    } else if (sheet.id === 'finance_sheet') {
      const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
      const cols = ['B', 'C', 'D', 'E', 'F'];
      years.forEach((year, i) => {
        const col = cols[i];
        const mrr = parseFloat(sheet.grid[`${col}2`]?.value) || 0;
        const arr = mrr * 12;
        const cac = parseFloat(sheet.grid[`${col}4`]?.value) || 0;
        const acv = parseFloat(sheet.grid[`${col}5`]?.value) || 0;
        const ltvCac = cac !== 0 ? acv / cac : 0;
        data.push({
          label: year,
          mrr,
          arr,
          cac,
          acv,
          ltvToCac: parseFloat(ltvCac.toFixed(2)),
        });
      });
    } else if (sheet.id === 'operations_sheet') {
      const skus = ['SKU-8809-RAM', 'SKU-2342-GPU', 'SKU-9908-SSD', 'SKU-1029-CPU', 'SKU-5542-PSU'];
      const rows = [2, 3, 4, 5, 6];
      skus.forEach((sku, i) => {
        const row = rows[i];
        const stock = parseFloat(sheet.grid[`B${row}`]?.value) || 0;
        const reorder = parseFloat(sheet.grid[`C${row}`]?.value) || 0;
        const leadTime = parseFloat(sheet.grid[`D${row}`]?.value) || 0;
        const demand = parseFloat(sheet.grid[`E${row}`]?.value) || 0;
        data.push({
          label: sku,
          stock,
          reorderPoint: reorder,
          leadTime,
          demandRate: demand,
        });
      });
    } else if (sheet.id === 'executive_sheet') {
      const kpis = [
        'Customer Net Promoter Score (NPS)',
        'Annual Gross Margin Rate',
        'Net Promoter Score Growth',
        'Employee Retention Rate',
      ];
      const rows = [2, 3, 4, 5];
      kpis.forEach((kpi, i) => {
        const row = rows[i];
        const target = parseFloat(sheet.grid[`B${row}`]?.value) || 0;
        const current = parseFloat(sheet.grid[`C${row}`]?.value) || 0;
        data.push({
          label: kpi.split(' ').slice(-1)[0] || kpi,
          target: target < 1 ? target * 100 : target,
          current: current < 1 ? current * 100 : current,
        });
      });
    }
    return data;
  };

  const handleBuildDashboardPreset = (type: string) => {
    const rawData = extractQuickChartData();
    if (rawData.length === 0) return;

    if (type === 'sales') {
      onAddChart({
        id: 'sales_performance_bar',
        type: 'bar',
        title: 'Q1 vs Q2 Revenue by Region',
        data: rawData,
        xKey: 'label',
        yKeys: ['q1Revenue', 'q2Revenue'],
      });
      onAddChart({
        id: 'profitability_line',
        type: 'line',
        title: 'Regional Operating Profit Margin (%)',
        data: rawData,
        xKey: 'label',
        yKeys: ['margin'],
      });
    } else if (type === 'finance') {
      onAddChart({
        id: 'finance_mrr_growth',
        type: 'line',
        title: 'MRR Growth Projections (5-Year CFO Forecast)',
        data: rawData,
        xKey: 'label',
        yKeys: ['mrr'],
      });
      onAddChart({
        id: 'unit_economics',
        type: 'bar',
        title: 'CAC & Average Contract Value Comparison',
        data: rawData,
        xKey: 'label',
        yKeys: ['cac', 'acv'],
      });
    } else if (type === 'operations') {
      onAddChart({
        id: 'stock_shortage_radar',
        type: 'radar',
        title: 'SKU Stock Levels vs Reorder Point Risk',
        data: rawData,
        xKey: 'label',
        yKeys: ['stock', 'reorderPoint'],
      });
    } else if (type === 'executive') {
      onAddChart({
        id: 'kpi_variance_comparison',
        type: 'bar',
        title: 'Target vs YTD Executive Scorecard Accomplishment (%)',
        data: rawData,
        xKey: 'label',
        yKeys: ['target', 'current'],
      });
    }
  };

  const filteredCharts = charts.filter(c => {
    if (selectedChartType !== 'all' && c.type !== selectedChartType) return false;
    return c.title.toLowerCase().includes(filterQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 overflow-hidden">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <LayoutGrid size={18} className="text-indigo-500" />
            <span>Interactive Dashboard Studio</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Design real-time widgets, filter metrics, and analyze trends instantly.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search charts..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <select
            value={selectedChartType}
            onChange={e => setSelectedChartType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Visuals</option>
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="radar">Radar</option>
            <option value="pie">Pie</option>
          </select>
        </div>
      </div>

      {/* AI Dashboard Builder Hero banner (if no charts exist yet) */}
      {charts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 my-4">
          <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 dark:text-indigo-400 mb-3 animate-pulse">
            <Sparkles size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Active Visualizations Present
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-1 mb-6">
            Generate customized boards automatically based on your sheet context or build classic layouts.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            <button
              onClick={() => handleBuildDashboardPreset('sales')}
              className="flex items-center justify-center gap-2 p-3 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
            >
              <BarChart3 size={14} className="text-indigo-500" />
              <span>Regional Sales Report</span>
            </button>
            <button
              onClick={() => handleBuildDashboardPreset('finance')}
              className="flex items-center justify-center gap-2 p-3 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
            >
              <TrendingUp size={14} className="text-emerald-500" />
              <span>SaaS CFO Metrics</span>
            </button>
            <button
              onClick={() => handleBuildDashboardPreset('operations')}
              className="flex items-center justify-center gap-2 p-3 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
            >
              <Compass size={14} className="text-amber-500" />
              <span>Inventory Risk Radar</span>
            </button>
            <button
              onClick={() => handleBuildDashboardPreset('executive')}
              className="flex items-center justify-center gap-2 p-3 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
            >
              <Sliders size={14} className="text-purple-500" />
              <span>Executive Scorecard</span>
            </button>
          </div>

          <div className="mt-6 flex items-center gap-1.5 text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
            <Sparkles size={11} />
            <span>Speak: &quot;Build me a CEO dashboard&quot; to compile visuals with AI</span>
          </div>
        </div>
      )}

      {/* Render Active Charts Grid */}
      {charts.length > 0 && (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-4 pr-1">
          {filteredCharts.map(chart => (
            <div
              key={chart.id}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-4 flex flex-col justify-between group/chart shadow-sm transition-all relative"
            >
              {/* Delete button */}
              <button
                onClick={() => onRemoveChart(chart.id)}
                className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover/chart:opacity-100 focus:opacity-100 transition-opacity z-10"
                title="Remove Chart"
              >
                <Trash2 size={13} />
              </button>

              <div className="mb-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans tracking-tight">
                  {chart.title}
                </span>
                <span className="text-[9px] font-mono block text-slate-400 mt-0.5 capitalize">
                  Type: {chart.type} • Derived from current sheet
                </span>
              </div>

              {/* Chart Stage */}
              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  {chart.type === 'bar' ? (
                    <BarChart data={chart.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey={chart.xKey} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      {chart.yKeys.map((key, index) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          fill={COLORS[index % COLORS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  ) : chart.type === 'line' ? (
                    <LineChart data={chart.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey={chart.xKey} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      {chart.yKeys.map((key, index) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2.5}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  ) : chart.type === 'radar' ? (
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chart.data}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey={chart.xKey} tick={{ fontSize: 8 }} stroke="#94a3b8" />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 7 }} />
                      {chart.yKeys.map((key, index) => (
                        <Radar
                          key={key}
                          name={key}
                          dataKey={key}
                          stroke={COLORS[index % COLORS.length]}
                          fill={COLORS[index % COLORS.length]}
                          fillOpacity={0.25}
                        />
                      ))}
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 8 }} />
                    </RadarChart>
                  ) : chart.type === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={chart.data}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey={chart.yKeys[0]}
                        nameKey={chart.xKey}
                      >
                        {chart.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 8 }} />
                    </PieChart>
                  ) : (
                    // Default fallback list visualizer
                    <div className="flex flex-col gap-2 w-full text-xs py-2 px-4 max-h-40 overflow-y-auto font-sans">
                      {chart.data.map((row, i) => (
                        <div key={i} className="flex justify-between border-b py-1">
                          <span className="font-semibold text-slate-700">{row[chart.xKey]}</span>
                          <span className="font-mono text-indigo-500 font-semibold">{row[chart.yKeys[0]]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Chart footer widgets */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Filter size={10} className="text-slate-400" />
                  <span>Drill-down active</span>
                </span>
                <span className="text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                  Live synced
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
