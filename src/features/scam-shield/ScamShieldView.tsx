import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Camera,
  Upload,
  AlertTriangle,
  Share2,
  PhoneCall,
  ExternalLink,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { VerdictBadge } from '../../components/VerdictBadge';
import { AiErrorAlert } from '../../components/AiErrorAlert';
import { useI18n } from '../../i18n';
import { callGenerateApi, ApiError } from '../../services/apiClient';
import { ImageService } from '../../services/imageService';
import { detectAndMaskSensitiveData } from '../../utils/sensitiveData';
import { SCAM_EXAMPLES } from '../../constants';
import type { UserProfile, ScamVerdictStatus, ScamChannel } from '../../types';

export interface ScamAnalysisResult {
  verdict: ScamVerdictStatus;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  whyThisVerdict: string[];
  whatToDoNow: string[];
  neverDoThis: string[];
}

export interface ScamShieldViewProps {
  profile: UserProfile;
}

export const ScamShieldView: React.FC<ScamShieldViewProps> = ({ profile }) => {
  const { language, t } = useI18n();

  const [activeInputTab, setActiveInputTab] = useState<'text' | 'photo'>('text');
  const [inputText, setInputText] = useState('');
  const [channel, setChannel] = useState<ScamChannel>('sms');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [sensitiveWarning, setSensitiveWarning] = useState(false);
  const [result, setResult] = useState<ScamAnalysisResult | null>(null);

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
      const msg = err instanceof Error ? err.message : 'Failed to process screenshot';
      setError({ en: msg, hi: 'स्क्रीनशॉट लोड करने में समस्या हुई। कृपया दूसरी फोटो चुनें।' });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCheckSafety = async () => {
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
        messageText: cleanText,
        channel,
      };

      if (hasPhoto && imageBase64 && imageMimeType) {
        payload.imageBase64 = imageBase64;
        payload.mimeType = imageMimeType;
        payload.image = {
          base64: imageBase64,
          mimeType: imageMimeType,
        };
      }

      const data = await callGenerateApi<any>('scam_shield', language, payload, {
        signal: abortControllerRef.current.signal,
      });

      const normalizedResult: ScamAnalysisResult = {
        verdict: data.verdict,
        confidence: data.confidence || (data.confidenceScore && data.confidenceScore > 80 ? 'HIGH' : 'MEDIUM'),
        whyThisVerdict: data.whyThisVerdict || data.plainReasons || (data.summary ? [data.summary] : []),
        whatToDoNow: data.whatToDoNow || [],
        neverDoThis: data.neverDoThis || [],
      };

      setResult(normalizedResult);

      setTimeout(() => {
        if (resultRef.current) {
          resultRef.current.focus();
        }
      }, 100);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 499) return;
      console.error('[ScamShieldView Error]:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Build Alert Family link (SMS or WhatsApp)
  const buildAlertFamilyLink = () => {
    const contactPhone = profile.familyContactPhone?.replace(/[^0-9]/g, '') || '';
    const pretext = t.scam.alertFamilyPretext;
    const snippet = inputText.slice(0, 150);
    const fullText = encodeURIComponent(`${pretext}"${snippet}" - Analyzed with Sathi`);

    if (contactPhone) {
      return `https://wa.me/91${contactPhone}?text=${fullText}`;
    }
    return `sms:?body=${fullText}`;
  };

  const resultSpeech = result
    ? `${result.verdict === 'SAFE' ? t.scam.verdictSafe : result.verdict === 'SUSPICIOUS' ? t.scam.verdictSuspicious : t.scam.verdictScam}. ${t.scam.whyThisVerdict}: ${result.whyThisVerdict.join('. ')}. ${t.scam.whatToDoNow}: ${result.whatToDoNow.join('. ')}.`
    : '';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-[#0F2A33] tracking-tight">
          {t.scam.title}
        </h1>
        <p className="text-xl sm:text-2xl text-[#4A636C]">{t.scam.whatThisDoes}</p>
      </header>

      {/* Sensitive warning */}
      {sensitiveWarning && (
        <div
          role="alert"
          className="p-4 bg-[#FFF4DC] border-2 border-[#F4A300] rounded-2xl flex items-center gap-3 text-[#9A6700]"
        >
          <AlertCircle className="w-7 h-7 shrink-0" aria-hidden="true" />
          <p className="text-lg font-semibold">{t.securityAlert.sensitiveWarning}</p>
        </div>
      )}

      {/* Channel selector */}
      <div className="space-y-2">
        <label className="block text-xl font-bold text-[#0F2A33]">
          {t.scam.channelLabel}
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'sms', label: t.scam.channelSms },
            { id: 'whatsapp', label: t.scam.channelWhatsapp },
            { id: 'call', label: t.scam.channelCall },
            { id: 'email', label: t.scam.channelEmail },
            { id: 'link', label: t.scam.channelLink },
            { id: 'other', label: t.scam.channelOther },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={loading}
              onClick={() => setChannel(c.id as ScamChannel)}
              className={`px-4 py-2.5 rounded-xl font-bold text-base transition-all cursor-pointer ${
                channel === c.id
                  ? 'bg-[#0E7C86] text-white shadow-xs'
                  : 'bg-white text-[#4A636C] hover:text-[#0F2A33] border-2 border-[#E8DEC8]'
              } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs: Paste text vs screenshot */}
      <div
        role="tablist"
        aria-label="Input format tabs"
        className="flex items-center gap-3 border-b-2 border-[#E8DEC8] pb-2"
      >
        <button
          type="button"
          role="tab"
          id="scam-tab-text"
          disabled={loading}
          aria-selected={activeInputTab === 'text'}
          aria-controls="scam-panel-text"
          onClick={() => setActiveInputTab('text')}
          className={`min-h-[56px] px-6 py-2.5 rounded-2xl font-bold text-lg sm:text-xl flex items-center gap-2.5 transition-all cursor-pointer ${
            activeInputTab === 'text'
              ? 'bg-[#0E7C86] text-white shadow-xs'
              : 'bg-white text-[#243C45] hover:text-[#0F2A33] border-2 border-[#E8DEC8]'
          } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <FileText className="w-6 h-6" />
          <span>{t.scam.tabText}</span>
        </button>

        <button
          type="button"
          role="tab"
          id="scam-tab-photo"
          disabled={loading}
          aria-selected={activeInputTab === 'photo'}
          aria-controls="scam-panel-photo"
          onClick={() => setActiveInputTab('photo')}
          className={`min-h-[56px] px-6 py-2.5 rounded-2xl font-bold text-lg sm:text-xl flex items-center gap-2.5 transition-all cursor-pointer ${
            activeInputTab === 'photo'
              ? 'bg-[#0E7C86] text-white shadow-xs'
              : 'bg-white text-[#243C45] hover:text-[#0F2A33] border-2 border-[#E8DEC8]'
          } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <Camera className="w-6 h-6" />
          <span>{t.scam.tabPhoto}</span>
        </button>
      </div>

      {/* Panel 1: Text */}
      {activeInputTab === 'text' && (
        <div id="scam-panel-text" role="tabpanel" aria-labelledby="scam-tab-text" className="space-y-4">
          <textarea
            rows={4}
            value={inputText}
            disabled={loading}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.scam.textPlaceholder}
            maxLength={10000}
            className="w-full p-5 text-xl rounded-3xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] focus-visible:ring-3 focus-visible:ring-[#0E7C86] bg-white outline-none shadow-xs text-[#0F2A33] resize-y disabled:opacity-60"
          />

          {/* Example Suspicious Inputs */}
          <div className="space-y-2">
            <span className="text-sm font-bold text-[#243C45] uppercase tracking-wider block">
              {t.scam.tryExample}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SCAM_EXAMPLES.map((ex, idx) => {
                const label = language === 'hi' ? ex.titleHi : ex.titleEn;
                const text = ex.text;
                const isSafe = ex.titleEn.includes('Safe');
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setInputText(text);
                      setChannel(ex.channel);
                    }}
                    className={`p-3.5 rounded-xl bg-white border-2 border-[#E8DEC8] hover:border-[#0E7C86] hover:bg-[#FFF9EF] text-[#0F2A33] text-left text-base font-semibold transition-colors cursor-pointer flex items-center justify-between gap-2 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase ${
                        !isSafe
                          ? 'bg-[#FDE8E8] text-[#8B0000]'
                          : 'bg-[#E6F4F5] text-[#064E56]'
                      }`}
                    >
                      {!isSafe ? 'Scam Ex.' : 'Safe Ex.'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Panel 2: Screenshot */}
      {activeInputTab === 'photo' && (
        <div id="scam-panel-photo" role="tabpanel" aria-labelledby="scam-tab-photo" className="space-y-4">
          <Card
            variant="surface"
            className="p-8 text-center border-2 border-dashed border-[#0E7C86] bg-[#FFF9EF] space-y-4"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />

            <div className="w-20 h-20 rounded-3xl bg-[#FDE8E8] text-[#C62828] flex items-center justify-center mx-auto text-3xl">
              <Upload className="w-10 h-10" aria-hidden="true" />
            </div>

            <p className="text-xl sm:text-2xl font-bold text-[#0F2A33]">
              Upload a screenshot of the message, call screen, or link
            </p>

            <Button
              type="button"
              variant="primary"
              loading={isCompressing}
              onClick={() => fileInputRef.current?.click()}
              icon={<Camera className="w-6 h-6" />}
            >
              Choose Screenshot
            </Button>

            {imageFileName && imageBase64 && (
              <div className="p-4 bg-white border-2 border-[#0E7C86] rounded-2xl flex items-center justify-between gap-4 max-w-md mx-auto mt-4 text-left">
                <div className="flex items-center gap-3">
                  <img
                    src={imageBase64}
                    alt="Preview of uploaded screenshot"
                    className="w-16 h-16 object-cover rounded-xl border"
                  />
                  <div>
                    <span className="font-bold text-lg text-[#0F2A33] block truncate max-w-[180px]">
                      {imageFileName}
                    </span>
                    <span className="text-sm text-[#0E7C86] font-semibold">
                      {language === 'hi' ? 'सुरक्षा जांच के लिए तैयार' : 'Ready for safety check'}
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
        onClick={handleCheckSafety}
        icon={<ShieldAlert className="w-7 h-7" />}
        className="w-full"
      >
        {t.scam.submitButton}
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
          onRetry={handleCheckSafety}
          isRetrying={loading}
        />
      ) : null}

      {/* Results Display */}
      {result && (
        <section aria-labelledby="scam-result-heading" className="space-y-6">
          <Card
            variant="surface"
            className={`p-6 sm:p-8 space-y-6 border-3 ${
              result.verdict === 'LIKELY_SCAM'
                ? 'border-[#C62828] bg-[#FFFBFB]'
                : result.verdict === 'SUSPICIOUS'
                ? 'border-[#F4A300] bg-[#FFFDF8]'
                : 'border-[#0E7C86] bg-[#FBFFFF]'
            }`}
          >
            {/* Header with Verdict & Read Aloud */}
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#E8DEC8] pb-5">
              <div className="space-y-2">
                <span className="text-sm font-bold uppercase tracking-wider text-[#243C45] block">
                  {language === 'hi' ? 'सुरक्षा मूल्यांकन परिणाम' : 'Safety Assessment Result'}
                </span>
                <VerdictBadge verdict={result.verdict} size="large" />
              </div>
              <ReadAloudButton text={resultSpeech} language={language} />
            </div>

            {/* Why This Verdict */}
            <div className="space-y-3">
              <h2
                ref={resultRef}
                tabIndex={-1}
                id="scam-result-heading"
                className="text-2xl font-black text-[#0F2A33] focus-visible:outline-none"
              >
                {t.scam.whyThisVerdict}
              </h2>
              <div className="space-y-2">
                {result.whyThisVerdict.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white rounded-2xl border-2 border-[#E8DEC8] flex items-start gap-4"
                  >
                    <span className="w-8 h-8 rounded-xl bg-[#0F2A33] text-white flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-lg sm:text-xl font-semibold text-[#0F2A33] leading-relaxed">
                      {reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* What you should do right now */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-[#0E7C86]">{t.scam.whatToDoNow}</h3>
              <div className="space-y-2">
                {result.whatToDoNow.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#E6F4F5] rounded-2xl border border-[#0E7C86] flex items-start gap-3"
                  >
                    <ShieldCheck className="w-6 h-6 text-[#0E7C86] shrink-0 mt-0.5" />
                    <p className="text-lg sm:text-xl font-semibold text-[#0F2A33] leading-relaxed">
                      {action}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Never do this */}
            {result.neverDoThis && result.neverDoThis.length > 0 && (
              <div className="p-5 bg-[#FDE8E8] border-2 border-[#C62828] rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#8B0000] text-xl">
                  <AlertTriangle className="w-7 h-7" aria-hidden="true" />
                  <h4>{t.scam.neverDoThis}</h4>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-lg sm:text-xl font-medium text-[#0F2A33]">
                  {result.neverDoThis.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Bar: Alert Family & Cybercrime Helpline */}
            <div className="p-6 bg-[#FFF9EF] border-2 border-[#E8DEC8] rounded-3xl space-y-4">
              <h4 className="text-xl font-black text-[#0F2A33]">
                {language === 'hi' ? 'तुरंत मदद और रिपोर्ट' : 'Immediate Help & Reporting'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Alert Family */}
                <a
                  href={buildAlertFamilyLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[64px] px-6 py-3 rounded-2xl bg-[#0E7C86] hover:bg-[#095D65] text-white font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-sm"
                >
                  <Share2 className="w-6 h-6 shrink-0" />
                  <span>{t.scam.alertFamily}</span>
                </a>

                {/* Call 1930 */}
                <a
                  href="tel:1930"
                  className="min-h-[64px] px-6 py-3 rounded-2xl bg-[#C62828] hover:bg-[#A31F1F] text-white font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-sm"
                >
                  <PhoneCall className="w-6 h-6 shrink-0" />
                  <span>{t.scam.call1930}</span>
                </a>
              </div>

              <div className="text-center pt-2">
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-base font-bold text-[#0E7C86] hover:underline"
                >
                  <span>{t.scam.visitCyberPortal}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
};
