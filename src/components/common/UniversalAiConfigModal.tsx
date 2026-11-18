import React, { useState, useEffect } from 'react';
import {
  Bot,
  X,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Server,
  ShieldCheck,
  Sliders,
  Trash2,
  Zap,
  Globe,
} from 'lucide-react';
import {
  AI_PROVIDER_PRESETS,
  AiProviderId,
  UniversalAiConfigPublic,
  getAiProviderPreset,
} from '../../core/aiProviderEngine';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';
import { useERP } from '../../context/ERPContext';

interface UniversalAiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UniversalAiConfigModal: React.FC<UniversalAiConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language, uiTheme, dispatchToastAndPushNotification } = useERP();
  const isAr = language === 'ar';
  const isDark = uiTheme === 'obsidian_dark';
  const { zIndex, isTopLayer } = useModalLayer(isOpen, 65);

  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [serverConfig, setServerConfig] = useState<UniversalAiConfigPublic | null>(null);

  const [provider, setProvider] = useState<AiProviderId>('gemini');
  const [baseUrl, setBaseUrl] = useState<string>('https://generativelanguage.googleapis.com');
  const [model, setModel] = useState<string>('gemini-4-hydrogen');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [temperature, setTemperature] = useState<number>(0.4);
  const [systemPrompt, setSystemPrompt] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const activePreset = getAiProviderPreset(provider);

  const fetchCurrentConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const resp = await fetch('/api/v1/ai/config');
      const data = await resp.json();
      if (resp.ok && data?.config) {
        const cfg = data.config as UniversalAiConfigPublic;
        setServerConfig(cfg);
        setProvider(cfg.provider);
        setBaseUrl(cfg.baseUrl);
        setModel(cfg.model);
        setEnabled(cfg.enabled);
        setTemperature(cfg.temperature ?? 0.4);
        setSystemPrompt(cfg.systemPrompt || '');
        setApiKeyInput('');
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        text: isAr
          ? 'تعذر قراءة إعدادات الذكاء الاصطناعي من الخادم.'
          : 'Failed to load server AI configuration.',
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setFeedbackBanner(null);
    fetchCurrentConfig();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopLayer) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isTopLayer, onClose]);

  const handleSelectProvider = (nextId: AiProviderId) => {
    const preset = getAiProviderPreset(nextId);
    setProvider(nextId);
    setBaseUrl(preset.defaultBaseUrl);
    setModel(preset.defaultModel);
    setApiKeyInput('');
    setFeedbackBanner(null);
  };

  const canKeepExistingKey =
    Boolean(serverConfig?.hasApiKey) && serverConfig?.provider === provider && !apiKeyInput.trim();

  const buildRequestPayload = () => ({
    provider,
    baseUrl: baseUrl.trim(),
    model: model.trim(),
    apiKey: apiKeyInput.trim() || (canKeepExistingKey ? '__KEEP_EXISTING__' : ''),
    enabled,
    temperature,
    systemPrompt,
  });

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackBanner(null);

    try {
      const resp = await fetch('/api/v1/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestPayload()),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        setFeedbackBanner({
          type: 'error',
          text: data?.errorAr || data?.error || 'تعذر حفظ إعدادات الذكاء الاصطناعي.',
        });
        return;
      }

      const saved = data.config as UniversalAiConfigPublic;
      setServerConfig(saved);
      setApiKeyInput('');
      setFeedbackBanner({
        type: 'success',
        text:
          data.messageAr ||
          `تم حفظ وتفعيل (${saved.providerLabelAr}) بنجاح لكافة وحدات النظام والواتساب.`,
      });

      window.dispatchEvent(new CustomEvent('haseb-ai-config-updated', { detail: saved }));
      dispatchToastAndPushNotification({
        titleAr: 'إعدادات الذكاء الاصطناعي الموحدة (API)',
        titleEn: 'Global AI API Configuration',
        messageAr: `تم اعتماد مزود ${saved.providerLabelAr} (${saved.model}) لكافة خدمات النظام.`,
        messageEn: `Activated ${saved.providerLabelEn} (${saved.model}) across all ERP AI services.`,
        severity: 'success',
        category: 'LIVE_EVENTS',
      });
    } catch {
      setFeedbackBanner({
        type: 'error',
        text: isAr ? 'خطأ في الاتصال بالخادم أثناء الحفظ.' : 'Network error saving AI config.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedbackBanner(null);
    try {
      const resp = await fetch('/api/v1/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestPayload()),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        setFeedbackBanner({
          type: 'error',
          text: data?.errorAr || data?.error || 'فشل اختبار الاتصال بمزود الذكاء الاصطناعي.',
        });
        return;
      }

      setFeedbackBanner({
        type: 'success',
        text: isAr
          ? `✅ نجح الاتصال مع ${data.providerLabel} (نموذج: ${data.model}) خلال ${data.latencyMs}ms — الرد: "${data.sampleReply}"`
          : `Connected to ${data.providerLabel} (${data.model}) in ${data.latencyMs}ms — Reply: "${data.sampleReply}"`,
      });
    } catch {
      setFeedbackBanner({
        type: 'error',
        text: isAr ? 'تعذر إرسال طلب اختبار الاتصال.' : 'Connection test request failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearStoredKey = async () => {
    setIsSaving(true);
    setFeedbackBanner(null);
    try {
      const resp = await fetch('/api/v1/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          clearStoredKey: true,
          enabled: false,
          temperature,
          systemPrompt,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data?.success) {
        setServerConfig(data.config);
        setApiKeyInput('');
        setEnabled(Boolean(data.config?.enabled));
        window.dispatchEvent(new CustomEvent('haseb-ai-config-updated', { detail: data.config }));
        setFeedbackBanner({
          type: 'info',
          text: isAr ? 'تم مسح مفتاح API المخزن من الخادم.' : 'Stored API key cleared.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return renderModalPortal(
    <div
      data-testid="universal-ai-config-modal"
      data-modal-top={isTopLayer ? 'true' : 'false'}
      style={{ zIndex }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5"
    >
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className={`w-full max-w-4xl max-h-[93dvh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-5 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm sm:text-base truncate">
                {isAr
                  ? 'إعدادات الذكاء الاصطناعي الموحدة للنظام (Global AI API)'
                  : 'Global Multi-Provider AI API Configuration'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isAr
                  ? 'ربط أي شركة أو نموذج (Gemini، OpenAI، Claude، DeepSeek، Groq، Ollama، أو Custom API) لتشغيل الواتساب والتقارير والتنبؤ والثيمات'
                  : 'Connect any AI company or custom OpenAI-compatible model for WhatsApp Bot, Reports Copilot, OCR, Forecasting & Themes'}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="ai-config-close-btn"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق إعدادات الذكاء الاصطناعي' : 'Close AI Configuration'}
            className="w-9 h-9 rounded-xl bg-slate-200/70 hover:bg-slate-300/70 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSaveConfig} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Active Server Status Strip */}
          <div
            data-testid="ai-config-status-banner"
            className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
              serverConfig?.enabled && (serverConfig.hasApiKey || !activePreset.requiresApiKey)
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
                : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              {isLoadingConfig ? (
                <span>جاري التحقق من الخادم...</span>
              ) : serverConfig ? (
                <span className="truncate font-bold">
                  المزوّد النشط حالياً: <span className="text-indigo-600 dark:text-indigo-400">{serverConfig.providerLabelAr}</span> • النموذج:{' '}
                  <code className="font-mono font-black">{serverConfig.model}</code>
                  {serverConfig.maskedKeyPreview ? (
                    <span className="ms-2 font-mono text-[11px] opacity-80">
                      ({serverConfig.maskedKeyPreview})
                    </span>
                  ) : null}
                </span>
              ) : (
                <span>لم يتم تكوين مزوّد مخصص بعد.</span>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-bold shrink-0">
              <input
                type="checkbox"
                data-testid="ai-config-enabled-checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
              <span>{enabled ? 'الذكاء الاصطناعي مفعّل للنظام' : 'معطّل حالياً'}</span>
            </label>
          </div>

          {/* Feedback Alert */}
          {feedbackBanner && (
            <div
              data-testid="ai-config-feedback-banner"
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                feedbackBanner.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : feedbackBanner.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200'
              }`}
            >
              {feedbackBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackBanner.text}</span>
            </div>
          )}

          {/* Provider Selection Grid */}
          <div className="space-y-2">
            <div className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. اختر شركة أو مزوّد الذكاء الاصطناعي (AI Provider)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AI_PROVIDER_PRESETS.map((preset) => {
                const isSelected = provider === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`ai-provider-card-${preset.id}`}
                    onClick={() => handleSelectProvider(preset.id)}
                    className={`p-2.5 rounded-xl border text-start transition cursor-pointer flex flex-col justify-between gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isDark
                        ? 'bg-slate-950/60 border-slate-800 hover:border-indigo-500 text-slate-200'
                        : 'bg-slate-50 border-slate-200 hover:border-indigo-400 text-slate-800'
                    }`}
                  >
                    <div className="font-black text-xs leading-tight">{preset.vendorName}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {preset.defaultModel}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {activePreset.descriptionAr}
            </p>
          </div>

          {/* Endpoint + Model + API Key Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Model Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                اسم النموذج (Model Name)
              </label>
              <input
                type="text"
                data-testid="ai-config-model-input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={activePreset.defaultModel}
                dir="ltr"
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-bold outline-hidden ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:bg-white'
                }`}
              />
              {activePreset.suggestedModels.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {activePreset.suggestedModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border cursor-pointer transition ${
                        model === m
                          ? 'bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Base URL / Endpoint */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>رابط الـ API (Base URL / Endpoint)</span>
              </label>
              <input
                type="text"
                data-testid="ai-config-baseurl-input"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={activePreset.defaultBaseUrl}
                dir="ltr"
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-bold outline-hidden ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:bg-white'
                }`}
              />
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                يدعم أي خادم OpenAI-Compatible (مثل LiteLLM، vLLM، Azure، أو بوابات الشركات).
              </div>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  مفتاح الـ API السري (API Key){' '}
                  {!activePreset.requiresApiKey && (
                    <span className="text-[10px] font-normal text-slate-400">(اختياري لهذا المزود)</span>
                  )}
                </span>
              </label>

              {serverConfig?.hasApiKey && (
                <button
                  type="button"
                  data-testid="ai-config-clear-key-btn"
                  onClick={handleClearStoredKey}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>مسح المفتاح المحفوظ</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                data-testid="ai-config-apikey-input"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                autoComplete="off"
                placeholder={
                  canKeepExistingKey
                    ? `محفوظ مسبقاً على الخادم (${serverConfig?.maskedKeyPreview}) — اتركه فارغاً للإبقاء عليه أو أدخل مفتاحاً جديداً`
                    : activePreset.keyPlaceholder
                }
                dir="ltr"
                className={`w-full ps-3 pe-10 py-2.5 rounded-xl border text-xs font-mono font-bold outline-hidden ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                aria-label={showApiKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                className="absolute top-1/2 -translate-y-1/2 end-2.5 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Server className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>
                يُحفظ المفتاح بأمان على الخادم فقط ولا يُكشف أبداً في المتصفح أو localStorage.
              </span>
            </p>
          </div>

          {/* Temperature & System Prompt */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1">
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span>الإبداع (Temperature)</span>
                </span>
                <span className="font-mono text-indigo-600">{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="md:col-span-8 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                توجيه النظام المخصص (System Instruction) — ينطبق على الواتساب والتحليلات
              </label>
              <textarea
                rows={2}
                data-testid="ai-config-system-prompt-input"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="مثال: خاطب العملاء بلطف باللهجة الرسمية، والتزم بأرصدة الفواتير والضمان بدقة..."
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden resize-none ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Integrated Modules Strip */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 text-[11px] flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              الوحدات المتكاملة تلقائياً مع هذا الـ API:
            </span>
            {[
              'روبوت الواتساب للرد الآلي',
              'مساعد التحليل المالي والتقارير',
              'التنبؤ الذكي بالمخزون',
              'استخلاص فواتير المشتريات (OCR)',
              'مولّد سمات الألوان الذكي',
            ].map((modLabel) => (
              <span
                key={modLabel}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300"
              >
                {modLabel}
              </span>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              data-testid="ai-config-test-btn"
              disabled={isTesting || isSaving}
              onClick={handleTestConnection}
              className="px-4 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{isTesting ? 'جاري الاختبار...' : 'اختبار الاتصال المباشر'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
              >
                إغلاق
              </button>
              <button
                type="submit"
                data-testid="ai-config-save-btn"
                disabled={isSaving || isTesting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ وتفعيل لكل النظام'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
