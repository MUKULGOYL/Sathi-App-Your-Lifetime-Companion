import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CalendarPlus,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { Modal } from '../../components/Modal';
import { AiErrorAlert } from '../../components/AiErrorAlert';
import { useI18n } from '../../i18n';
import { callGenerateApi, ApiError } from '../../services/apiClient';
import { ImageService } from '../../services/imageService';
import { detectAndMaskSensitiveData } from '../../utils/sensitiveData';
import { SIMPLIFY_EXAMPLES } from '../../constants';
import type { ReminderItem } from '../../types';

export interface SimplifyResult {
  documentType: string;
  whatItIs: string;
  whatYouNeedToDo: string[];
  importantDatesAndAmounts: Array<{
    item: string;
    value: string;
    rawDate?: string;
  }>;
  redFlagsOrWarnings: string[];
  helplineNumber?: string;
}

export interface SimplifyViewProps {
  onAddReminder: (reminder: Omit<ReminderItem, 'id' | 'completed'>) => void;
}

export const SimplifyView: React.FC<SimplifyViewProps> = ({ onAddReminder }) => {
  const { language, t } = useI18n();

  const [activeInputTab, setActiveInputTab] = useState<'text' | 'photo'>('text');
  const [inputText, setInputText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [sensitiveWarning, setSensitiveWarning] = useState(false);
  const [result, setResult] = useState<SimplifyResult | null>(null);

  // Reminder creation modal from detected date
  const [selectedDateItem, setSelectedDateItem] = useState<{
    item: string;
    value: string;
    rawDate?: string;
  } | null>(null);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderSavedText, setReminderSavedText] = useState<string | null>(null);

  const resultRef = useRef<HTMLHeadingElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setError(null);

    try {
      const compressed = await ImageService.compressImageFile(file);
      setImageBase64(compressed.base64);
      setImageMimeType(compressed.mimeType);
      setImageFileName(file.name);
    } catch (err: unknown) {
      console.error('[Image compression error]:', err);
      const msg = err instanceof Error ? err.message : 'Failed to process image';
      setError({ en: msg, hi: 'फोटो लोड करने में त्रुटि हुई। कृपया दूसरी फोटो चुनें।' });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSimplify = async () => {
    const hasText = inputText.trim().length > 0;
    const hasPhoto = !!imageBase64;

    if (!hasText && !hasPhoto) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setResult(null);
    setReminderSavedText(null);

    let cleanText = inputText;
    if (hasText) {
      const detection = detectAndMaskSensitiveData(inputText);
      if (detection.hasSensitiveData) {
        setSensitiveWarning(true);
        setTimeout(() => setSensitiveWarning(false), 6000);
      }
      cleanText = detection.maskedText;
    }

    try {
      const payload: Record<string, unknown> = {
        text: cleanText,
      };

      if (hasPhoto && imageBase64 && imageMimeType) {
        payload.imageBase64 = imageBase64;
        payload.mimeType = imageMimeType;
        payload.image = {
          base64: imageBase64,
          mimeType: imageMimeType,
        };
      }

      const data = await callGenerateApi<any>('simplify', language, payload, {
        signal: abortControllerRef.current.signal,
      });

      const normalizedResult: SimplifyResult = {
        documentType: data.documentType || (data.whatIsThis ? (data.whatIsThis.split('.')[0].slice(0, 60)) : (language === 'hi' ? 'दस्तावेज़' : 'Document')),
        whatItIs: data.whatItIs || data.whatIsThis || '',
        whatYouNeedToDo: data.whatYouNeedToDo || data.actionSteps || [],
        importantDatesAndAmounts: data.importantDatesAndAmounts || (data.keyDatesAndAmounts || []).map((k: any) => ({
          item: k.item || k.label || (language === 'hi' ? 'तारीख / राशि' : 'Key detail'),
          value: k.value || [k.amount, k.isoDate, k.note].filter(Boolean).join(' • ') || (language === 'hi' ? 'विवरण' : 'Details'),
          rawDate: k.rawDate || k.isoDate || undefined,
        })),
        redFlagsOrWarnings: data.redFlagsOrWarnings || data.beCarefulAbout || [],
        helplineNumber: data.helplineNumber || data.contactOrHelpline || undefined,
      };

      setResult(normalizedResult);

      setTimeout(() => {
        if (resultRef.current) {
          resultRef.current.focus();
        }
      }, 100);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 499) return;
      console.error('[SimplifyView Error]:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAddReminder = () => {
    if (!selectedDateItem) return;

    const today = new Date();
    const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const cleanDate = selectedDateItem.rawDate || defaultDate;

    onAddReminder({
      title: `${result?.documentType || 'Bill'}: ${selectedDateItem.item}`,
      category: 'bill',
      date: cleanDate,
      time: '10:00',
      repeat: 'none',
      source: 'simplify',
    });

    setReminderModalOpen(false);
    setReminderSavedText(selectedDateItem.item);
    setTimeout(() => setReminderSavedText(null), 5000);
  };

  const resultSpeechText = result
    ? `${result.documentType}. ${result.whatItIs}. ${t.simplify.actionStepsTitle}: ${result.whatYouNeedToDo.join('. ')}. ${result.redFlagsOrWarnings.length > 0 ? t.simplify.beCarefulTitle + ': ' + result.redFlagsOrWarnings.join('. ') : ''}`
    : '';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-[#0F2A33] tracking-tight">
          {t.simplify.title}
        </h1>
        <p className="text-xl sm:text-2xl text-[#4A636C]">{t.simplify.whatThisDoes}</p>
      </header>

      {/* Sensitive Data Warning */}
      {sensitiveWarning && (
        <div
          role="alert"
          className="p-4 bg-[#FFF4DC] border-2 border-[#F4A300] rounded-2xl flex items-center gap-3 text-[#9A6700]"
        >
          <AlertCircle className="w-7 h-7 shrink-0" aria-hidden="true" />
          <p className="text-lg font-semibold">{t.securityAlert.sensitiveWarning}</p>
        </div>
      )}

      {/* Input Selector Tabs: Text vs Photo */}
      <div
        role="tablist"
        aria-label="Input mode selection"
        className="flex items-center gap-3 border-b-2 border-[#E8DEC8] pb-2"
      >
        <button
          type="button"
          role="tab"
          id="simplify-tab-text"
          disabled={loading}
          aria-selected={activeInputTab === 'text'}
          aria-controls="simplify-panel-text"
          onClick={() => setActiveInputTab('text')}
          className={`min-h-[56px] px-6 py-2.5 rounded-2xl font-bold text-lg sm:text-xl flex items-center gap-2.5 transition-all cursor-pointer ${
            activeInputTab === 'text'
              ? 'bg-[#0E7C86] text-white shadow-xs'
              : 'bg-white text-[#4A636C] hover:text-[#0F2A33] border-2 border-[#E8DEC8]'
          } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <FileText className="w-6 h-6" aria-hidden="true" />
          <span>{t.simplify.tabText}</span>
        </button>

        <button
          type="button"
          role="tab"
          id="simplify-tab-photo"
          disabled={loading}
          aria-selected={activeInputTab === 'photo'}
          aria-controls="simplify-panel-photo"
          onClick={() => setActiveInputTab('photo')}
          className={`min-h-[56px] px-6 py-2.5 rounded-2xl font-bold text-lg sm:text-xl flex items-center gap-2.5 transition-all cursor-pointer ${
            activeInputTab === 'photo'
              ? 'bg-[#0E7C86] text-white shadow-xs'
              : 'bg-white text-[#243C45] hover:text-[#0F2A33] border-2 border-[#E8DEC8]'
          } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <Camera className="w-6 h-6" aria-hidden="true" />
          <span>{t.simplify.tabPhoto}</span>
        </button>
      </div>

      {/* Panel 1: Text Paste */}
      {activeInputTab === 'text' && (
        <div id="simplify-panel-text" role="tabpanel" aria-labelledby="simplify-tab-text" className="space-y-4">
          <textarea
            rows={5}
            value={inputText}
            disabled={loading}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.simplify.textPlaceholder}
            maxLength={10000}
            className="w-full p-5 text-xl rounded-3xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] focus-visible:ring-3 focus-visible:ring-[#0E7C86] bg-white outline-none shadow-xs text-[#0F2A33] resize-y disabled:opacity-60"
          />

          {/* Example Buttons */}
          <div className="space-y-2">
            <span className="text-sm font-bold text-[#243C45] uppercase tracking-wider block">
              {t.simplify.tryExample}
            </span>
            <div className="flex flex-wrap gap-2">
              {SIMPLIFY_EXAMPLES.map((ex, idx) => {
                const label = language === 'hi' ? ex.titleHi : ex.titleEn;
                const text = ex.text;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => setInputText(text)}
                    className={`px-4 py-2 rounded-xl bg-white border-2 border-[#E8DEC8] hover:border-[#0E7C86] hover:bg-[#E6F4F5] text-[#0F2A33] text-base font-semibold transition-colors cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Panel 2: Photo Upload */}
      {activeInputTab === 'photo' && (
        <div id="simplify-panel-photo" role="tabpanel" aria-labelledby="simplify-tab-photo" className="space-y-4">
          <Card
            variant="surface"
            className="p-8 text-center border-2 border-dashed border-[#0E7C86] bg-[#FFF9EF] space-y-4"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
              id="photo-upload-input"
            />

            <div className="w-20 h-20 rounded-3xl bg-[#E6F4F5] text-[#0E7C86] flex items-center justify-center mx-auto text-3xl">
              <Upload className="w-10 h-10" aria-hidden="true" />
            </div>

            <p className="text-xl sm:text-2xl font-bold text-[#0F2A33]">
              {t.simplify.photoDesc}
            </p>

            <Button
              type="button"
              variant="primary"
              loading={isCompressing}
              loadingText={t.simplify.compressing}
              onClick={() => fileInputRef.current?.click()}
              icon={<Camera className="w-6 h-6" />}
            >
              {t.simplify.photoButton}
            </Button>

            {imageFileName && imageBase64 && (
              <div className="p-4 bg-white border-2 border-[#0E7C86] rounded-2xl flex items-center justify-between gap-4 max-w-md mx-auto mt-4 text-left">
                <div className="flex items-center gap-3">
                  <img
                    src={imageBase64}
                    alt="Preview of uploaded document"
                    className="w-16 h-16 object-cover rounded-xl border"
                  />
                  <div>
                    <span className="font-bold text-lg text-[#0F2A33] block truncate max-w-[180px]">
                      {imageFileName}
                    </span>
                    <span className="text-sm text-[#0E7C86] font-semibold">
                      {language === 'hi' ? 'विश्लेषण के लिए तैयार' : 'Ready for analysis'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImageBase64(null);
                    setImageFileName(null);
                  }}
                  className="text-sm font-bold text-[#C62828] hover:underline"
                >
                  {language === 'hi' ? 'हटाएं' : 'Remove'}
                </button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="button"
        variant="primary"
        size="large"
        loading={loading}
        disabled={loading || isCompressing || (!inputText.trim() && !imageBase64)}
        onClick={handleSimplify}
        icon={<Sparkles className="w-7 h-7" />}
        className="w-full"
      >
        {t.simplify.submitButton}
      </Button>

      {/* Loading State */}
      {loading && (
        <Card variant="surface">
          <Spinner message={t.common.loadingMessage} size="large" />
        </Card>
      )}

      {/* Error State */}
      {error ? (
        <AiErrorAlert
          error={error}
          language={language}
          onRetry={handleSimplify}
          isRetrying={loading}
        />
      ) : null}

      {/* Reminder confirmation toast */}
      {reminderSavedText && (
        <div
          role="status"
          className="p-4 bg-[#E6F4F5] border-2 border-[#0E7C86] text-[#064E56] font-bold rounded-2xl flex items-center gap-3"
        >
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <span className="text-lg">{t.simplify.reminderSaved} ({reminderSavedText})</span>
        </div>
      )}

      {/* Structured Result Display */}
      {result && (
        <section aria-labelledby="simplify-result-heading" className="space-y-6">
          <Card variant="surface" className="p-6 sm:p-8 space-y-6 border-2 border-[#0E7C86]">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#E8DEC8] pb-5">
              <div>
                <span className="text-sm font-bold uppercase tracking-wider text-[#064E56] block">
                  {language === 'hi' ? 'दस्तावेज़ विश्लेषण' : 'Document Analysis'}
                </span>
                <h2
                  ref={resultRef}
                  tabIndex={-1}
                  id="simplify-result-heading"
                  className="text-2xl sm:text-3xl font-black text-[#0F2A33] focus-visible:outline-none"
                >
                  {result.documentType}
                </h2>
              </div>
              <ReadAloudButton text={resultSpeechText} language={language} />
            </div>

            {/* What this is */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#0E7C86]">{t.simplify.whatIsThisTitle}</h3>
              <p className="text-xl text-[#0F2A33] font-medium leading-relaxed bg-[#FFF9EF] p-5 rounded-2xl border border-[#E8DEC8]">
                {result.whatItIs}
              </p>
            </div>

            {/* What you need to do */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-[#0F2A33]">{t.simplify.actionStepsTitle}</h3>
              <div className="space-y-2">
                {result.whatYouNeedToDo.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white rounded-2xl border-2 border-[#E8DEC8] flex items-start gap-4"
                  >
                    <span className="w-8 h-8 rounded-xl bg-[#0E7C86] text-white flex items-center justify-center font-black text-base shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-lg sm:text-xl font-semibold text-[#0F2A33] leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Important dates and amounts */}
            {result.importantDatesAndAmounts && result.importantDatesAndAmounts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-[#0F2A33]">
                  {t.simplify.datesAndAmountsTitle}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.importantDatesAndAmounts.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#FFF4DC] border-2 border-[#F4A300] rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-sm font-bold text-[#6B4300] uppercase block">
                          {item.item}
                        </span>
                        <span className="text-xl font-black text-[#0F2A33]">{item.value}</span>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => {
                          setSelectedDateItem(item);
                          setReminderModalOpen(true);
                        }}
                        aria-label={`${t.simplify.addToReminders} for ${item.item}`}
                        title={t.simplify.addToReminders}
                        className="min-h-[50px] min-w-[50px] bg-white border-[#F4A300]"
                      >
                        <CalendarPlus className="w-6 h-6 text-[#6B4300]" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Red flags / Warnings */}
            {result.redFlagsOrWarnings && result.redFlagsOrWarnings.length > 0 && (
              <div className="p-5 bg-[#FDE8E8] border-2 border-[#C62828] rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#8B0000] text-lg">
                  <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                  <h4>{t.simplify.beCarefulTitle}</h4>
                </div>
                <ul className="list-disc list-inside space-y-1 text-lg text-[#0F2A33]">
                  {result.redFlagsOrWarnings.map((warning, wIdx) => (
                    <li key={wIdx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Helpline number */}
            {result.helplineNumber && (
              <div className="p-4 bg-[#E6F4F5] border-2 border-[#0E7C86] rounded-2xl flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <PhoneCall className="w-6 h-6 text-[#064E56]" />
                  <div>
                    <span className="text-sm font-semibold text-[#064E56] block">
                      {t.simplify.contactHelpline}
                    </span>
                    <span className="text-2xl font-black text-[#0F2A33]">
                      {result.helplineNumber}
                    </span>
                  </div>
                </div>
                <a
                  href={`tel:${result.helplineNumber.replace(/[^0-9]/g, '')}`}
                  className="min-h-[56px] px-6 py-2.5 rounded-xl bg-[#0E7C86] text-white font-bold text-lg flex items-center gap-2"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>{language === 'hi' ? 'हेल्पलाइन पर कॉल करें' : 'Call Helpline'}</span>
                </a>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Confirmation Modal to Add Date to Reminders */}
      <Modal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title={t.simplify.confirmReminderTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReminderModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" onClick={handleConfirmAddReminder}>
              {t.simplify.addToReminders}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xl text-[#0F2A33]">
            {t.simplify.confirmReminderTitle}
          </p>
          <div className="p-4 bg-[#FFF9EF] border-2 border-[#E8DEC8] rounded-2xl">
            <span className="text-sm font-bold text-[#4A636C] uppercase block">
              {selectedDateItem?.item}
            </span>
            <span className="text-2xl font-black text-[#0F2A33]">
              {selectedDateItem?.value}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
