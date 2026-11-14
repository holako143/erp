import React, { useEffect, useRef, useState } from 'react';
import { Activity, Gauge, RotateCcw, X, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  performanceTelemetryStore,
  summarizePerformanceMetrics,
  RenderHealthStatus,
} from '../../core/performanceMonitorEngine';

export const PerformanceMonitorOverlay: React.FC = () => {
  const { activeTab, setActiveTab, language } = useERP();
  const isAr = language === 'ar';

  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState(() => performanceTelemetryStore.getHistory());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navStartRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : 0
  );

  // Subscribe to React.Profiler telemetry store updates
  useEffect(() => {
    const unsubscribe = performanceTelemetryStore.subscribe(() => {
      setHistory({ ...performanceTelemetryStore.getHistory() });
    });
    return unsubscribe;
  }, []);

  // Measure high-precision view switch commit time whenever activeTab changes
  useEffect(() => {
    const t0 = navStartRef.current || (typeof performance !== 'undefined' ? performance.now() : 0);
    const rafId = requestAnimationFrame(() => {
      const now = typeof performance !== 'undefined' ? performance.now() : t0 + 1.5;
      const elapsed = Math.max(0.4, Math.min(120, now - t0));
      const existing = performanceTelemetryStore.getHistory()[activeTab];
      if (!existing) {
        performanceTelemetryStore.recordSample(activeTab, elapsed, 'mount');
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [activeTab]);

  // Collapse panel on outside click or Escape key
  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setIsExpanded(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const summary = summarizePerformanceMetrics(history, activeTab);
  const { activeViewMetric, allMetrics, overallAvgMs, slowestView, bottleneckCount } = summary;

  const getStatusBadgeClasses = (status: RenderHealthStatus) => {
    if (status === 'BOTTLENECK') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (status === 'WARNING') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const getStatusDotClasses = (status: RenderHealthStatus) => {
    if (status === 'BOTTLENECK') return 'bg-rose-500';
    if (status === 'WARNING') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusText = (status: RenderHealthStatus) => {
    if (status === 'BOTTLENECK') return isAr ? 'بطء (>50ms)' : 'Slow (>50ms)';
    if (status === 'WARNING') return isAr ? 'متوسط' : 'Moderate';
    return isAr ? 'مثالي 60fps' : 'Optimal';
  };

  return (
    <div
      ref={containerRef}
      dir={isAr ? 'rtl' : 'ltr'}
      data-testid="perf-monitor-overlay"
      className="fixed bottom-11 start-4 z-40 select-none print:hidden"
    >
      {/* Expanded Corner Diagnostic Popover (Unified Lumina POS Light Theme) */}
      {isExpanded && (
        <div
          data-testid="perf-monitor-panel"
          className="mb-2 w-80 sm:w-88 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-3.5 text-slate-800 space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Gauge className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {isAr ? 'مراقب سرعة وأداء الواجهات' : 'View Render Performance Monitor'}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {isAr
                    ? 'قياس زمن الرندر الفعلي (ms) لرصد أي بطء'
                    : 'Real-time view render latency & bottleneck tracker'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="perf-monitor-reset-btn"
                onClick={() => performanceTelemetryStore.reset()}
                title={isAr ? 'تصفير القياسات' : 'Reset metrics'}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                data-testid="perf-monitor-minimize-btn"
                onClick={() => setIsExpanded(false)}
                title={isAr ? 'تصغير' : 'Minimize'}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Current Active View KPI Strip */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? activeViewMetric.labelAr : activeViewMetric.labelEn}</span>
              </span>
              <span
                data-testid="perf-monitor-active-status"
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClasses(
                  activeViewMetric.status
                )}`}
              >
                {getStatusText(activeViewMetric.status)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-1.5 rounded-lg bg-white border border-slate-200/70">
                <div className="text-[9px] text-slate-400">
                  {isAr ? 'آخر رندر' : 'Last Render'}
                </div>
                <div
                  data-testid="perf-monitor-last-ms"
                  className="font-mono text-xs font-bold text-slate-900"
                  dir="ltr"
                >
                  {activeViewMetric.lastRenderMs} ms
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-white border border-slate-200/70">
                <div className="text-[9px] text-slate-400">
                  {isAr ? 'المتوسط' : 'Avg Render'}
                </div>
                <div
                  data-testid="perf-monitor-avg-ms"
                  className="font-mono text-xs font-bold text-slate-900"
                  dir="ltr"
                >
                  {activeViewMetric.avgRenderMs} ms
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-white border border-slate-200/70">
                <div className="text-[9px] text-slate-400">
                  {isAr ? 'أعلى قمة' : 'Peak Max'}
                </div>
                <div
                  data-testid="perf-monitor-max-ms"
                  className="font-mono text-xs font-bold text-slate-900"
                  dir="ltr"
                >
                  {activeViewMetric.maxRenderMs} ms
                </div>
              </div>
            </div>
          </div>

          {/* Per-View Render Breakdown List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-0.5">
              <span>{isAr ? 'أداء الواجهات المفحوصة:' : 'Tracked Major Views:'}</span>
              <span className="font-mono" dir="ltr">
                Avg: {overallAvgMs} ms
              </span>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1 pe-0.5">
              {allMetrics.map((m) => {
                const isCurrent = m.viewId === activeTab;
                const barWidthPct = Math.min(100, Math.max(8, (m.lastRenderMs / 32) * 100));
                return (
                  <button
                    key={m.viewId}
                    type="button"
                    data-testid={`perf-view-row-${m.viewId}`}
                    onClick={() => {
                      navStartRef.current =
                        typeof performance !== 'undefined' ? performance.now() : 0;
                      setActiveTab(m.viewId);
                    }}
                    className={`w-full p-2 rounded-xl border text-start transition cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotClasses(
                            m.status
                          )}`}
                        />
                        <span className="font-bold truncate">
                          {isAr ? m.labelAr : m.labelEn}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]" dir="ltr">
                        <span className="font-bold">{m.lastRenderMs} ms</span>
                        <span className={isCurrent ? 'text-slate-300' : 'text-slate-400'}>
                          ({m.renderCount}x)
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-full h-1 rounded-full overflow-hidden mt-1.5 ${
                        isCurrent ? 'bg-slate-700' : 'bg-slate-100'
                      }`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          m.status === 'BOTTLENECK'
                            ? 'bg-rose-500'
                            : m.status === 'WARNING'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${barWidthPct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottleneck / Health Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            {bottleneckCount > 0 && slowestView ? (
              <span className="flex items-center gap-1 text-rose-600 font-bold">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>
                  {isAr
                    ? `أبطأ واجهة: ${slowestView.labelAr} (${slowestView.maxRenderMs}ms)`
                    : `Slowest: ${slowestView.labelEn} (${slowestView.maxRenderMs}ms)`}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>
                  {isAr
                    ? 'جميع الواجهات تعمل بسرعة فائقة بدون اختناق'
                    : 'All views rendering at optimal 60fps speed'}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Compact Corner Pill Trigger */}
      <button
        type="button"
        data-testid="perf-monitor-toggle-btn"
        onClick={() => setIsExpanded((prev) => !prev)}
        title={
          isAr
            ? 'مراقب أداء وسرعة الواجهات (انقر لعرض تفاصيل زمن الرندر)'
            : 'View Render Performance Monitor (Click to inspect render latencies)'
        }
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] shadow-md transition cursor-pointer ${
          isExpanded
            ? 'bg-slate-900 border-slate-900 text-white'
            : 'bg-white/95 hover:bg-white border-slate-200/90 text-slate-700'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotClasses(
            activeViewMetric.status
          )}`}
        />
        <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="font-bold truncate max-w-[110px]">
          {isAr ? activeViewMetric.labelAr : activeViewMetric.labelEn}
        </span>
        <span
          data-testid="perf-monitor-pill-ms"
          className={`font-mono font-bold px-1.5 py-0.2 rounded-full text-[10px] ${
            isExpanded
              ? 'bg-slate-800 text-emerald-300'
              : 'bg-slate-100 text-slate-900'
          }`}
          dir="ltr"
        >
          {activeViewMetric.lastRenderMs} ms
        </span>
      </button>
    </div>
  );
};
