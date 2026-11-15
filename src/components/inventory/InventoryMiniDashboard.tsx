import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  Package,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { InventoryMiniDashboardAnalytics } from '../../core/inventoryEngine';

export interface InventoryMiniDashboardProps {
  analytics: InventoryMiniDashboardAnalytics;
  currency: string;
  onSelectSkuFilter: (sku: string) => void;
}

const InventoryMiniDashboard: React.FC<InventoryMiniDashboardProps> = React.memo(
  ({ analytics, currency, onSelectSkuFilter }) => {
    const [expandedChart, setExpandedChart] = useState<'BOTH' | 'DEMAND' | 'STOCK'>('BOTH');

    return (
      <div
        data-testid="inventory-mini-dashboard"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 p-4 shadow-2xs space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                لوحة التحكم المصغرة للمخزون واتخاذ القرار السريع
              </h2>
              <p className="text-[11px] text-slate-500">
                تحليل بياني لحظي لأكثر الأصناف طلباً ومستويات المخزون الحالية مقابل حد إعادة الطلب
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
              <div className="text-[10px] text-slate-500 font-medium">إجمالي الوحدات</div>
              <div
                className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm"
                dir="ltr"
              >
                {analytics.totalUnitsInStock.toLocaleString()} PCS
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
              <div className="text-[10px] text-slate-500 font-medium">قيمة المخزون بالتكلفة</div>
              <div
                className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm"
                dir="ltr"
              >
                {analytics.totalInventoryValue.toLocaleString()} {currency}
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
              <div className="text-[10px] text-slate-500 font-medium">الأعلى طلباً ودوراناً</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[145px]">
                {analytics.topPerformerNameAr}
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800">
              <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                تحتاج إعادة طلب
              </div>
              <div className="font-mono font-bold text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
                {analytics.lowStockItemsCount} أصناف
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Recharts Chart 1: Top Demanded Items vs Current Stock */}
          {expandedChart !== 'STOCK' && (
            <div
              data-testid="inventory-chart-top-demanded"
              className={`p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2 ${
                expandedChart === 'DEMAND' ? 'lg:col-span-2' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>أكثر الأصناف طلباً ومبيعات مقارنة بالرصيد المتاح</span>
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200/70 px-2 py-0.5 rounded-full">
                    تفاعلي مباشر
                  </span>
                  <button
                    type="button"
                    data-testid="btn-resize-demand-chart"
                    onClick={() =>
                      setExpandedChart((prev) => (prev === 'DEMAND' ? 'BOTH' : 'DEMAND'))
                    }
                    className="p-1 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title={expandedChart === 'DEMAND' ? 'استعادة العرض المزدوج' : 'تكبير الرسم البياني'}
                  >
                    {expandedChart === 'DEMAND' ? (
                      <Minimize2 className="w-3 h-3" />
                    ) : (
                      <Maximize2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
              <div className={`${expandedChart === 'DEMAND' ? 'h-60' : 'h-44'} w-full`} dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={analytics.topDemandedItems}
                    margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="sku"
                      tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                      formatter={(val: any, name: any) => [
                        `${val} وحدة`,
                        name === 'demandedQty'
                          ? 'الطلب والمبيعات'
                          : name === 'currentStock'
                          ? 'الرصيد المتاح'
                          : 'حد إعادة الطلب',
                      ]}
                      labelFormatter={(label: any, payload: any) =>
                        payload?.[0]?.payload?.nameAr || label
                      }
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                      formatter={(val) =>
                        val === 'demandedQty'
                          ? 'الطلب والمبيعات'
                          : val === 'currentStock'
                          ? 'الرصيد الفعلي المتاح'
                          : 'حد الطلب الآمن'
                      }
                    />
                    <Bar
                      dataKey="demandedQty"
                      name="demandedQty"
                      fill="#0f172a"
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />
                    <Bar
                      dataKey="currentStock"
                      name="currentStock"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />
                    <Line
                      type="monotone"
                      dataKey="reorderPoint"
                      name="reorderPoint"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#f59e0b' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recharts Chart 2: Current Stock Levels vs Reorder Point */}
          {expandedChart !== 'DEMAND' && (
            <div
              data-testid="inventory-chart-stock-levels"
              className={`p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2 ${
                expandedChart === 'STOCK' ? 'lg:col-span-2' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>مستويات المخزون الحالية مقابل حد إعادة الطلب الآمن</span>
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200/70 px-2 py-0.5 rounded-full">
                    انقر على أي عمود لتصفية الصنف
                  </span>
                  <button
                    type="button"
                    data-testid="btn-resize-stock-chart"
                    onClick={() =>
                      setExpandedChart((prev) => (prev === 'STOCK' ? 'BOTH' : 'STOCK'))
                    }
                    className="p-1 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title={expandedChart === 'STOCK' ? 'استعادة العرض المزدوج' : 'تكبير الرسم البياني'}
                  >
                    {expandedChart === 'STOCK' ? (
                      <Minimize2 className="w-3 h-3" />
                    ) : (
                      <Maximize2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
              <div className={`${expandedChart === 'STOCK' ? 'h-60' : 'h-44'} w-full`} dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.stockLevelsItems}
                    margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="sku"
                      tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                      formatter={(val: any, name: any) => [
                        `${val} وحدة`,
                        name === 'stockQty' ? 'الرصيد الفعلي الحالي' : 'حد إعادة الطلب الآمن',
                      ]}
                      labelFormatter={(label: any, payload: any) =>
                        payload?.[0]?.payload?.nameAr || label
                      }
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                      formatter={(val) =>
                        val === 'stockQty' ? 'الرصيد الفعلي الحالي' : 'حد إعادة الطلب الآمن'
                      }
                    />
                    <Bar
                      dataKey="stockQty"
                      name="stockQty"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                      onClick={(data: any) => {
                        if (data?.sku) {
                          onSelectSkuFilter(String(data.sku));
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {analytics.stockLevelsItems.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.healthStatus === 'OUT_OF_STOCK'
                              ? '#e11d48'
                              : entry.healthStatus === 'REORDER_NOW'
                              ? '#d97706'
                              : '#1d4ed8'
                          }
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="reorderPoint"
                      name="reorderPoint"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                      barSize={14}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

InventoryMiniDashboard.displayName = 'InventoryMiniDashboard';
export default InventoryMiniDashboard;
