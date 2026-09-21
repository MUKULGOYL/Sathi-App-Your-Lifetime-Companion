import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { LanguageToggle } from '../../components/LanguageToggle';
import { useI18n } from '../../i18n';
import type { UserProfile, TextSize, SupportedLanguage } from '../../types';

export interface OnboardingModalProps {
  isOpen: boolean;
  initialProfile: UserProfile;
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  initialProfile,
  onComplete,
  onSkip,
}) => {
  const { t, language, setLanguage } = useI18n();

  const [name, setName] = useState(initialProfile.name || '');
  const [city, setCity] = useState(initialProfile.city || '');
  const [familyContactName, setFamilyContactName] = useState(initialProfile.familyContactName || '');
  const [familyContactPhone, setFamilyContactPhone] = useState(initialProfile.familyContactPhone || '');
  const [medicines, setMedicines] = useState(initialProfile.medicines || '');
  const [textSize, setTextSize] = useState<TextSize>(initialProfile.textSize || 'normal');

  const handleFinish = () => {
    onComplete({
      ...initialProfile,
      name: name.trim(),
      city: city.trim(),
      familyContactName: familyContactName.trim(),
      familyContactPhone: familyContactPhone.trim(),
      medicines: medicines.trim(),
      textSize,
      language: language as SupportedLanguage,
      isOnboarded: true,
    });
  };

  const handleSkipNow = () => {
    onSkip();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkipNow}
      title={t.onboarding.welcomeTitle}
      size="large"
    >
      <div className="space-y-6 text-[#0F2A33]">
        <p className="text-lg sm:text-xl text-[#4A636C] leading-relaxed">
          {t.onboarding.welcomeSubtitle}
        </p>

        {/* Step 1: Language */}
        <div className="p-4 bg-[#FFF9EF] rounded-2xl border-2 border-[#E8DEC8]">
          <label className="block text-xl font-bold mb-3 text-[#0F2A33]">
            1. {t.onboarding.step1Title}
          </label>
          <LanguageToggle size="large" />
        </div>

        {/* Step 2: Text Size */}
        <div className="p-4 bg-[#FFF9EF] rounded-2xl border-2 border-[#E8DEC8]">
          <label className="block text-xl font-bold mb-3 text-[#0F2A33]">
            2. {t.onboarding.step2Title}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'normal', label: t.settings.textSizeNormal, preview: 'Aa (20px)' },
              { id: 'large', label: t.settings.textSizeLarge, preview: 'Aa (24px)' },
              { id: 'xlarge', label: t.settings.textSizeXLarge, preview: 'Aa (28px)' },
            ].map((sizeOpt) => (
              <button
                key={sizeOpt.id}
                type="button"
                onClick={() => {
                  setTextSize(sizeOpt.id as TextSize);
                  document.documentElement.setAttribute('data-text-size', sizeOpt.id);
                }}
                className={`p-4 rounded-xl font-bold text-center border-2 transition-all cursor-pointer ${
                  textSize === sizeOpt.id
                    ? 'bg-[#0E7C86] text-white border-[#0E7C86] shadow-sm'
                    : 'bg-white text-[#0F2A33] border-[#E8DEC8] hover:border-[#0E7C86]'
                }`}
              >
                <div className="text-xl mb-1">{sizeOpt.preview}</div>
                <div className="text-sm">{sizeOpt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Name */}
        <div>
          <label htmlFor="onboarding-name" className="block text-xl font-bold mb-2">
            3. {t.onboarding.step3Title}
          </label>
          <input
            id="onboarding-name"
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.onboarding.namePlaceholder}
            className="w-full min-h-[64px] px-5 text-xl rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] focus-visible:ring-3 focus-visible:ring-[#0E7C86] bg-white outline-none"
          />
        </div>

        {/* Step 4: City */}
        <div>
          <label htmlFor="onboarding-city" className="block text-xl font-bold mb-2">
            4. {t.onboarding.step4Title} ({t.common.optional})
          </label>
          <input
            id="onboarding-city"
            type="text"
            maxLength={100}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t.onboarding.cityPlaceholder}
            className="w-full min-h-[64px] px-5 text-xl rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] focus-visible:ring-3 focus-visible:ring-[#0E7C86] bg-white outline-none"
          />
        </div>

        {/* Step 5: Family Contact */}
        <div className="p-4 bg-[#FFF9EF] rounded-2xl border-2 border-[#E8DEC8] space-y-4">
          <div>
            <label className="block text-xl font-bold mb-1 text-[#0F2A33]">
              5. {t.onboarding.step5Title} ({t.common.optional})
            </label>
            <p className="text-sm text-[#243C45]">{t.onboarding.familyContactDesc}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              maxLength={100}
              aria-label={t.onboarding.familyNamePlaceholder}
              value={familyContactName}
              onChange={(e) => setFamilyContactName(e.target.value)}
              placeholder={t.onboarding.familyNamePlaceholder}
              className="w-full min-h-[56px] px-4 text-lg rounded-xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none"
            />
            <input
              type="tel"
              maxLength={20}
              aria-label={t.onboarding.familyPhonePlaceholder}
              value={familyContactPhone}
              onChange={(e) => setFamilyContactPhone(e.target.value)}
              placeholder={t.onboarding.familyPhonePlaceholder}
              className="w-full min-h-[56px] px-4 text-lg rounded-xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none"
            />
          </div>
        </div>

        {/* Step 6: Daily medicines */}
        <div>
          <label htmlFor="onboarding-medicines" className="block text-xl font-bold mb-2">
            6. {t.onboarding.step6Title} ({t.common.optional})
          </label>
          <textarea
            id="onboarding-medicines"
            rows={2}
            maxLength={500}
            value={medicines}
            onChange={(e) => setMedicines(e.target.value)}
            placeholder={t.onboarding.medicinesPlaceholder}
            className="w-full p-4 text-lg rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] focus-visible:ring-3 focus-visible:ring-[#0E7C86] bg-white outline-none resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8DEC8] flex-wrap">
          <Button type="button" variant="ghost" onClick={handleSkipNow}>
            {t.onboarding.skipButton}
          </Button>
          <Button type="button" variant="primary" onClick={handleFinish}>
            {t.onboarding.finishButton}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
