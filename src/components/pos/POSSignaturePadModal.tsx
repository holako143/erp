import React, { useRef, useState, useEffect } from 'react';
import { PenTool, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { useModalLayer, renderModalPortal } from '../../core/modalLayerEngine';

export interface POSSignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (base64Png: string) => void;
  language: 'ar' | 'en';
  customerName?: string;
  invoiceNumber?: string;
}

export const POSSignaturePadModal: React.FC<POSSignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
  language,
  customerName,
  invoiceNumber,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const { zIndex, isTopLayer } = useModalLayer(isOpen, 70);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopLayer) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopLayer, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas high resolution backing store
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    setHasDrawn(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSignature(dataUrl);
    onClose();
  };

  return renderModalPortal(
    <div
      data-testid="pos-signature-pad-modal"
      data-modal-top={isTopLayer ? 'true' : 'false'}
      style={{ zIndex }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">
                {language === 'ar' ? 'توقيع العميل الإلكتروني المعتمد' : 'Customer Digital Signature'}
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {customerName ? `${customerName} ${invoiceNumber ? `(${invoiceNumber})` : ''}` : (language === 'ar' ? 'وقع في المساحة المخصصة أدناه' : 'Sign in the designated area below')}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="pos-signature-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-5 space-y-3">
          <div className="relative w-full h-56 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden touch-none shadow-inner flex items-center justify-center">
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-semibold">
                {language === 'ar' ? 'ارسم توقيعك هنا (بإصبعك أو الماوس)...' : 'Draw your signature here...'}
              </div>
            )}
            <canvas
              ref={canvasRef}
              data-testid="pos-signature-canvas"
              className="w-full h-full cursor-crosshair bg-transparent"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>{language === 'ar' ? 'معتمد رسمياً ضمن بيانات الفاتورة المادية' : 'Official invoice metadata'}</span>
            <button
              type="button"
              data-testid="pos-signature-clear-btn"
              onClick={handleClear}
              className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'مسح التوقيع' : 'Clear'}</span>
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid="pos-signature-cancel-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            data-testid="pos-signature-confirm-btn"
            disabled={!hasDrawn}
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
              !hasDrawn
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{language === 'ar' ? 'اعتماد وإرفاق التوقيع' : 'Attach Signature'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
