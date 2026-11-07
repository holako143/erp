import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Download,
  MessageSquare,
  Network,
  ArrowRightLeft,
  Server,
  Activity,
  CheckCheck,
} from 'lucide-react';
import { IndustryType, ElectronicsSubCategory } from '../types/erp';
import { generateValidEAN13 } from '../core/barcodeEngine';
import { parseBulkProductsCSV } from '../core/inventoryEngine';
import { IndustryChameleonPanel } from '../components/common/IndustryChameleonPanel';

const SAMPLE_BULK_CSV = `SKU,Barcode,NameAr,NameEn,CostPrice,SalePrice,StockQty,UOM,ReorderPoint,Sector
GROC-881,2110045012508,جبن قشقوان هنغاري موزون (كجم),Hungarian Kashkaval Cheese (KG),38,56,45,KG,10,grocery
ELEC-992,6281042009110,شاحن جداري فائق السرعة 100W GaN,Ultra Fast 100W GaN Charger,85,149,30,PCS,8,electronics
REST-774,6281042009127,حبوب قهوة مختصة إثيوبي ييرغاشيف 1 كجم,Ethiopian Yirgacheffe Specialty Beans 1KG,62,98,25,KG,6,restaurant
PHRM-663,6281042009134,جهاز قياس ضغط الدم الرقمي الذكي,Smart Digital Blood Pressure Monitor,115,195,18,PCS,5,pharmacy`;

