/**
 * RLM ERP — Universal Multi-Provider AI Configuration Engine
 * Pure Logic for AI Provider Presets, Endpoint Normalization, Key Masking & Validation.
 * Works seamlessly with Google Gemini, OpenAI, Anthropic Claude, DeepSeek, Groq,
 * OpenRouter, Ollama (local), and any OpenAI-compatible Custom API endpoint.
 */

export type AiProviderId =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'groq'
  | 'openrouter'
  | 'ollama'
  | 'custom_openai';

export interface AiProviderPreset {
  id: AiProviderId;
  nameAr: string;
  nameEn: string;
  vendorName: string;
  protocol: 'GEMINI_NATIVE' | 'ANTHROPIC_MESSAGES' | 'OPENAI_CHAT_COMPLETIONS';
  defaultBaseUrl: string;
  defaultModel: string;
  suggestedModels: string[];
  requiresApiKey: boolean;
  keyPlaceholder: string;
  descriptionAr: string;
}

export interface UniversalAiConfigPublic {
  provider: AiProviderId;
  providerLabelAr: string;
  providerLabelEn: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  temperature: number;
  systemPrompt: string;
  hasApiKey: boolean;
  maskedKeyPreview: string;
  usingEnvFallback: boolean;
  updatedAt?: string;
}

export interface UniversalAiConfigInput {
  provider: AiProviderId;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  enabled?: boolean;
  temperature?: number;
  systemPrompt?: string;
  clearStoredKey?: boolean;
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: 'gemini',
    nameAr: 'جوجل جيمناي (Google Gemini)',
    nameEn: 'Google Gemini',
    vendorName: 'Google',
    protocol: 'GEMINI_NATIVE',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-4-hydrogen',
    suggestedModels: ['gemini-4-hydrogen', 'gemini-3.8-flash'],
    requiresApiKey: true,
    keyPlaceholder: 'AIzaSy...',
    descriptionAr: 'الربط الرسمي مع Google Gemini SDK للتحليل، الفواتير، الثيمات، والرد الآلي.',
  },
  {
    id: 'openai',
    nameAr: 'أوبن إيه آي (OpenAI / ChatGPT)',
    nameEn: 'OpenAI (GPT)',
    vendorName: 'OpenAI',
    protocol: 'OPENAI_CHAT_COMPLETIONS',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'o4-mini'],
    requiresApiKey: true,
    keyPlaceholder: 'sk-proj-...',
    descriptionAr: 'نماذج OpenAI ChatGPT والنماذج الاستنتاجية لكافة خدمات النظام والواتساب.',
  },
  {
    id: 'anthropic',
    nameAr: 'أنثروبيك كلود (Anthropic Claude)',
    nameEn: 'Anthropic Claude',
    vendorName: 'Anthropic',
    protocol: 'ANTHROPIC_MESSAGES',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-7-sonnet-latest',
    suggestedModels: [
      'claude-3-7-sonnet-latest',
      'claude-3-5-haiku-latest',
      'claude-sonnet-4-20250514',
    ],
    requiresApiKey: true,
    keyPlaceholder: 'sk-ant-api03-...',
    descriptionAr: 'بروتوكول Anthropic Messages الرسمي لردود الواتساب والتدقيق المالي.',
  },
  {
    id: 'deepseek',
    nameAr: 'ديب سيك (DeepSeek AI)',
    nameEn: 'DeepSeek AI',
    vendorName: 'DeepSeek',
    protocol: 'OPENAI_CHAT_COMPLETIONS',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    requiresApiKey: true,
    keyPlaceholder: 'sk-...',
    descriptionAr: 'محرك DeepSeek عالي الكفاءة ومنخفض التكلفة للرد الآلي والتحليلات.',
  },
  {
    id: 'groq',
    nameAr: 'جروك السريع (Groq Cloud)',
    nameEn: 'Groq Cloud',
    vendorName: 'Groq',
    protocol: 'OPENAI_CHAT_COMPLETIONS',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    suggestedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen-qwq-32b'],
    requiresApiKey: true,
    keyPlaceholder: 'gsk_...',
    descriptionAr: 'استجابة فائقة السرعة لردود الواتساب الفورية والمساعد المحاسبي.',
  },
  {
    id: 'openrouter',
    nameAr: 'أوبن راوتر (OpenRouter Multi-Model)',
    nameEn: 'OpenRouter',
    vendorName: 'OpenRouter',
    protocol: 'OPENAI_CHAT_COMPLETIONS',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    suggestedModels: [
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    requiresApiKey: true,
    keyPlaceholder: 'sk-or-v1-...',
    descriptionAr: 'بوابة موحدة للوصول إلى مئات النماذج من جميع الشركات بمفتاح واحد.',
  },
  {
    id: 'ollama',
    nameAr: 'أولاما محلي (Ollama Local AI)',
    nameEn: 'Ollama (Local / Offline)',
    vendorName: 'Ollama',
    protocol: 'OPENAI_CHAT_COMPLETIONS',
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    defaultModel: 'qwen2.5:7b',
    suggestedModels: ['qwen2.5:7b', 'llama3.2', 'mistral', 'gemma3'],
    requiresApiKey: false,
    keyPlaceholder: 'اختياري (مثال: ollama)',
    descriptionAr: 'تشغيل نماذج ذكاء اصطناعي محلياً على جهازك أو الشبكة بدون إنترنت أو رسوم.',
  },
  {
    id: 'custom_openai',
    nameAr: 'مزود مخصص (Custom OpenAI-Compatible)',
    nameEn: 'Custom API / Compatible Endpoint',
    vendorName: 'Custom',
    protocol: 'OPENAI_CHAT_COMPLETIONS',
    defaultBaseUrl: 'https://api.example.com/v1',
    defaultModel: 'custom-model',
    suggestedModels: ['custom-model'],
    requiresApiKey: false,
    keyPlaceholder: 'أدخل API Key إن وجد...',
    descriptionAr: 'ربط أي شركة أو خادم ذكاء اصطناعي خاص متوافق مع OpenAI Chat Completions.',
  },
];

