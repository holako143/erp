import React, { useState, useMemo } from 'react';
import { Sun, Zap } from 'lucide-react';
import {
  calculateSolarAndBatterySystemSizing,
  SolarSystemSizingOutput,
} from '../../core/inventoryEngine';

export interface POSSolarCalculatorModalProps {
  onApplyKit: (result: SolarSystemSizingOutput) => void;
  onClose: () => void;
}

const POSSolarCalculatorModal: React.FC<POSSolarCalculatorModalProps> = React.memo(
  ({ onApplyKit, onClose }) => {
    const [peakLoadWatts, setPeakLoadWatts] = useState<number>(3600);
    const [autonomyHours, setAutonomyHours] = useState<number>(8);
    const [systemVoltage, setSystemVoltage] = useState<12 | 24 | 48>(48);
    const [batteryChemistry, setBatteryChemistry] = useState<'LIFEPO4' | 'TUBULAR_GEL'>('LIFEPO4');
    const [panelRatingWatts, setPanelRatingWatts] = useState<number>(585);
    const [peakSunHours, setPeakSunHours] = useState<number>(5.5);

    const solarSizingResult = useMemo(
      () =>
        calculateSolarAndBatterySystemSizing({
          continuousLoadWatts: peakLoadWatts,
          backupHours: autonomyHours,
          systemVoltage,
          batteryType: batteryChemistry,
          singlePanelWatts: panelRatingWatts,
          peakSunHours,
        }),
      [
        peakLoadWatts,
        autonomyHours,
        systemVoltage,
        batteryChemistry,
        panelRatingWatts,
        peakSunHours,
      ]
    );

    return (
      <div
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  الحاسبة الهندسية لمنظومات الطاقة الشمسية والبطاريات والإنفرترات
                </h3>
                <p className="text-[11px] text-slate-500">
                  حساب تلقائي لقدرة الإنفرتر الهجين، سعة بنك البطاريات (LiFePO4 / Gel)، وعدد الألواح الشمسية مع الإدراج المباشر للفاتورة
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition"
            >
              ✕
            </button>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
            {/* Inputs Column */}
            <div className="md:col-span-6 space-y-3">
              <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                <label className="block font-bold text-slate-700 mb-1">
                  إجمالي الأحمال الكهربائية المستمرة (Continuous Load Watts):
                </label>
                <input
                  type="number"
                  autoFocus
                  data-pos-modal-field="solar-peak-watts"
                  data-testid="input-solar-peak-watts"
                  value={peakLoadWatts}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setPeakLoadWatts(Math.max(100, Number(e.target.value)))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono tabular-nums font-bold text-slate-900"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                  <label className="block font-bold text-slate-700 mb-1">
                    ساعات التشغيل الاحتياطي (Backup Hours):
                  </label>
                  <input
                    type="number"
                    data-pos-modal-field="solar-autonomy-hours"
                    value={autonomyHours}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setAutonomyHours(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono tabular-nums font-bold text-slate-900"
                    dir="ltr"
                  />
                </div>
                <div className="p-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    الطاقة المطلوبة يومياً (kWh):
                  </label>
                  <div
                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded-md font-mono tabular-nums font-bold text-slate-800"
                    dir="ltr"
                  >
                    {solarSizingResult.dailyEnergyKwh} kWh / Day
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                  <label className="block font-bold text-slate-700 mb-1">
                    جهد منظومة البطاريات (DC Bus):
                  </label>
                  <select
                    data-pos-modal-field="solar-system-voltage"
                    value={systemVoltage}
                    onChange={(e) => setSystemVoltage(Number(e.target.value) as 12 | 24 | 48)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-bold text-slate-900"
                  >
                    <option value={48}>48V DC (منظومات منازل ومشاريع)</option>
                    <option value={24}>24V DC (منظومات متوسطة)</option>
                    <option value={12}>12V DC (منظومات صغيرة)</option>
                  </select>
                </div>
                <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                  <label className="block font-bold text-slate-700 mb-1">
                    نوع البطاريات (Chemistry):
                  </label>
                  <select
                    data-pos-modal-field="solar-battery-chemistry"
                    value={batteryChemistry}
                    onChange={(e) =>
                      setBatteryChemistry(e.target.value as 'LIFEPO4' | 'TUBULAR_GEL')
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-bold text-slate-900"
                  >
                    <option value="LIFEPO4">ليثيوم LiFePO4 (عمق تفريغ 85%)</option>
                    <option value="TUBULAR_GEL">بطاريات جل أنبوبية Gel (عمق 55%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                  <label className="block font-bold text-slate-700 mb-1">
                    قدرة اللوح الشمسي الواحد (Watts):
                  </label>
                  <select
                    data-pos-modal-field="solar-panel-watts"
                    value={panelRatingWatts}
                    onChange={(e) => setPanelRatingWatts(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono font-bold text-slate-900"
                  >
                    <option value={585}>585W Jinko N-Type Bifacial</option>
                    <option value={550}>550W Mono PERC Half-Cell</option>
                    <option value={620}>620W Utility Bifacial</option>
                  </select>
                </div>
                <div className="pos-focus-group p-2 rounded-md border border-transparent transition-all">
                  <label className="block font-bold text-slate-700 mb-1">
                    ساعات الذروة الشمسية (Sun Hours):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    data-pos-modal-field="solar-sun-hours"
                    value={peakSunHours}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setPeakSunHours(Math.max(3, Number(e.target.value)))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono tabular-nums font-bold text-slate-900"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Engineering Output Column */}
            <div className="md:col-span-6 bg-slate-50 p-4 rounded-md border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-2 mb-3">
                  المواصفات الهندسية المحسوبة للمنظومة:
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white p-2.5 rounded-md border border-slate-200">
                    <div className="text-[10px] text-slate-500">قدرة الإنفرتر الهجين الموصى بها</div>
                    <div
                      data-testid="solar-result-inverter-kw"
                      className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5"
                      dir="ltr"
                    >
                      {solarSizingResult.recommendedInverterKw} kW Hybrid
                    </div>
                    <div className="text-[10px] text-teal-700 font-semibold truncate">
                      {solarSizingResult.recommendedInverterModel}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-md border border-slate-200">
                    <div className="text-[10px] text-slate-500">مصفوفة الألواح الشمسية المطلوبة</div>
                    <div
                      data-testid="solar-result-panels-count"
                      className="text-base font-bold font-mono tabular-nums text-teal-700 mt-0.5"
                      dir="ltr"
                    >
                      {solarSizingResult.recommendedPanelCount} × {panelRatingWatts}W
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono tabular-nums" dir="ltr">
                      Total PV: {solarSizingResult.requiredSolarArrayKwp} kWp
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-md border border-slate-200">
                    <div className="text-[10px] text-slate-500">سعة بنك البطاريات الإجمالية</div>
                    <div
                      data-testid="solar-result-battery-kwh"
                      className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5"
                      dir="ltr"
                    >
                      {solarSizingResult.requiredBatteryStorageKwh} kWh
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono tabular-nums" dir="ltr">
                      {solarSizingResult.requiredBatteryAhAtSystemVoltage} Ah @ {systemVoltage}V
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-md border border-slate-200">
                    <div className="text-[10px] text-slate-500">عدد وحدات البطاريات القياسية</div>
                    <div
                      className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5"
                      dir="ltr"
                    >
                      {solarSizingResult.recommendedBatteryUnits} Units
                    </div>
                    <div className="text-[10px] text-slate-600 truncate" dir="ltr">
                      {solarSizingResult.recommendedBatteryUnitSpec}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  data-pos-modal-field="solar-apply-btn"
                  data-testid="btn-apply-solar-kit-pos"
                  onClick={() => onApplyKit(solarSizingResult)}
                  className="px-4 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Zap className="w-4 h-4" />
                  <span>إدراج المنظومة الكاملة في سلة المبيعات</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

POSSolarCalculatorModal.displayName = 'POSSolarCalculatorModal';
export default POSSolarCalculatorModal;
