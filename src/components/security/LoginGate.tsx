import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  KeyRound,
  Cpu,
  HardDrive,
  CircuitBoard,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  Globe,
  Layers,
  Terminal,
} from 'lucide-react';

export const LoginGate: React.FC = () => {
  const {
    language,
    setLanguage,
    login,
    userAccounts,
    hardwareFingerprint,
    protectionState,
    setIsSimulatedTrialExpired,
  } = useERP();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = login(username, password);
    if (!res.success) {
      setErrorMsg(language === 'ar' ? res.errorAr || 'خطأ في الدخول' : res.errorEn || 'Login error');
    }
  };

  const handleQuickFillAndLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
    login(u, p);
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none"
    >
      {/* Background Subtle Grid & Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.16),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.12),transparent_45%)]" />

      {/* Top Security Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wide text-white">RLM ENTERPRISE ERP</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                v3.0 SECURE-CORE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {language === 'ar'
                ? 'نظام مؤسسي محمي ببصمة الهاردوير والتشفير أحادي الجهاز'
                : 'Hardware-Locked Enterprise ERP & Multi-Industry Platform'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Trial / License Status Pill */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              protectionState.status === 'LICENSE_ACTIVE'
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {protectionState.status === 'LICENSE_ACTIVE'
                ? language === 'ar'
                  ? `مرخص رسمياً (${protectionState.licenseDetails?.durationLabelAr})`
                  : `Licensed (${protectionState.licenseDetails?.durationLabelEn})`
                : language === 'ar'
                ? `نسخة تجريبية (متبقي ${protectionState.trialRemainingDays} من 30 يوم)`
                : `30-Day Trial (${protectionState.trialRemainingDays} days left)`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsSimulatedTrialExpired(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            title={
              language === 'ar'
                ? 'اختبار إقفال النظام بعد انتهاء الـ 30 يوماً وطلب سيريال التفعيل'
                : 'Test 30-Day Trial Expiry Lockout & Keygen'
            }
          >
            <Lock className="w-3.5 h-3.5" />
            <span>
              {language === 'ar' ? 'اختبار قفل الـ 30 يوم والتفعيل' : 'Test 30-Day Lock & Keygen'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Login Form (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-4">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {language === 'ar'
                    ? 'بوابة الدخول الموحدة وتفويض الصلاحيات (RBAC)'
                    : 'Unified Authentication & Role Authorization Gateway'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {language === 'ar' ? 'تسجيل الدخول إلى النظام' : 'Sign In to RLM ERP'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                {language === 'ar'
                  ? 'بيانات الدخول الافتراضية للمدير العام: اسم المستخدم admin وكلمة المرور admin'
                  : 'Default Super Admin credentials: Username admin and Password admin'}
              </p>

              {/* Default Credentials Highlight Box */}
              <div className="mt-4 p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="text-xs">
                    <span className="text-slate-300">
                      {language === 'ar' ? 'البيانات الافتراضية المعتمدة:' : 'Default Admin Credentials:'}
                    </span>{' '}
                    <code className="px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono font-bold">
                      admin
                    </code>{' '}
                    /{' '}
                    <code className="px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono font-bold">
                      admin
                    </code>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="quick-admin-login-btn"
                  onClick={() => handleQuickFillAndLogin('admin', 'admin')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  {language === 'ar' ? 'دخول فوري كمدير (admin)' : 'Instant Admin Login'}
                </button>
              </div>

              {errorMsg && (
                <div
                  data-testid="login-error-banner"
                  className="mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {language === 'ar' ? 'اسم المستخدم (Username)' : 'Username'}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute top-3 start-3.5" />
                    <input
                      type="text"
                      data-testid="login-username-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl ps-10 pe-4 py-2.5 text-sm text-white font-mono outline-hidden transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {language === 'ar' ? 'كلمة المرور (Password)' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute top-3 start-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      data-testid="login-password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="admin"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl ps-10 pe-10 py-2.5 text-sm text-white font-mono outline-hidden transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-2.5 end-3 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  data-testid="login-submit-btn"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-sm shadow-lg shadow-indigo-600/25 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {language === 'ar'
                      ? 'تسجيل الدخول وفتح النظام المؤسسي'
                      : 'Authenticate & Launch Enterprise Workspace'}
                  </span>
                </button>
              </form>
            </div>

            {/* Quick Role Membership Selector */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="text-xs font-bold text-slate-400 mb-2.5 flex items-center justify-between">
                <span>
                  {language === 'ar'
                    ? 'تجربة الدخول بعضويات وصلاحيات مختلفة:'
                    : 'Test Sign-In with Different Role Memberships:'}
                </span>
                <span className="text-[11px] text-indigo-400">
                  {language === 'ar' ? 'انقر للدخول المباشر' : 'Click for 1-Tap Login'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {userAccounts
                  .filter((acc) => !acc.isHiddenMasterAdmin)
                  .map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      data-testid={`quick-role-${acc.username}`}
                      onClick={() => handleQuickFillAndLogin(acc.username, acc.password)}
                      className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-start transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="truncate pe-2">
                        <div className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                          {language === 'ar' ? acc.nameAr : acc.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {acc.username} / {acc.password} •{' '}
                          <span className="text-emerald-400">
                            {acc.allowedModules.length} {language === 'ar' ? 'أقسام' : 'modules'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono shrink-0">
                        {acc.role.split('_')[0]}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Column: Hardware Security & Anti-Theft Architecture (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  {language === 'ar'
                    ? 'بصمة الهاردوير الفعلية للجهاز الحي'
                    : 'Live Machine Hardware Fingerprint'}
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  {hardwareFingerprint.detectionSource === 'WINDOWS_WMI_IMPORTED'
                    ? 'WMI-VERIFIED'
                    : 'LIVE-WEBGL-CPU'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                {language === 'ar'
                  ? 'يقرأ النظام فعلياً معالج الرسوميات (WebGL GPU) وأنوية المعالج والرام ونظام التشغيل لتوليد كود جهاز فريد يعمل على هذا الجهاز فقط.'
                  : 'RLM ERP extracts live WebGL GPU, CPU cores, RAM, and OS silicon telemetry to bind licenses strictly to a single machine.'}
              </p>

              {hardwareFingerprint.rawTelemetry && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-[11px] text-slate-300 space-y-1">
                  <div className="truncate">
                    <span className="text-slate-400">
                      {language === 'ar' ? 'كرت الشاشة المقروء: ' : 'Live GPU: '}
                    </span>
                    <strong className="font-mono text-emerald-300">
                      {hardwareFingerprint.rawTelemetry.gpuRenderer}
                    </strong>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400">
                      {language === 'ar' ? 'المعالج والذاكرة: ' : 'CPU & RAM: '}
                    </span>
                    <strong className="font-mono text-indigo-300">
                      {hardwareFingerprint.rawTelemetry.cpuModel} ({hardwareFingerprint.rawTelemetry.cpuCores} Cores /{' '}
                      {hardwareFingerprint.rawTelemetry.memoryGb} GB)
                    </strong>
                  </div>
                </div>
              )}

              {/* Hardware Serials List */}
              <div className="space-y-2.5 bg-slate-950/90 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <CircuitBoard className="w-3.5 h-3.5 text-indigo-400" />
                    {language === 'ar' ? 'سيريال الماذربورد:' : 'Motherboard SN:'}
                  </span>
                  <code className="font-mono text-[11px] text-slate-200 font-bold">
                    {hardwareFingerprint.motherboardSerial}
                  </code>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    {language === 'ar' ? 'معرف المعالج CPU:' : 'Processor ID:'}
                  </span>
                  <code className="font-mono text-[11px] text-slate-200 font-bold">
                    {hardwareFingerprint.cpuProcessorId.slice(0, 22)}
                  </code>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {language === 'ar' ? 'معرف المعالج الرسومي:' : 'GPU Silicon ID:'}
                  </span>
                  <code className="font-mono text-[11px] text-slate-200 font-bold">
                    {hardwareFingerprint.gpuSiliconId}
                  </code>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    {language === 'ar' ? 'سيريال القرص NVMe:' : 'Disk Volume SN:'}
                  </span>
                  <code className="font-mono text-[11px] text-slate-200 font-bold">
                    {hardwareFingerprint.diskVolumeSerial}
                  </code>
                </div>
              </div>

              {/* Request Code Box */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-indigo-500/30">
                <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                  <span>
                    {language === 'ar'
                      ? 'كود الجهاز المجمع (يرسل للمطور لتوليد السيريال):'
                      : 'Composite Machine Request Code (Send to Developer):'}
                  </span>
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="font-mono text-xs sm:text-sm font-black text-indigo-300 tracking-wider text-center py-1.5 bg-slate-900 rounded-lg border border-slate-800">
                  {protectionState.machineRequestCode}
                </div>
              </div>
            </div>

            {/* Source Code Protection Summary */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'ar'
                    ? 'درع حماية السورس كود ومنع السرقة نشط 100%'
                    : 'Anti-Theft Source Code Shield Active'}
                </span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1 ps-5 list-disc">
                <li>
                  {language === 'ar'
                    ? 'حماية ضد فحص السورس كود (F12 / Ctrl+U / Ctrl+Shift+I) والنسخ غير المصرح'
                    : 'Blocks DevTools inspection shortcuts, source view, and unauthorized cloning'}
                </li>
                <li>
                  {language === 'ar'
                    ? 'فترة تجريبية 30 يوماً ثم إقفال تلقائي كامل لحين إدخال سيريال المطور'
                    : '30-Day trial with automatic hardware lock until Developer Serial activation'}
                </li>
                <li>
                  {language === 'ar'
                    ? 'تحديد صلاحية السيريال (يوم / أسبوع / شهر / سنة / مدة مخصصة) لجهاز واحد فقط'
                    : 'Supports 1-Day, 1-Week, 1-Month, 1-Year, or Custom single-PC serials'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
