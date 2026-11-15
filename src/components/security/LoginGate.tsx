import React, { useEffect, useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  ShieldCheck,
  AlertTriangle,
  LogOut,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { HasebBrandLogo } from '../common/HasebBrandLogo';

export const LoginGate: React.FC = () => {
  const {
    language,
    login,
    logout,
    unlockTerminal,
    isAuthenticated,
    isTerminalLocked,
    currentAccount,
    failedLoginAttempts,
    loginLockoutUntilMs,
    company,
    uiTheme,
  } = useERP();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const isLockedOut = loginLockoutUntilMs > nowMs;
  const remainingLockoutSec = isLockedOut
    ? Math.max(1, Math.ceil((loginLockoutUntilMs - nowMs) / 1000))
    : 0;

  useEffect(() => {
    if (!isLockedOut) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => window.clearInterval(timer);
  }, [isLockedOut]);

  const isDark = uiTheme === 'obsidian_dark';
  const isUnlockMode = isAuthenticated && isTerminalLocked;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNowMs(Date.now());

    if (isUnlockMode) {
      if (!password.trim()) {
        setErrorMsg(
          language === 'ar'
            ? 'يرجى إدخال كلمة المرور لإلغاء قفل الشاشة'
            : 'Please enter password to unlock terminal'
        );
        return;
      }
      const res = unlockTerminal(password);
      if (!res.success) {
        setErrorMsg(
          language === 'ar'
            ? res.errorAr || 'كلمة المرور غير صحيحة'
            : res.errorEn || 'Incorrect password'
        );
      } else {
        setPassword('');
      }
      return;
    }

    if (!username.trim() || !password.trim()) {
      setErrorMsg(
        language === 'ar'
          ? 'يرجى إدخال اسم المستخدم وكلمة المرور'
          : 'Please enter username and password'
      );
      return;
    }

    const res = login(username, password);
    if (!res.success) {
      setErrorMsg(
        language === 'ar'
          ? res.errorAr || 'اسم المستخدم أو كلمة المرور غير صحيحة'
          : res.errorEn || 'Invalid username or password'
      );
    } else {
      setPassword('');
    }
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      data-testid={isUnlockMode ? 'terminal-lock-gate' : 'login-gate'}
      className={`min-h-screen flex flex-col justify-between relative overflow-hidden select-none transition-colors ${
        isDark
          ? 'bg-[#080c14] text-slate-100'
          : uiTheme === 'haseb_sand'
          ? 'bg-[#f3ede2] text-stone-900'
          : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div
          className={`w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border ${
            isDark
              ? 'bg-slate-900/95 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200/90 text-slate-900'
          }`}
        >
          <div className="text-center mb-6">
            <div className="mb-3.5 flex justify-center">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.nameAr}
                  className="w-16 h-16 rounded-2xl object-contain border border-slate-200/80 bg-white p-1.5 shadow-sm"
                />
              ) : (
                <HasebBrandLogo size="xl" theme={uiTheme} />
              )}
            </div>
            <h1 className="text-xl font-black tracking-tight">
              {isUnlockMode
                ? language === 'ar'
                  ? 'الشاشة مقفلة مؤقتاً لحماية الجلسة'
                  : 'Terminal Session Locked'
                : company.nameAr ||
                  (language === 'ar'
                    ? 'حاسب — النظام المحاسبي والمؤسسي المتكامل'
                    : 'Haseb Enterprise ERP')}
            </h1>
            <p className={`text-xs mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isUnlockMode
                ? language === 'ar'
                  ? `المستخدم الحالي: ${currentAccount.nameAr || currentAccount.name} (${currentAccount.username})`
                  : `Active User: ${currentAccount.name} (${currentAccount.username})`
                : language === 'ar'
                ? 'أدخل بيانات الاعتماد المشفرة للوصول إلى مساحة العمل'
                : 'Enter your encrypted credentials to access workspace'}
            </p>
          </div>

          {isLockedOut && !isUnlockMode && (
            <div
              data-testid="login-lockout-banner"
              className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2.5"
            >
              <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
              <span>
                {language === 'ar'
                  ? `تم إيقاف محاولات الدخول مؤقتاً للحماية (${remainingLockoutSec} ثانية متبقية)`
                  : `Login temporarily locked for security (${remainingLockoutSec}s remaining)`}
              </span>
            </div>
          )}

          {errorMsg && (
            <div
              data-testid="login-error-banner"
              className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {failedLoginAttempts > 0 && failedLoginAttempts < 5 && !isLockedOut && !isUnlockMode && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                {language === 'ar'
                  ? `تنبيه أمني: تبقى ${5 - failedLoginAttempts} محاولات قبل الإغلاق المؤقت.`
                  : `Security warning: ${5 - failedLoginAttempts} attempts remaining before lockout.`}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isUnlockMode && (
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  {language === 'ar' ? 'اسم المستخدم' : 'Username'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute top-3 start-3.5" />
                  <input
                    type="text"
                    data-testid="login-username-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter username'}
                    className={`w-full rounded-xl ps-10 pe-4 py-2.5 text-sm font-mono outline-hidden transition border ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200/80 text-slate-900 focus:bg-white focus:border-blue-600'
                    }`}
                    disabled={isLockedOut}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1.5">
                {language === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute top-3 start-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  data-testid="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full rounded-xl ps-10 pe-10 py-2.5 text-sm font-mono outline-hidden transition border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200/80 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                  disabled={isLockedOut && !isUnlockMode}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-2.5 end-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid="login-submit-btn"
              disabled={isLockedOut && !isUnlockMode}
              className="w-full py-3 rounded-xl haseb-btn-primary text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isUnlockMode
                  ? language === 'ar'
                    ? 'إلغاء القفل ومتابعة العمل'
                    : 'Unlock Terminal'
                  : language === 'ar'
                  ? 'دخول آمن إلى منظومة حاسب'
                  : 'Sign In Securely'}
              </span>
            </button>

            {isUnlockMode && (
              <button
                type="button"
                data-testid="terminal-lock-signout-btn"
                onClick={logout}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>
                  {language === 'ar'
                    ? 'تسجيل الخروج الكامل وتبديل الحساب'
                    : 'Sign Out Completely'}
                </span>
              </button>
            )}
          </form>
        </div>
      </main>

      <footer
        className={`relative z-10 border-t py-3 text-center text-xs font-medium ${
          isDark
            ? 'border-slate-800 bg-slate-900/90 text-slate-400'
            : 'border-slate-200/70 bg-white text-slate-500'
        }`}
      >
        <span>
          {language === 'ar'
            ? 'منظومة حاسب المحاسبية والمؤسسية المتكاملة • حماية مشفرة مرتبطة بجهاز واحد'
            : 'Haseb Enterprise ERP • Single-Device Encrypted Protection'}
        </span>
      </footer>
    </div>
  );
};
