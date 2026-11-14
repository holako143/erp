import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { HasebBrandLogo } from '../common/HasebBrandLogo';

export const LoginGate: React.FC = () => {
  const {
    language,
    login,
    uiTheme,
  } = useERP();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between relative overflow-hidden select-none"
    >
      {/* Main Content: Clean Centered Lumina POS Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="mb-3.5 flex justify-center">
              <HasebBrandLogo size="xl" theme={uiTheme} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {language === 'ar' ? 'حاسب — النظام المحاسبي والمؤسسي المتكامل' : 'Haseb Enterprise ERP'}
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {language === 'ar'
                ? 'أدخل بيانات الاعتماد للوصول الفوري إلى منظومة حاسب الذكية'
                : 'Enter your credentials to access Haseb Workspace'}
            </p>
          </div>

          {errorMsg && (
            <div
              data-testid="login-error-banner"
              className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                  className="w-full bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-slate-900 rounded-xl ps-10 pe-4 py-2.5 text-sm text-slate-900 font-mono outline-hidden transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                  className="w-full bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-slate-900 rounded-xl ps-10 pe-10 py-2.5 text-sm text-slate-900 font-mono outline-hidden transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-2.5 end-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Note about default login */}
            <div className="py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-center justify-center gap-2 font-medium">
              <KeyRound className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'اسم المستخدم: admin | كلمة السر: admin'
                  : 'Username: admin | Password: admin'}
              </span>
            </div>

            <button
              type="submit"
              data-testid="login-submit-btn"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-2xs transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {language === 'ar' ? 'دخول منظومة حاسب' : 'Sign In to Haseb'}
              </span>
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/70 bg-white py-3 text-center text-xs text-slate-500 font-medium">
        <span>منظومة حاسب المحاسبية والمؤسسية المتكاملة • Haseb Enterprise ERP Platform</span>
      </footer>
    </div>
  );
};