export const InventoryView: React.FC = () => {
  const {
    products,
    addProduct,
    importBulkProductsCSV,
    categories,
    currentWarehouse,
    currency,
    language,
    currentTenant,
    activeIndustry,
    hasPermission,
    masterSystemConfig,
    openQuickSendModal,
    openCrossBranchModal,
    branchNodes,
    interBranchTransfers,
    advanceBranchTransfer,
    formatCurrency,
  } = useERP();

  const [inventorySubTab, setInventorySubTab] = useState<'ITEMS' | 'BRANCH_TRANSFERS'>('ITEMS');
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null);

  const isSingleActivityLocked = masterSystemConfig.industryLockMode === 'SINGLE_LOCKED';
  const showCostPrice = masterSystemConfig.uiElementsVisibility.showCostPriceInInventory;
  const showExportImport = masterSystemConfig.uiElementsVisibility.showExportImportButtons;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState<string>(SAMPLE_BULK_CSV);
  const [postOpeningJournal, setPostOpeningJournal] = useState<boolean>(true);
  const [importBanner, setImportBanner] = useState<string | null>(null);
  const [productModalError, setProductModalError] = useState<string | null>(null);

  // Form State for new product
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState(generateValidEAN13());
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [productIndustry, setProductIndustry] = useState<IndustryType>(activeIndustry);
  const [uom, setUom] = useState('PCS');
  const [costPrice, setCostPrice] = useState(100);
  const [salePrice, setSalePrice] = useState(150);
  const [stockQty, setStockQty] = useState(20);
  const [reorderPoint, setReorderPoint] = useState(5);
  const [binLocation, setBinLocation] = useState('ZA-01-S1-B01');
  const [warrantyMonths, setWarrantyMonths] = useState<number>(24);
  const [subCategory, setSubCategory] = useState<ElectronicsSubCategory>('SOLAR_PANEL');
  const [powerRatingWatts, setPowerRatingWatts] = useState<number>(585);
  const [batteryCapacitySpec, setBatteryCapacitySpec] = useState<string>('');
  const [voltageSpec, setVoltageSpec] = useState<string>('48V DC');
  const [screenSizeSpec, setScreenSizeSpec] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('2027-09-30');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(12);

  const liveBulkPreview = parseBulkProductsCSV(
    bulkCsvText,
    currentTenant.id,
    currentWarehouse.id,
    categories[0]?.id || 'cat-1',
    activeIndustry
  );

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameAr.includes(searchQuery) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const effectiveFilter = isSingleActivityLocked
      ? masterSystemConfig.lockedIndustry
      : selectedIndustryFilter;
    const matchesIndustry =
      effectiveFilter === 'all' || p.industry === effectiveFilter;
    return matchesSearch && matchesCategory && matchesIndustry;
  });

  const handleConfirmBulkImport = () => {
    const res = importBulkProductsCSV(bulkCsvText, postOpeningJournal);
    if (res.importedCount > 0) {
      setIsBulkModalOpen(false);
      setImportBanner(
        `تم استيراد ${res.importedCount} أصناف بنجاح وإثبات رصيد افتتاحي بقيمة ${res.totalOpeningValuation.toLocaleString()} ${currency} في الأستاذ العام!`
      );
      setTimeout(() => setImportBanner(null), 5000);
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setBulkCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setProductModalError(null);
    if (!name.trim() || !sku.trim()) return;
    const cleanSku = sku.trim().toUpperCase();
    const cleanBarcode = barcode.trim();

    if (
      products.some(
        (p) => p.sku.toUpperCase() === cleanSku || p.barcode === cleanBarcode
      )
    ) {
      const msg = `تنبيه منع التكرار: كود الصنف (${cleanSku}) أو الباركود (${cleanBarcode}) مسجل مسبقاً في قاعدة البيانات!`;
      setProductModalError(msg);
      setImportBanner(msg);
      return;
    }

    if (Number(costPrice) < 0 || Number(salePrice) <= 0 || Number(stockQty) < 0) {
      const msg = 'خطأ في المدخلات: يجب أن يكون سعر البيع أكبر من صفر وأن تكون التكلفة والرصيد الافتتاحي غير سالبة!';
      setProductModalError(msg);
      setImportBanner(msg);
      return;
    }

    const openingVal = Math.round((Number(stockQty) || 0) * (Number(costPrice) || 0) * 100) / 100;

    addProduct({
      tenantId: currentTenant.id,
      sku: cleanSku,
      barcode: cleanBarcode,
      name: name.trim(),
      nameAr: nameAr.trim() || name.trim(),
      categoryId,
      industry: productIndustry,
      uom,
      costPrice: Number(costPrice) || 0,
      salePrice: Number(salePrice) || 0,
      taxRate: 0.15,
      stockQty: Number(stockQty) || 0,
      minStock: Math.floor(reorderPoint / 2),
      maxStock: reorderPoint * 5,
      reorderPoint: Number(reorderPoint) || 5,
      warehouseId: currentWarehouse.id,
      binLocation,
      hasSerials: productIndustry === 'electronics',
      hasBatches: productIndustry === 'pharmacy' || productIndustry === 'grocery',
      warrantyMonths: productIndustry === 'electronics' ? warrantyMonths : undefined,
      subCategory: productIndustry === 'electronics' ? subCategory : undefined,
      powerRatingWatts:
        productIndustry === 'electronics' && powerRatingWatts > 0 ? powerRatingWatts : undefined,
      batteryCapacitySpec:
        productIndustry === 'electronics' && batteryCapacitySpec.trim()
          ? batteryCapacitySpec.trim()
          : undefined,
      voltageSpec:
        productIndustry === 'electronics' && voltageSpec.trim() ? voltageSpec.trim() : undefined,
      screenSizeSpec:
        productIndustry === 'electronics' && screenSizeSpec.trim()
          ? screenSizeSpec.trim()
          : undefined,
      expiryDate:
        productIndustry === 'pharmacy' || productIndustry === 'grocery'
          ? expiryDate
          : undefined,
      prepTimeMinutes: productIndustry === 'restaurant' ? prepTimeMinutes : undefined,
      isActive: true,
    });

    setIsAddModalOpen(false);
    setImportBanner(
      `تم إضافة الصنف (${nameAr.trim() || name.trim()} - ${cleanSku}) بنجاح${
        openingVal > 0
          ? ` وترحيل قيد رصيد مخزون افتتاحي بقيمة ${openingVal.toLocaleString()} ${currency} في الأستاذ العام`
          : ''
      }!`
    );
    setName('');
    setNameAr('');
    setSku('');
    setBarcode(generateValidEAN13());
  };

  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Name (AR)',
      'Name (EN)',
      'Sector',
      'Bin Location',
      'Cost (WAC)',
      'Sale Price',
      'Stock Qty',
      'UOM',
      'Reorder Point',
    ];
    const rows = filteredProducts.map((p) => [
      p.sku,
      p.barcode,
      `"${p.nameAr.replace(/"/g, '""')}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      p.industry || 'general',
      p.binLocation || 'ZA-01',
      p.costPrice,
      p.salePrice,
      p.stockQty,
      p.uom,
      p.reorderPoint,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `RLM_Inventory_${currentTenant.code}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const industryLabelAr: Record<string, string> = {
    electronics: 'إلكترونيات وطاقة شمسية وبطاريات',
    general: 'عام / صناعي',
    restaurant: 'مطاعم وكافيهات',
    grocery: 'بقالة وسوبرماركت',
    pharmacy: 'صيدلية وطبي',
    contracting: 'مقاولات ومشاريع',
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {importBanner && (
        <div
          data-testid="bulk-import-banner"
          className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-700" />
            <span>
              {language === 'ar'
                ? 'إدارة المستودعات والمخزون والأصناف (WMS)'
                : 'Inventory Management & WMS'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            يدعم الاستيراد الجماعي Excel/CSV، تتبع الأرقام التسلسلية والضمان، والتشغيلات وتواريخ الصلاحية FEFO، وأصناف الميزان الإلكتروني
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="inventory-whatsapp-alert-btn"
            onClick={() =>
              openQuickSendModal({
                channel: 'WHATSAPP',
                category: 'LOW_STOCK_ALERT',
              })
            }
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>إشعار النواقص واتساب / SMS</span>
          </button>

          {hasPermission('canCreate') && showExportImport && (
            <button
              type="button"
              data-testid="open-bulk-import-btn"
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>استيراد جماعي Excel/CSV</span>
            </button>
          )}

          {hasPermission('canExport') && showExportImport && (
            <button
              type="button"
              data-testid="export-inventory-csv-btn"
              onClick={handleExportCSV}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3.5 py-2 rounded-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>تصدير Excel/CSV</span>
            </button>
          )}

          {hasPermission('canCreate') && (
            <button
              type="button"
              data-testid="add-product-modal-btn"
              onClick={() => {
                setProductModalError(null);
                setBarcode(generateValidEAN13());
                setProductIndustry(activeIndustry);
                setIsAddModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة صنف جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          type="button"
          data-testid="subtab-inventory-items"
          onClick={() => setInventorySubTab('ITEMS')}
          className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
            inventorySubTab === 'ITEMS'
              ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="w-4 h-4 text-emerald-600" />
          <span>سجل الأصناف والمستودع الرئيسي ({products.length})</span>
        </button>

        <button
          type="button"
          data-testid="subtab-branch-transfers"
          onClick={() => setInventorySubTab('BRANCH_TRANSFERS')}
          className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
            inventorySubTab === 'BRANCH_TRANSFERS'
              ? 'border-indigo-600 text-indigo-800 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Network className="w-4 h-4 text-indigo-600" />
          <span>شبكة الفروع والتحويلات اللحظية LAN Sync ({branchNodes.length} فروع متصلة)</span>
          {interBranchTransfers.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white font-mono">
              {interBranchTransfers.length}
            </span>
          )}
        </button>
      </div>

      {inventorySubTab === 'ITEMS' && (
        <>
          {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الكود SKU، أو الباركود..."
            className="w-full text-xs p-2 ps-8 bg-slate-50 border border-slate-200 rounded-md outline-hidden focus:border-emerald-600"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2.5" />
        </div>

        {/* Sector Filter Buttons */}
        {!isSingleActivityLocked ? (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {[
              { id: 'all', label: 'كل القطاعات' },
              { id: 'electronics', label: 'الإلكترونيات والطاقة الشمسية والبطاريات' },
              { id: 'general', label: 'عام / صناعي' },
              { id: 'restaurant', label: 'المطاعم' },
              { id: 'grocery', label: 'البقالة' },
              { id: 'pharmacy', label: 'الصيدلية' },
            ].map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedIndustryFilter(sec.id)}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  selectedIndustryFilter === sec.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-md">
            النشاط المعتمد للمستودع: {industryLabelAr[masterSystemConfig.lockedIndustry]}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-md outline-hidden font-medium text-slate-700"
          >
            <option value="all">جميع التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {language === 'ar' ? c.nameAr : c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-md border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-start">الصنف والمواصفات الهندسية</th>
                <th className="py-3 px-4 text-start">القطاع والضمان</th>
                <th className="py-3 px-4 text-start">الباركود</th>
                {showCostPrice && <th className="py-3 px-4 text-end">التكلفة (WAC)</th>}
                <th className="py-3 px-4 text-end">سعر البيع</th>
                <th className="py-3 px-4 text-center">الرصيد المتاح</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">الربط والشبكة (LAN)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isReorder = p.stockQty <= p.reorderPoint;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {language === 'ar' ? p.nameAr : p.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span>
                          SKU:{' '}
                          <span className="font-mono tabular-nums text-slate-800 font-semibold" dir="ltr">
                            {p.sku}
                          </span>
                        </span>
                        <span>·</span>
                        <span>
                          الموقع:{' '}
                          <span className="font-mono tabular-nums text-slate-700" dir="ltr">
                            {p.binLocation || 'ZA-01'}
                          </span>
                        </span>
                      </div>
                      {(p.powerRatingWatts || p.batteryCapacitySpec || p.voltageSpec || p.screenSizeSpec) && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {p.powerRatingWatts && (
                            <span
                              className="text-[10px] font-mono tabular-nums bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded-xs font-semibold"
                              dir="ltr"
                            >
                              {p.powerRatingWatts >= 1000
                                ? `${(p.powerRatingWatts / 1000).toFixed(1).replace('.0', '')} kW`
                                : `${p.powerRatingWatts} W`}
                            </span>
                          )}
                          {p.batteryCapacitySpec && (
                            <span
                              className="text-[10px] font-mono tabular-nums bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded-xs font-semibold"
                              dir="ltr"
                            >
                              {p.batteryCapacitySpec}
                            </span>
                          )}
                          {p.voltageSpec && (
                            <span
                              className="text-[10px] font-mono tabular-nums bg-slate-50 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-xs"
                              dir="ltr"
                            >
                              {p.voltageSpec}
                            </span>
                          )}
                          {p.screenSizeSpec && (
                            <span
                              className="text-[10px] font-mono tabular-nums bg-sky-50 text-sky-900 border border-sky-200 px-1.5 py-0.5 rounded-xs font-semibold"
                              dir="ltr"
                            >
                              {p.screenSizeSpec}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block bg-slate-100 text-slate-800 border border-slate-200 font-bold px-2 py-0.5 rounded-xs text-[10px]">
                        {industryLabelAr[p.industry || 'general']}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.warrantyMonths && (
                          <span className="text-[10px] bg-teal-50 text-teal-900 border border-teal-200 px-1.5 py-0.5 rounded-xs font-bold">
                            ضمان <span className="font-mono tabular-nums" dir="ltr">{p.warrantyMonths}</span> شهر
                          </span>
                        )}
                        {p.expiryDate && (
                          <span className="text-[10px] bg-rose-50 text-rose-900 border border-rose-200 px-1.5 py-0.5 rounded-xs font-bold">
                            صلاحية: <span className="font-mono tabular-nums" dir="ltr">{p.expiryDate}</span>
                          </span>
                        )}
                        {p.prepTimeMinutes && (
                          <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded-xs font-bold">
                            تحضير <span className="font-mono tabular-nums" dir="ltr">{p.prepTimeMinutes}</span> د
                          </span>
                        )}
                        {p.isWeightedScale && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded-xs font-bold">
                            صنف ميزان إلكتروني
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-800" dir="ltr">
                      {p.barcode}
                    </td>
                    {showCostPrice && (
                      <td className="py-3 px-4 text-end font-semibold font-mono tabular-nums text-slate-700" dir="ltr">
                        {p.costPrice.toLocaleString()} {currency}
                      </td>
                    )}
                    <td className="py-3 px-4 text-end font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                      {p.salePrice.toLocaleString()} {currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold font-mono tabular-nums text-sm text-slate-900" dir="ltr">
                        {p.stockQty}
                      </span>{' '}
                      <span className="text-slate-500 font-medium">{p.uom}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-bold border ${
                          isReorder
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        {isReorder ? 'إعادة طلب' : 'متوفر'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => openCrossBranchModal(p.sku)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold inline-flex items-center gap-1 transition"
                        title="فحص توفر الصنف في باقي الفروع والشبكة المحلية (LAN)"
                      >
                        <Network className="w-3 h-3 text-indigo-500" />
                        <span>فحص الفروع (LAN)</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {inventorySubTab === 'BRANCH_TRANSFERS' && (
        <div className="space-y-6">
          {transferFeedback && (
            <div
              data-testid="transfer-feedback-banner"
              className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{transferFeedback}</span>
            </div>
          )}

          {/* Connected Branch Nodes Topology */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  عقد الفروع والخوادم المحلية المتصلة عبر الشبكة (LAN & WAN Topology)
                </h3>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                مزامنة لحظية نشطة (Peer-to-Peer Sync)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {branchNodes.map((node) => {
                const isOnline = node.status === 'ONLINE_LAN' || node.status === 'ONLINE_WAN';
                return (
                  <div
                    key={node.branchId}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {node.branchNameAr}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          isOnline
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isOnline ? 'متصل LAN' : 'غير متصل'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <div className="flex justify-between font-mono" dir="ltr">
                        <span>IP:</span>
                        <span>{node.lanIpAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>زمن الاستجابة (Ping):</span>
                        <span className="font-mono font-bold text-emerald-600" dir="ltr">
                          {node.latencyMs} ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>المدينة:</span>
                        <span>{node.branchCity}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        المستودع: {node.warehouseNameAr}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCrossBranchModal(products[0]?.sku || 'ELEC-992')}
                      className="w-full mt-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>فحص أرصدة الفرع</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inter-Branch Transfer Orders Table */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden space-y-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  أوامر التحويل بين الفروع وقيود المقاصة المحاسبية المتزنة
                </h3>
              </div>
              <button
                type="button"
                data-testid="btn-new-branch-probe"
                onClick={() => openCrossBranchModal(products[0]?.sku || 'ELEC-992')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Network className="w-3.5 h-3.5" />
                <span>طلب تحويل جديد عبر فحص الفروع</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4 text-start">رقم التحويل</th>
                    <th className="py-3 px-4 text-start">التاريخ</th>
                    <th className="py-3 px-4 text-start">الصنف</th>
                    <th className="py-3 px-4 text-start">الفرع المصدر</th>
                    <th className="py-3 px-4 text-start">الفرع المستلم</th>
                    <th className="py-3 px-4 text-center">الكمية</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-center">قيد المقاصة المتزن</th>
                    <th className="py-3 px-4 text-center">الإجراء والاعتماد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {interBranchTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        لا توجد طلبات تحويل حالياً. يمكنك فحص الفروع لأي صنف وطلب التحويل اللحظي بضغطة زر واحدة.
                      </td>
                    </tr>
                  ) : (
                    interBranchTransfers.map((t) => {
                      const isApproved = t.status === 'APPROVED' || t.status === 'PENDING_APPROVAL';
                      const isInTransit = t.status === 'IN_TRANSIT';
                      const isReceived = t.status === 'RECEIVED';
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                            {t.requestNumber || t.id}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]" dir="ltr">
                            {t.requestedAt}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{t.productNameAr}</div>
                            <div className="font-mono text-slate-400 text-[10px]" dir="ltr">SKU: {t.sku}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {t.sourceBranchNameAr}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {t.targetBranchNameAr}
                          </td>
                          <td className="py-3 px-4 text-center font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100" dir="ltr">
                            {t.requestedQty}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isReceived ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' :
                              isInTransit ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                            }`}>
                              {isReceived ? 'تم الاستلام بالمستودع' : isInTransit ? 'قيد الشحن والنقل' : 'معتمد للتحويل'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500" dir="ltr">
                            {t.journalEntryNumber || '1104-BR2 / 1104-BR1'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isApproved && (
                              <button
                                type="button"
                                data-testid={`btn-transit-transfer-${t.id}`}
                                onClick={() => {
                                  const res = advanceBranchTransfer(t.id, 'IN_TRANSIT');
                                  setTransferFeedback(res.messageAr);
                                  setTimeout(() => setTransferFeedback(null), 5000);
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold transition cursor-pointer"
                              >
                                بدء الشحن (In-Transit)
                              </button>
                            )}
                            {isInTransit && (
                              <button
                                type="button"
                                data-testid={`btn-receive-transfer-${t.id}`}
                                onClick={() => {
                                  const res = advanceBranchTransfer(t.id, 'RECEIVED');
                                  setTransferFeedback(res.messageAr);
                                  setTimeout(() => setTransferFeedback(null), 5000);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition cursor-pointer"
                              >
                                تأكيد الاستلام بالمستودع
                              </button>
                            )}
                            {isReceived && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>مكتمل ومرحّل بالمخزون</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-700" />
                <span>إضافة صنف جديد للمخزون</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 text-xs">
              {productModalError && (
                <div
                  data-testid="product-modal-error-banner"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 font-bold text-xs"
                >
                  {productModalError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الاسم بالعربية *</label>
                  <input
                    type="text"
                    data-testid="new-product-name-ar"
                    required
                    value={nameAr}
                    onChange={(e) => {
                      setNameAr(e.target.value);
                      if (!name) setName(e.target.value);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">القطاع / المجال</label>
                  <select
                    value={productIndustry}
                    onChange={(e) => setProductIndustry(e.target.value as IndustryType)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="general">عام / صناعي</option>
                    <option value="restaurant">المطاعم والكافيهات</option>
                    <option value="electronics">الإلكترونيات والضمان</option>
                    <option value="grocery">البقالات والسوبرماركت</option>
                    <option value="pharmacy">الصيدليات والطبي</option>
                    <option value="contracting">المقاولات والمشاريع</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كود الصنف (SKU) *</label>
                  <input
                    type="text"
                    data-testid="new-product-sku"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="ELEC-900"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الباركود (EAN-13)</label>
                  <input
                    type="text"
                    data-testid="new-product-barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التكلفة</label>
                  <input
                    type="number"
                    data-testid="new-product-cost"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">سعر البيع</label>
                  <input
                    type="number"
                    data-testid="new-product-price"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرصيد الافتتاحي</label>
                  <input
                    type="number"
                    data-testid="new-product-stock"
                    value={stockQty}
                    onChange={(e) => setStockQty(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوحدة (UOM)</label>
                  <select
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="PCS">قطعة (PCS)</option>
                    <option value="KG">كيلوجرام (KG)</option>
                    <option value="BOX">صندوق / كرتون (BOX)</option>
                    <option value="MEAL">وجبة (MEAL)</option>
                  </select>
                </div>
              </div>

              {productIndustry === 'electronics' && (
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        التصنيف الهندسي الفرعي
                      </label>
                      <select
                        value={subCategory}
                        onChange={(e) => setSubCategory(e.target.value as ElectronicsSubCategory)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-md font-bold"
                      >
                        <option value="SOLAR_PANEL">ألواح طاقة شمسية</option>
                        <option value="HYBRID_INVERTER">إنفرتر هجين MPPT</option>
                        <option value="LITHIUM_BATTERY">بطارية ليثيوم LiFePO4</option>
                        <option value="GEL_BATTERY">بطارية جل أنبوبية</option>
                        <option value="SMART_SCREEN">شاشة ذكية 4K / OLED</option>
                        <option value="COMPUTING_MOBILE">أجهزة وحواسيب</option>
                        <option value="SOLAR_ACCESSORY">قواطع وملحقات طاقة</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        فترة الضمان (بالأشهر)
                      </label>
                      <input
                        type="number"
                        value={warrantyMonths}
                        onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        القدرة بالواط (Watts)
                      </label>
                      <input
                        type="number"
                        value={powerRatingWatts}
                        onChange={(e) => setPowerRatingWatts(Number(e.target.value))}
                        placeholder="585"
                        className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        مواصفة السعة / الجهد / الشاشة
                      </label>
                      <input
                        type="text"
                        value={batteryCapacitySpec || screenSizeSpec || voltageSpec}
                        onChange={(e) => {
                          setVoltageSpec(e.target.value);
                          setBatteryCapacitySpec(e.target.value);
                        }}
                        placeholder="48V 200Ah / 65 4K QLED"
                        className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(productIndustry === 'pharmacy' || productIndustry === 'grocery') && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <label className="block font-bold text-rose-900 mb-1">
                    تاريخ انتهاء الصلاحية (FEFO Expiry Date)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2 bg-white border border-rose-300 rounded-lg"
                  />
                </div>
              )}

              {productIndustry === 'restaurant' && (
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <label className="block font-bold text-orange-900 mb-1">
                    وقت التحضير في المطبخ (بالدقائق)
                  </label>
                  <input
                    type="number"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-orange-300 rounded-lg"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  data-testid="submit-product-btn"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                >
                  حفظ الصنف وتوليد الباركود
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV / Excel Import Wizard Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    معالج الاستيراد الجماعي للأصناف والأرصدة الافتتاحية (Excel / CSV Wizard)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    الصق البيانات مباشرة من ملف Excel أو ارفع ملف CSV لتسجيل الأصناف وتوليد الباركود وقيد الرصيد الافتتاحي آلياً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Template & File Upload Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkCsvText(SAMPLE_BULK_CSV)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل نموذج قياسي جاهز (4 أصناف متنوعة)</span>
                </button>
                <label className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع ملف .CSV أو .TXT</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={handleCsvFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="text-[11px] font-mono text-slate-600">
                الأعمدة: SKU, Barcode, NameAr, NameEn, CostPrice, SalePrice, StockQty, UOM, ReorderPoint, Sector
              </div>
            </div>

            {/* Raw CSV Textarea */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                بيانات الجدول (يدعم الفاصلة `,` أو اللصق المباشر من خلايا Excel `Tab`):
              </label>
              <textarea
                data-testid="bulk-csv-textarea"
                rows={5}
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] border border-slate-700 outline-hidden"
              />
            </div>

            {/* Live Parsed Preview Table */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800">
                  معاينة الأصناف الجاهزة للاستيراد ({liveBulkPreview.validProducts.length} صنف صالح):
                </span>
                <div className="flex items-center gap-3 font-mono font-bold">
                  <span className="text-slate-600">
                    إجمالي الكميات: <strong className="text-slate-900">{liveBulkPreview.totalOpeningQty}</strong>
                  </span>
                  <span className="text-emerald-700">
                    إجمالي تقييم المخزون الافتتاحي:{' '}
                    <strong>
                      {liveBulkPreview.totalOpeningValuation.toLocaleString()} {currency}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-[11px] text-start">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2 px-3 text-start">SKU</th>
                      <th className="py-2 px-3 text-start">الباركود</th>
                      <th className="py-2 px-3 text-start">اسم الصنف</th>
                      <th className="py-2 px-3 text-center">القطاع</th>
                      <th className="py-2 px-3 text-end">التكلفة</th>
                      <th className="py-2 px-3 text-end">سعر البيع</th>
                      <th className="py-2 px-3 text-center">الكمية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {liveBulkPreview.validProducts.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{item.sku}</td>
                        <td className="py-1.5 px-3 font-mono text-indigo-700">{item.barcode}</td>
                        <td className="py-1.5 px-3 font-bold text-slate-800">{item.nameAr}</td>
                        <td className="py-1.5 px-3 text-center">{item.industry}</td>
                        <td className="py-1.5 px-3 text-end font-mono">{item.costPrice}</td>
                        <td className="py-1.5 px-3 text-end font-mono font-bold">{item.salePrice}</td>
                        <td className="py-1.5 px-3 text-center font-mono font-black text-emerald-700">
                          {item.stockQty} {item.uom}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auto-Journal Checkbox & Submit */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postOpeningJournal}
                  onChange={(e) => setPostOpeningJournal(e.target.checked)}
                  className="rounded text-indigo-600 w-4 h-4"
                />
                <span>
                  إصدار وترحيل قيد يومية محاسبي تلقائي بالرصيد الافتتاحي للمخزون ({liveBulkPreview.totalOpeningValuation.toLocaleString()} {currency})
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  data-testid="confirm-bulk-import-btn"
                  disabled={liveBulkPreview.validProducts.length === 0}
                  onClick={handleConfirmBulkImport}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-sm transition disabled:opacity-40 cursor-pointer"
                >
                  اعتماد واستيراد الأصناف ({liveBulkPreview.validProducts.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