export function getAiProviderPreset(providerId?: string): AiProviderPreset {
  const found = AI_PROVIDER_PRESETS.find((p) => p.id === providerId);
  return found || AI_PROVIDER_PRESETS[0];
}

export function normalizeAiBaseUrl(provider: AiProviderId, customBaseUrl?: string): string {
  const preset = getAiProviderPreset(provider);
  const raw = String(customBaseUrl || '').trim();
  if (!raw) return preset.defaultBaseUrl;
  return raw.replace(/\/+$/, '');
}

export function buildChatCompletionsEndpoint(baseUrl: string): string {
  const clean = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!clean) return 'https://api.openai.com/v1/chat/completions';
  if (/\/chat\/completions$/i.test(clean)) return clean;
  if (/\/v1$/i.test(clean)) return `${clean}/chat/completions`;
  return `${clean}/chat/completions`;
}

export function maskApiKey(rawKey?: string): string {
  const clean = String(rawKey || '').trim();
  if (!clean) return '';
  if (clean.length <= 8) return '••••' + clean.slice(-2);
  return `${clean.slice(0, 4)}••••••${clean.slice(-4)}`;
}

export function validateUniversalAiConfigInput(
  input: Partial<UniversalAiConfigInput>,
  hasExistingStoredKey = false
): {
  valid: boolean;
  errorAr?: string;
  provider: AiProviderId;
  normalizedBaseUrl: string;
  normalizedModel: string;
} {
  const preset = getAiProviderPreset(input.provider);
  const provider = preset.id;
  const normalizedBaseUrl = normalizeAiBaseUrl(provider, input.baseUrl);
  const normalizedModel = String(input.model || '').trim() || preset.defaultModel;

  if (!normalizedModel) {
    return {
      valid: false,
      errorAr: 'يجب تحديد اسم النموذج (Model Name) قبل الحفظ أو الاختبار.',
      provider,
      normalizedBaseUrl,
      normalizedModel,
    };
  }

  if (
    preset.protocol !== 'GEMINI_NATIVE' &&
    !/^https?:\/\/.+/i.test(normalizedBaseUrl)
  ) {
    return {
      valid: false,
      errorAr: 'يجب إدخال رابط Endpoint صحيح يبدأ بـ https:// أو http://.',
      provider,
      normalizedBaseUrl,
      normalizedModel,
    };
  }

  const incomingKey = String(input.apiKey || '').trim();
  const keepsExisting = incomingKey === '__KEEP_EXISTING__' && hasExistingStoredKey;
  const isEnabled = input.enabled !== false;

  if (
    isEnabled &&
    preset.requiresApiKey &&
    provider !== 'gemini' &&
    !keepsExisting &&
    (!incomingKey || input.clearStoredKey)
  ) {
    return {
      valid: false,
      errorAr: `مزود (${preset.nameAr}) يتطلب إدخال مفتاح API Key صالح للتشغيل.`,
      provider,
      normalizedBaseUrl,
      normalizedModel,
    };
  }

  return {
    valid: true,
    provider,
    normalizedBaseUrl,
    normalizedModel,
  };
}
