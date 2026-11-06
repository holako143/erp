import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Layers,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Copy,
  Check,
  KeyRound,
  Terminal,
} from 'lucide-react';

export const LoginGate: React.FC = () => {
  const {
    language,
    setLanguage,
    login,
    protectionState,
  } = useERP();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Machine Device Code for Developer Serial Generation
  const deviceCode = protectionState.machineRequestCode || 'ASF-7892-4910-K891';

  const handleCopyCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(deviceCode);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!username.trim() || !password.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال اسم المستخدم وكلمة المرور' : 'Please enter username and password');
      return;
    }
    const res = login(username, password);
    if (!res.success) {
      setErrorMsg(language === 'ar' ? res.errorAr || 'خطأ في اسم المستخدم أو كلمة المرور' : res.errorEn || 'Invalid username or password');
    }
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none"
    >
      {/* Background Subtle Grid & Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.12),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.09),transparent_45%)]" />

      {/* Top Security Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wide text-white">ASF ENTERPRISE ERP</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                v4.0 SECURE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {language === 'ar'
                ? 'النظام المؤسسي الشامل للشركات ونقاط البيع المتقدمة'
                : 'Enterprise ERP & Advanced Commercial Point of Sale'}
            </p>
          </div>
        </div>

        {/* Top Badges: Device Key & 7-Day Trial */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Machine Device Key Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-xs">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 font-medium">
              {language === 'ar' ? 'كود الجهاز:' : 'Device Key:'}
            </span>
            <code className="font-mono font-bold text-indigo-300 text-xs tracking-wider">
              {deviceCode}
            </code>
            <button
              type="button"
              onClick={handleCopyCode}
              title={language === 'ar' ? 'نسخ كود الجهاز لإرساله للمطور' : 'Copy device code for developer'}
              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              {copiedKey ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}</span>
            </button>
          </div>

          {/* Trial / License Status Pill */}
          <div className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-950/70 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              {protectionState.status === 'LICENSE_ACTIVE'
                ? language === 'ar'
                  ? `مرخص رسمياً (${protectionState.licenseDetails?.durationLabelAr})`
                  : `Licensed (${protectionState.licenseDetails?.durationLabelEn})`
                : language === 'ar'
                ? 'نسخة تجريبية (7 أيام)'
                : 'Trial Version (7 Days)'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </header>

      {/* Main Content: Clean Centered Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'ar'
                ? 'أدخل بيانات الاعتماد للوصول إلى لوحة التحكم'
                : 'Enter your credentials to access the workspace'}
            </p>
          </div>

          {errorMsg && (
            <div
              data-testid="login-error-banner"
              className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl ps-10 pe-4 py-2.5 text-sm text-white font-mono outline-hidden transition"
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
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl ps-10 pe-10 py-2.5 text-sm text-white font-mono outline-hidden transition"
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

            {/* Note about default login */}
            <div className="py-2 px-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {language === 'ar'
                  ? 'اسم المستخدم: admin | كلمة السر: admin'
                  : 'Username: admin | Password: admin'}
              </span>
            </div>

            <button
              type="submit"
              data-testid="login-submit-btn"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-900/30 transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {language === 'ar' ? 'دخول النظام' : 'Sign In'}
              </span>
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900/80 py-3 text-center text-xs text-slate-500">
        <span>ASF Enterprise Secure ERP Platform • Single-Device Hardware Bound</span>
      </footer>
    </div>
  );
};
