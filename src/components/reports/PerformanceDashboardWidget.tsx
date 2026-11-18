import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Layers,
  Percent,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  DailyPerformancePoint,
  InventoryTurnoverMetric,
  PerformanceDashboardData,
  detectPerformanceAnomalies,
} from '../../core/performanceDashboardEngine';

export interface PerformanceDashboardWidgetProps {
  data: PerformanceDashboardData;
  currency: string;
  language: 'ar' | 'en';
  isDark?: boolean;
  onNavigateToSales?: () => void;
  onNavigateToInventory?: () => void;
}

type FocusChartMode = 'ALL' | 'SALES' | 'TURNOVER' | 'MARGINS';

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>, fallbackWidth = 520): number {
  const [width, setWidth] = useState<number>(fallbackWidth);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const next = Math.round(el.getBoundingClientRect().width);
      if (next > 120) {
        setWidth(next);
      }
    };
    update();

    if (typeof ResizeObserver !== 'undefined') {
      const obs = new ResizeObserver(update);
      obs.observe(el);
      return () => obs.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);

  return width;
}

export const PerformanceDashboardWidget: React.FC<PerformanceDashboardWidgetProps> = ({
  data,
  currency,
  language,
  isDark = false,
  onNavigateToSales,
  onNavigateToInventory,
}) => {
  const [focusMode, setFocusMode] = useState<FocusChartMode>('ALL');
  const [anomalyDetectionEnabled, setAnomalyDetectionEnabled] = useState<boolean>(false);

  const anomalyReport = useMemo(() => detectPerformanceAnomalies(data), [data]);

  const salesContainerRef = useRef<HTMLDivElement | null>(null);
  const turnoverContainerRef = useRef<HTMLDivElement | null>(null);
  const marginContainerRef = useRef<HTMLDivElement | null>(null);

  const salesSvgRef = useRef<SVGSVGElement | null>(null);
  const turnoverSvgRef = useRef<SVGSVGElement | null>(null);
  const marginSvgRef = useRef<SVGSVGElement | null>(null);

  const salesWidth = useContainerWidth(salesContainerRef, 560);
  const turnoverWidth = useContainerWidth(turnoverContainerRef, 520);
  const marginWidth = useContainerWidth(marginContainerRef, 560);

  const [hoveredSalesPoint, setHoveredSalesPoint] = useState<DailyPerformancePoint | null>(null);
  const [hoveredTurnoverItem, setHoveredTurnoverItem] = useState<InventoryTurnoverMetric | null>(
    null
  );
  const [hoveredMarginPoint, setHoveredMarginPoint] = useState<DailyPerformancePoint | null>(null);

  const topTurnoverItems = useMemo(
    () => data.inventoryTurnoverItems.slice(0, 8),
    [data.inventoryTurnoverItems]
  );

  // 1. D3 Real-Time Sales Trends (Area + Line + Interactive Points)
  useEffect(() => {
    const svgEl = salesSvgRef.current;
    if (!svgEl) return;
    const series = data.salesTrendSeries;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const height = focusMode === 'SALES' ? 280 : 190;
    const margin = { top: 18, right: 16, bottom: 28, left: 48 };
    const innerWidth = Math.max(160, salesWidth - margin.left - margin.right);
    const innerHeight = Math.max(84, height - margin.top - margin.bottom);

    svg.attr('viewBox', `0 0 ${salesWidth} ${height}`).attr('height', height);

    if (series.length === 0) return;

    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'haseb-d3-sales-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#2563eb').attr('stop-opacity', 0.28);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#2563eb').attr('stop-opacity', 0.02);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scalePoint<string>()
      .domain(series.map((d) => d.date))
      .range([0, innerWidth])
      .padding(series.length === 1 ? 0.5 : 0.15);

    const maxSales = Math.max(10, d3.max(series, (d) => d.grossSales) || 0);
    const yScale = d3.scaleLinear().domain([0, maxSales * 1.15]).nice().range([innerHeight, 0]);

    const gridColor = isDark ? '#1e293b' : '#f1f5f9';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const axisStroke = isDark ? '#334155' : '#e2e8f0';

    // Horizontal gridlines
    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(4)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .call((sel) => sel.select('.domain').remove())
      .selectAll('line')
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', '3,3');

    // X Axis (sample tick labels if dense)
    const tickStride = Math.max(1, Math.ceil(series.length / 6));
    const tickValues = series
      .filter((_, idx) => idx % tickStride === 0 || idx === series.length - 1)
      .map((d) => d.date);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues(tickValues)
          .tickFormat((d) => String(d).slice(5))
      )
      .call((sel) => {
        sel.select('.domain').attr('stroke', axisStroke);
        sel.selectAll('line').attr('stroke', axisStroke);
        sel
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '10px')
          .style('font-family', 'ui-monospace, SFMono-Regular, monospace');
      });

    // Y Axis
    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(4)
          .tickFormat((v) => {
            const num = Number(v);
            if (num >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}k`;
            return String(num);
          })
      )
      .call((sel) => {
        sel.select('.domain').remove();
        sel.selectAll('line').remove();
        sel
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '10px')
          .style('font-family', 'ui-monospace, SFMono-Regular, monospace');
      });

    if (series.length > 1) {
      const areaGen = d3
        .area<DailyPerformancePoint>()
        .x((d) => xScale(d.date) ?? 0)
        .y0(innerHeight)
        .y1((d) => yScale(d.grossSales))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(series)
        .attr('fill', 'url(#haseb-d3-sales-grad)')
        .attr('d', areaGen);

      const lineGen = d3
        .line<DailyPerformancePoint>()
        .x((d) => xScale(d.date) ?? 0)
        .y((d) => yScale(d.grossSales))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(series)
        .attr('fill', 'none')
        .attr('stroke', '#2563eb')
        .attr('stroke-width', 2.25)
        .attr('d', lineGen);
    } else {
      const single = series[0];
      const cx = xScale(single.date) ?? innerWidth / 2;
      g.append('line')
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y1', yScale(single.grossSales))
        .attr('y2', innerHeight)
        .attr('stroke', '#2563eb')
        .attr('stroke-width', 3)
        .attr('stroke-opacity', 0.35);
    }

    // Data points + generous invisible hit-targets
    g.selectAll('circle.sales-dot')
      .data(series)
      .enter()
      .append('circle')
      .attr('class', 'sales-dot')
      .attr('cx', (d) => xScale(d.date) ?? 0)
      .attr('cy', (d) => yScale(d.grossSales))
      .attr('r', 4.5)
      .attr('fill', '#2563eb')
      .attr('stroke', isDark ? '#0f172a' : '#ffffff')
      .attr('stroke-width', 1.75);

    if (series.length <= 3) {
      g.selectAll('text.sales-lbl')
        .data(series)
        .enter()
        .append('text')
        .attr('x', (d) => xScale(d.date) ?? 0)
        .attr('y', (d) => Math.max(10, yScale(d.grossSales) - 9))
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#93c5fd' : '#1d4ed8')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('font-family', 'ui-monospace, SFMono-Regular, monospace')
        .text((d) => d.grossSales.toLocaleString());
    }

    g.selectAll('circle.sales-hit')
      .data(series)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.date) ?? 0)
      .attr('cy', (d) => yScale(d.grossSales))
      .attr('r', 14)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', (_ev, d) => setHoveredSalesPoint(d))
      .on('mouseleave', () => setHoveredSalesPoint(null));
  }, [data.salesTrendSeries, salesWidth, isDark, focusMode]);

  // 2. D3 Inventory Turnover Horizontal Ranked Bar Chart
  useEffect(() => {
    const svgEl = turnoverSvgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const rows = topTurnoverItems;
    const rowHeight = 26;
    const height = Math.max(focusMode === 'TURNOVER' ? 280 : 190, rows.length * rowHeight + 40);
    const margin = { top: 10, right: 44, bottom: 26, left: 74 };
    const innerWidth = Math.max(120, turnoverWidth - margin.left - margin.right);
    const innerHeight = Math.max(80, height - margin.top - margin.bottom);

    svg.attr('viewBox', `0 0 ${turnoverWidth} ${height}`).attr('height', height);
    if (rows.length === 0) return;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const yScale = d3
      .scaleBand<string>()
      .domain(rows.map((d) => d.sku))
      .range([0, innerHeight])
      .padding(0.28);

    const maxTurnover = Math.max(0.5, d3.max(rows, (d) => d.turnoverRatio) || 0.5);
    const xScale = d3.scaleLinear().domain([0, maxTurnover * 1.15]).nice().range([0, innerWidth]);

    const gridColor = isDark ? '#1e293b' : '#f1f5f9';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const axisStroke = isDark ? '#334155' : '#e2e8f0';

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(4)
          .tickSize(-innerHeight)
          .tickFormat((v) => `${Number(v).toFixed(1)}x`)
      )
      .call((sel) => {
        sel.select('.domain').attr('stroke', axisStroke);
        sel.selectAll('.tick line').attr('stroke', gridColor).attr('stroke-dasharray', '3,3');
        sel
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '10px')
          .style('font-family', 'ui-monospace, SFMono-Regular, monospace');
      });

    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call((sel) => {
        sel.select('.domain').attr('stroke', axisStroke);
        sel
          .selectAll('text')
          .attr('fill', isDark ? '#e2e8f0' : '#334155')
          .style('font-size', '10px')
          .style('font-weight', '600')
          .style('font-family', 'ui-monospace, SFMono-Regular, monospace');
      });

    const cappedBarHeight = Math.min(20, yScale.bandwidth());
    const barYOffset = (yScale.bandwidth() - cappedBarHeight) / 2;

    // Background track
    g.selectAll('rect.turnover-track')
      .data(rows)
      .enter()
      .append('rect')
      .attr('class', 'turnover-track')
      .attr('x', 0)
      .attr('y', (d) => (yScale(d.sku) ?? 0) + barYOffset)
      .attr('width', innerWidth)
      .attr('height', cappedBarHeight)
      .attr('rx', 4)
      .attr('fill', isDark ? '#1e293b' : '#f1f5f9');

    // Turnover bars (highlight anomalies when anomalyDetectionEnabled is true)
    g.selectAll('rect.turnover-bar')
      .data(rows)
      .enter()
      .append('rect')
      .attr('class', 'turnover-bar')
      .attr('x', 0)
      .attr('y', (d) => (yScale(d.sku) ?? 0) + barYOffset)
      .attr('width', (d) => Math.max(d.turnoverRatio > 0 ? 6 : 0, xScale(d.turnoverRatio)))
      .attr('height', cappedBarHeight)
      .attr('rx', 4)
      .attr('fill', (d) => {
        if (anomalyDetectionEnabled && anomalyReport.turnoverAnomalySkus.includes(d.sku)) {
          return '#f59e0b';
        }
        return d.turnoverRatio >= 0.75
          ? '#059669'
          : d.turnoverRatio > 0
          ? '#2563eb'
          : isDark
          ? '#475569'
          : '#cbd5e1';
      })
      .attr('stroke', (d) =>
        anomalyDetectionEnabled && anomalyReport.turnoverAnomalySkus.includes(d.sku)
          ? '#dc2626'
          : 'none'
      )
      .attr('stroke-width', (d) =>
        anomalyDetectionEnabled && anomalyReport.turnoverAnomalySkus.includes(d.sku) ? 1.5 : 0
      )
      .style('cursor', 'pointer')
      .on('mouseenter', (_ev, d) => setHoveredTurnoverItem(d))
      .on('mouseleave', () => setHoveredTurnoverItem(null));

    // Direct end-of-bar value labels
    g.selectAll('text.turnover-val')
      .data(rows)
      .enter()
      .append('text')
      .attr('class', 'turnover-val')
      .attr('x', (d) => Math.min(innerWidth + 4, xScale(d.turnoverRatio) + 6))
      .attr('y', (d) => (yScale(d.sku) ?? 0) + yScale.bandwidth() / 2 + 3.5)
      .attr('fill', (d) =>
        anomalyDetectionEnabled && anomalyReport.turnoverAnomalySkus.includes(d.sku)
          ? '#d97706'
          : textColor
      )
      .style('font-size', '10px')
      .style('font-weight', (d) =>
        anomalyDetectionEnabled && anomalyReport.turnoverAnomalySkus.includes(d.sku) ? '700' : '400'
      )
      .style('font-family', 'ui-monospace, SFMono-Regular, monospace')
      .text((d) =>
        anomalyDetectionEnabled && anomalyReport.turnoverAnomalySkus.includes(d.sku)
          ? `⚠ ${d.turnoverRatio.toFixed(2)}x`
          : `${d.turnoverRatio.toFixed(2)}x`
      );
  }, [topTurnoverItems, turnoverWidth, isDark, focusMode, anomalyDetectionEnabled, anomalyReport]);

  // 3. D3 Daily Profit Margins (Bars for Gross Profit + Line for Margin % + Anomaly Rings)
  useEffect(() => {
    const svgEl = marginSvgRef.current;
    if (!svgEl) return;
    const series = data.salesTrendSeries;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const height = focusMode === 'MARGINS' ? 280 : 190;
    const margin = { top: 18, right: 20, bottom: 28, left: 44 };
    const innerWidth = Math.max(160, marginWidth - margin.left - margin.right);
    const innerHeight = Math.max(84, height - margin.top - margin.bottom);

    svg.attr('viewBox', `0 0 ${marginWidth} ${height}`).attr('height', height);
    if (series.length === 0) return;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xBand = d3
      .scaleBand<string>()
      .domain(series.map((d) => d.date))
      .range([0, innerWidth])
      .padding(0.32);

    const maxProfit = Math.max(10, d3.max(series, (d) => Math.max(0, d.grossProfit)) || 10);
    const yProfitScale = d3.scaleLinear().domain([0, maxProfit * 1.15]).nice().range([innerHeight, 0]);

    const minMargin = Math.min(0, d3.min(series, (d) => d.profitMarginPct) || 0);
    const maxMargin = Math.max(40, Math.min(100, (d3.max(series, (d) => d.profitMarginPct) || 30) * 1.2));
    const yMarginScale = d3.scaleLinear().domain([minMargin, maxMargin]).nice().range([innerHeight, 0]);

    const gridColor = isDark ? '#1e293b' : '#f1f5f9';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const axisStroke = isDark ? '#334155' : '#e2e8f0';

    g.append('g')
      .call(
        d3
          .axisLeft(yMarginScale)
          .ticks(4)
          .tickSize(-innerWidth)
          .tickFormat((v) => `${Number(v).toFixed(0)}%`)
      )
      .call((sel) => {
        sel.select('.domain').remove();
        sel.selectAll('.tick line').attr('stroke', gridColor).attr('stroke-dasharray', '3,3');
        sel
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '10px')
          .style('font-family', 'ui-monospace, SFMono-Regular, monospace');
      });

    const tickStride = Math.max(1, Math.ceil(series.length / 6));
    const tickValues = series
      .filter((_, idx) => idx % tickStride === 0 || idx === series.length - 1)
      .map((d) => d.date);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xBand)
          .tickValues(tickValues)
          .tickFormat((d) => String(d).slice(5))
      )
      .call((sel) => {
        sel.select('.domain').attr('stroke', axisStroke);
        sel.selectAll('line').attr('stroke', axisStroke);
        sel
          .selectAll('text')
          .attr('fill', textColor)
          .style('font-size', '10px')
          .style('font-family', 'ui-monospace, SFMono-Regular, monospace');
      });

    // Subtle gross profit bars
    g.selectAll('rect.profit-bar')
      .data(series)
      .enter()
      .append('rect')
      .attr('class', 'profit-bar')
      .attr('x', (d) => xBand(d.date) ?? 0)
      .attr('y', (d) => yProfitScale(Math.max(0, d.grossProfit)))
      .attr('width', Math.min(36, xBand.bandwidth()))
      .attr('transform', () => {
        const bw = xBand.bandwidth();
        const capped = Math.min(36, bw);
        return bw > capped ? `translate(${(bw - capped) / 2}, 0)` : '';
      })
      .attr('height', (d) => Math.max(2, innerHeight - yProfitScale(Math.max(0, d.grossProfit))))
      .attr('rx', 4)
      .attr('fill', (d) =>
        anomalyDetectionEnabled && anomalyReport.marginAnomalyDates.includes(d.date)
          ? 'rgba(245, 158, 11, 0.32)'
          : isDark
          ? 'rgba(16, 185, 129, 0.22)'
          : 'rgba(16, 185, 129, 0.18)'
      )
      .style('cursor', 'pointer')
      .on('mouseenter', (_ev, d) => setHoveredMarginPoint(d))
      .on('mouseleave', () => setHoveredMarginPoint(null));

    // Margin % Trend Line
    if (series.length > 1) {
      const marginLine = d3
        .line<DailyPerformancePoint>()
        .x((d) => (xBand(d.date) ?? 0) + xBand.bandwidth() / 2)
        .y((d) => yMarginScale(d.profitMarginPct))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(series)
        .attr('fill', 'none')
        .attr('stroke', '#059669')
        .attr('stroke-width', 2.25)
        .attr('d', marginLine);
    }

    // Anomaly outer rings when Anomaly Detection toggle is ON
    if (anomalyDetectionEnabled) {
      const anomalyPoints = series.filter((d) => anomalyReport.marginAnomalyDates.includes(d.date));
      g.selectAll('circle.anomaly-halo')
        .data(anomalyPoints)
        .enter()
        .append('circle')
        .attr('class', 'anomaly-halo')
        .attr('cx', (d) => (xBand(d.date) ?? 0) + xBand.bandwidth() / 2)
        .attr('cy', (d) => yMarginScale(d.profitMarginPct))
        .attr('r', 10)
        .attr('fill', 'rgba(239, 68, 68, 0.16)')
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 1.75)
        .attr('stroke-dasharray', '2,2');
    }

    // Data points + concise labels for sparse series + generous hit targets
    g.selectAll('circle.margin-dot')
      .data(series)
      .enter()
      .append('circle')
      .attr('class', 'margin-dot')
      .attr('cx', (d) => (xBand(d.date) ?? 0) + xBand.bandwidth() / 2)
      .attr('cy', (d) => yMarginScale(d.profitMarginPct))
      .attr('r', (d) =>
        anomalyDetectionEnabled && anomalyReport.marginAnomalyDates.includes(d.date) ? 6 : 4.5
      )
      .attr('fill', (d) => {
        if (anomalyDetectionEnabled && anomalyReport.marginAnomalyDates.includes(d.date)) {
          return '#ef4444';
        }
        return d.profitMarginPct >= 20 ? '#059669' : d.profitMarginPct >= 10 ? '#d97706' : '#dc2626';
      })
      .attr('stroke', isDark ? '#0f172a' : '#ffffff')
      .attr('stroke-width', 1.75);

    if (series.length <= 3) {
      g.selectAll('text.margin-lbl')
        .data(series)
        .enter()
        .append('text')
        .attr('x', (d) => (xBand(d.date) ?? 0) + xBand.bandwidth() / 2)
        .attr('y', (d) => Math.max(10, yMarginScale(d.profitMarginPct) - 9))
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#6ee7b7' : '#047857')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('font-family', 'ui-monospace, SFMono-Regular, monospace')
        .text((d) => `${d.profitMarginPct.toFixed(1)}%`);
    }

    g.selectAll('circle.margin-hit')
      .data(series)
      .enter()
      .append('circle')
      .attr('cx', (d) => (xBand(d.date) ?? 0) + xBand.bandwidth() / 2)
      .attr('cy', (d) => yMarginScale(d.profitMarginPct))
      .attr('r', 14)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', (_ev, d) => setHoveredMarginPoint(d))
      .on('mouseleave', () => setHoveredMarginPoint(null));
  }, [data.salesTrendSeries, marginWidth, isDark, focusMode, anomalyDetectionEnabled, anomalyReport]);

  const showSales = focusMode === 'ALL' || focusMode === 'SALES';
  const showTurnover = focusMode === 'ALL' || focusMode === 'TURNOVER';
  const showMargins = focusMode === 'ALL' || focusMode === 'MARGINS';

  return (
    <section
      data-testid="d3-performance-dashboard-widget"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4"
    >
      {/* Header & Focus Segmented Controls + Anomaly Detection Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {language === 'ar'
                ? 'لوحة مؤشرات الأداء التنفيذية (D3.js Analytics)'
                : 'Performance Dashboard (D3.js Live Analytics)'}
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'رصد تفاعلي لاتجاهات المبيعات اليومية، معدل دوران المخزون، وهوامش الربح المحققة'
              : 'Interactive D3.js telemetry for real-time sales trends, inventory turnover, and daily profit margins'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Predictive AI Anomaly Detection Toggle */}
          <button
            type="button"
            data-testid="perf-anomaly-detection-toggle"
            aria-pressed={anomalyDetectionEnabled}
            onClick={() => setAnomalyDetectionEnabled((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
              anomalyDetectionEnabled
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              {language === 'ar'
                ? 'كشف الشذوذ التنبؤي (Anomaly Detection)'
                : 'Anomaly Detection (AI)'}
            </span>
            <span
              data-testid="perf-anomaly-count-badge"
              className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] ${
                anomalyDetectionEnabled
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {anomalyReport.totalAnomalies}
            </span>
          </button>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(
              [
                { id: 'ALL', ar: 'عرض الكل', en: 'All Views' },
                { id: 'SALES', ar: 'اتجاهات المبيعات', en: 'Sales Trends' },
                { id: 'TURNOVER', ar: 'دوران المخزون', en: 'Turnover' },
                { id: 'MARGINS', ar: 'هوامش الربح', en: 'Daily Margins' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`perf-focus-${tab.id.toLowerCase()}`}
                onClick={() => setFocusMode(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  focusMode === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {language === 'ar' ? tab.ar : tab.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Predictive AI Anomaly Detection Insights Panel */}
      {anomalyDetectionEnabled && (
        <div
          data-testid="perf-anomaly-insights-panel"
          className="rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                {language === 'ar'
                  ? `تحليل الذكاء التنبؤي للتحولات غير المعتادة (${anomalyReport.totalAnomalies} تنبيه مكتشف)`
                  : `Predictive AI Anomaly Analysis (${anomalyReport.totalAnomalies} shifts highlighted)`}
              </span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-mono">
              Z-Score &amp; Rolling Margin / Velocity Baseline
            </span>
          </div>

          {anomalyReport.anomalies.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {language === 'ar'
                ? 'جميع مؤشرات هوامش الربح ودوران المخزون ضمن النطاق الطبيعي المتوقع.'
                : 'All profit margin and inventory turnover metrics are operating within normal predictive bounds.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {anomalyReport.anomalies.slice(0, 6).map((anom) => (
                <div
                  key={anom.anomalyId}
                  data-testid={`perf-anomaly-card-${anom.referenceKey}`}
                  className="rounded-lg bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {language === 'ar' ? anom.labelAr : anom.labelEn}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        anom.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          : anom.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {anom.direction} (Z={anom.zScore})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {language === 'ar' ? anom.aiExplanationAr : anom.aiExplanationEn}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unboxed Typographic Performance Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {language === 'ar' ? 'متوسط المبيعات اليومية' : 'Avg Daily Sales'}
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5" dir="ltr">
            {data.summary.avgDailySales.toLocaleString()} {currency}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {data.summary.totalActiveDays} {language === 'ar' ? 'يوم نشط' : 'active days'} ·{' '}
            {language === 'ar' ? 'ذروة:' : 'Peak:'} {data.summary.peakDaySales.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {language === 'ar' ? 'معدل دوران المخزون' : 'Inventory Turnover'}
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-blue-700 dark:text-blue-400 mt-0.5" dir="ltr">
            {data.summary.overallInventoryTurnover.toFixed(2)}x
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {data.summary.totalUnitsMoved.toLocaleString()}{' '}
            {language === 'ar' ? 'وحدة مباعة' : 'units sold'}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {language === 'ar' ? 'متوسط هامش الربح اليومي' : 'Avg Daily Margin'}
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5" dir="ltr">
            {data.summary.avgProfitMarginPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {language === 'ar' ? 'أعلى هامش:' : 'Peak:'} {data.summary.peakMarginPct.toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {language === 'ar' ? 'مجمل الربح التراكمي' : 'Cumulative Gross Profit'}
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5" dir="ltr">
            {data.summary.totalGrossProfit.toLocaleString()} {currency}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {language === 'ar' ? 'من صافي مبيعات:' : 'Net revenue:'}{' '}
            {data.summary.totalNetSales.toLocaleString()}
          </div>
        </div>
      </div>

      {/* D3 Chart Grid */}
      <div
        className={`grid gap-3.5 ${
          focusMode === 'ALL' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'
        }`}
      >
        {/* Chart 1: Real-Time Sales Trends */}
        {showSales && (
          <div
            data-testid="d3-chart-sales-trends"
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 p-3.5 space-y-2 min-w-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  {language === 'ar'
                    ? 'اتجاهات المبيعات اليومية (Real-Time Sales Trends)'
                    : 'Real-Time Sales Trends'}
                </span>
              </div>

              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {hoveredSalesPoint ? (
                  <span data-testid="d3-sales-hover-readout" className="text-blue-700 dark:text-blue-300 font-semibold">
                    {hoveredSalesPoint.date}: {hoveredSalesPoint.grossSales.toLocaleString()} {currency} (
                    {hoveredSalesPoint.invoicesCount} {language === 'ar' ? 'فاتورة' : 'inv'})
                  </span>
                ) : (
                  <span>
                    {data.salesTrendSeries.length}{' '}
                    {language === 'ar' ? 'نقاط زمنية' : 'data points'}
                  </span>
                )}
              </div>
            </div>

            <div ref={salesContainerRef} dir="ltr" className="w-full min-w-0 overflow-hidden">
              {data.salesTrendSeries.length === 0 ? (
                <div className="h-[220px] flex flex-col items-center justify-center text-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {language === 'ar'
                      ? 'لا توجد فواتير مبيعات ضمن النطاق الزمني المحدد.'
                      : 'No sales invoices recorded in the selected date range.'}
                  </span>
                  {onNavigateToSales && (
                    <button
                      type="button"
                      onClick={onNavigateToSales}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      {language === 'ar' ? 'تسجيل فاتورة مبيعات' : 'Record First Sale'}
                    </button>
                  )}
                </div>
              ) : (
                <svg
                  ref={salesSvgRef}
                  role="img"
                  aria-label="Real-time sales trends D3 chart"
                  className="w-full block overflow-visible"
                />
              )}
            </div>
          </div>
        )}

        {/* Chart 2: Inventory Turnover */}
        {showTurnover && (
          <div
            data-testid="d3-chart-inventory-turnover"
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 p-3.5 space-y-2 min-w-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {language === 'ar'
                    ? 'معدل دوران المخزون للأصناف (Inventory Turnover)'
                    : 'Inventory Turnover by SKU'}
                </span>
              </div>

              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {hoveredTurnoverItem ? (
                  <span data-testid="d3-turnover-hover-readout" className="text-emerald-700 dark:text-emerald-300 font-semibold">
                    {hoveredTurnoverItem.sku}: {hoveredTurnoverItem.turnoverRatio.toFixed(2)}x (
                    {hoveredTurnoverItem.unitsSold} {language === 'ar' ? 'مباع' : 'sold'} /{' '}
                    {hoveredTurnoverItem.currentStock} {language === 'ar' ? 'متاح' : 'stock'})
                  </span>
                ) : (
                  <span>
                    {topTurnoverItems.length} {language === 'ar' ? 'أعلى الأصناف حركة' : 'top SKUs'}
                  </span>
                )}
              </div>
            </div>

            <div ref={turnoverContainerRef} dir="ltr" className="w-full min-w-0 overflow-hidden">
              {topTurnoverItems.length === 0 ? (
                <div className="h-[220px] flex flex-col items-center justify-center text-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {language === 'ar'
                      ? 'لا توجد أصناف مسجلة في المخزون لحساب معدل الدوران.'
                      : 'No inventory items available to calculate turnover.'}
                  </span>
                  {onNavigateToInventory && (
                    <button
                      type="button"
                      onClick={onNavigateToInventory}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      {language === 'ar' ? 'إضافة أصناف المخزون' : 'Open Inventory'}
                    </button>
                  )}
                </div>
              ) : (
                <svg
                  ref={turnoverSvgRef}
                  role="img"
                  aria-label="Inventory turnover D3 bar chart"
                  className="w-full block overflow-visible"
                />
              )}
            </div>
          </div>
        )}

        {/* Chart 3: Daily Profit Margins */}
        {showMargins && (
          <div
            data-testid="d3-chart-profit-margins"
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 p-3.5 space-y-2 min-w-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Percent className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {language === 'ar'
                    ? 'هوامش الربح اليومية وصافي العائد (Daily Profit Margins %)'
                    : 'Daily Profit Margins % & Gross Profit'}
                </span>
              </div>

              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {hoveredMarginPoint ? (
                  <span data-testid="d3-margin-hover-readout" className="text-emerald-700 dark:text-emerald-300 font-semibold">
                    {hoveredMarginPoint.date}: {hoveredMarginPoint.profitMarginPct.toFixed(1)}% ·{' '}
                    {hoveredMarginPoint.grossProfit.toLocaleString()} {currency}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-3 h-3 inline text-emerald-600" />
                    <span>
                      {language === 'ar'
                        ? `المتوسط: ${data.summary.avgProfitMarginPct.toFixed(1)}%`
                        : `Avg: ${data.summary.avgProfitMarginPct.toFixed(1)}%`}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div ref={marginContainerRef} dir="ltr" className="w-full min-w-0 overflow-hidden">
              {data.salesTrendSeries.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar'
                    ? 'سجّل مبيعات لعرض منحنى هامش الربح اليومي.'
                    : 'Record sales to visualize daily profit margins.'}
                </div>
              ) : (
                <svg
                  ref={marginSvgRef}
                  role="img"
                  aria-label="Daily profit margins D3 chart"
                  className="w-full block overflow-visible"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PerformanceDashboardWidget;

