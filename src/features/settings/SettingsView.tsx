import React, { useState } from 'react';
import {
  Languages,
  Type,
  SunMoon,
  Volume2,
  Bell,
  User,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { LanguageToggle } from '../../components/LanguageToggle';
import { NotificationService } from '../../services/notificationService';
import { useI18n } from '../../i18n';
import { APP_LIMITS } from '../../constants';
import type { UserProfile, TextSize, AppTheme, SpeechSpeed } from '../../types';

export interface SettingsViewProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateProfile,
  onClearAllData,
}) => {
  const { language, t } = useI18n();

  const [name, setName] = useState(profile.name || '');
  const [city, setCity] = useState(profile.city || '');
  const [familyName, setFamilyName] = useState(profile.familyContactName || '');
  const [familyPhone, setFamilyPhone] = useState(profile.familyContactPhone || '');
  const [medicines, setMedicines] = useState(profile.medicines || '');
  const [textSize, setTextSize] = useState<TextSize>(profile.textSize || 'normal');
  const [theme, setTheme] = useState<AppTheme>(profile.theme || 'light');
  const [speechSpeed, setSpeechSpeed] = useState<SpeechSpeed>(profile.speechSpeed || 1.0);
  const [notifications, setNotifications] = useState(profile.notificationsEnabled || false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: name.trim(),
      city: city.trim(),
      familyContactName: familyName.trim(),
      familyContactPhone: familyPhone.trim(),
      medicines: medicines.trim(),
      textSize,
      theme,
      speechSpeed,
      notificationsEnabled: notifications,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), APP_LIMITS.SAVED_FEEDBACK_TIMEOUT_MS);
  };

  const handleTextSizeChange = (newSize: TextSize) => {
    setTextSize(newSize);
    document.documentElement.setAttribute('data-text-size', newSize);
    onUpdateProfile({ ...profile, textSize: newSize });
  };

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    onUpdateProfile({ ...profile, theme: newTheme });
  };

  const handleSpeechSpeedChange = (speed: SpeechSpeed) => {
    setSpeechSpeed(speed);
    onUpdateProfile({ ...profile, speechSpeed: speed });
  };

  const handleToggleNotifications = async () => {
    if (!notifications) {
      const granted = await NotificationService.requestPermission();
      setNotifications(granted);
      onUpdateProfile({ ...profile, notificationsEnabled: granted });
    } else {
      setNotifications(false);
      onUpdateProfile({ ...profile, notificationsEnabled: false });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-[#0F2A33] tracking-tight">
          {t.settings.title}
        </h1>
        <p className="text-xl sm:text-2xl text-[#243C45]">{t.settings.whatThisDoes}</p>
      </header>

      {/* Language Section */}
      <Card variant="surface" className="p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Languages className="w-7 h-7 text-[#0E7C86]" />
          <h2 className="text-2xl font-black text-[#0F2A33]">
            {t.settings.languageHeading}
          </h2>
        </div>
        <LanguageToggle size="large" />
      </Card>

      {/* Text Size Section */}
      <Card variant="surface" className="p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Type className="w-7 h-7 text-[#0E7C86]" />
          <h2 className="text-2xl font-black text-[#0F2A33]">
            {t.settings.textSizeHeading}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'normal', label: t.settings.textSizeNormal, preview: 'Aa' },
            { id: 'large', label: t.settings.textSizeLarge, preview: 'Aa' },
            { id: 'xlarge', label: t.settings.textSizeXLarge, preview: 'Aa' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTextSizeChange(item.id as TextSize)}
              className={`p-4 rounded-2xl border-2 font-bold transition-all text-center cursor-pointer ${
                textSize === item.id
                  ? 'bg-[#0E7C86] text-white border-[#0E7C86] shadow-sm'
                  : 'bg-white text-[#0F2A33] border-[#E8DEC8] hover:border-[#0E7C86]'
              }`}
            >
              <div
                className={`font-black mb-1 ${
                  item.id === 'normal' ? 'text-2xl' : item.id === 'large' ? 'text-3xl' : 'text-4xl'
                }`}
              >
                {item.preview}
              </div>
              <div className="text-base">{item.label}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Theme Section */}
      <Card variant="surface" className="p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <SunMoon className="w-7 h-7 text-[#0E7C86]" />
          <h2 className="text-2xl font-black text-[#0F2A33]">
            {t.settings.themeHeading}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'light', label: t.settings.themeLight },
            { id: 'dark', label: t.settings.themeDark },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleThemeChange(item.id as AppTheme)}
              className={`p-4 rounded-2xl border-2 font-bold text-lg transition-all cursor-pointer ${
                theme === item.id
                  ? 'bg-[#0E7C86] text-white border-[#0E7C86] shadow-sm'
                  : 'bg-white text-[#0F2A33] border-[#E8DEC8] hover:border-[#0E7C86]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Speech Speed */}
      <Card variant="surface" className="p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Volume2 className="w-7 h-7 text-[#0E7C86]" />
          <h2 className="text-2xl font-black text-[#0F2A33]">
            {t.settings.speechHeading}
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { speed: 0.8, label: t.settings.speedGentle },
            { speed: 1.0, label: t.settings.speedNormal },
            { speed: 1.2, label: t.settings.speedBrisk },
          ].map((s) => (
            <button
              key={s.speed}
              type="button"
              onClick={() => handleSpeechSpeedChange(s.speed as SpeechSpeed)}
              className={`p-3 sm:p-4 rounded-2xl border-2 font-bold text-base sm:text-lg transition-all cursor-pointer ${
                speechSpeed === s.speed
                  ? 'bg-[#0E7C86] text-white border-[#0E7C86]'
                  : 'bg-white text-[#0F2A33] border-[#E8DEC8] hover:border-[#0E7C86]'
              }`}
            >
              <div>{s.speed}x</div>
              <div className="text-xs sm:text-sm font-medium">{s.label}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card variant="surface" className="p-6 sm:p-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E6F4F5] text-[#0E7C86] flex items-center justify-center shrink-0">
            <Bell className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#0F2A33]">
              {t.settings.notificationsHeading}
            </h2>
            <p className="text-lg text-[#4A636C]">{t.settings.notificationsDesc}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleNotifications}
          aria-pressed={notifications}
          className={`min-h-[56px] px-6 py-2 rounded-2xl font-bold text-lg border-2 transition-all cursor-pointer ${
            notifications
              ? 'bg-[#0E7C86] text-white border-[#0E7C86]'
              : 'bg-white text-[#4A636C] border-[#E8DEC8] hover:border-[#0E7C86]'
          }`}
        >
          {notifications
            ? (language === 'hi' ? 'सक्रिय ✔' : 'Active ✔')
            : (language === 'hi' ? 'बंद' : 'Off')}
        </button>
      </Card>

      {/* Profile & Contacts Form */}
      <form onSubmit={handleSaveProfile}>
        <Card variant="surface" className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-[#E8DEC8] pb-4">
            <User className="w-7 h-7 text-[#0E7C86]" />
            <h2 className="text-2xl font-black text-[#0F2A33]">
              {t.settings.profileHeading}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-name" className="block text-xl font-bold mb-2">
                {t.settings.nameLabel}
              </label>
              <input
                id="settings-name"
                type="text"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[64px] px-5 text-xl rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none"
              />
            </div>

            <div>
              <label htmlFor="settings-city" className="block text-xl font-bold mb-2">
                {t.settings.cityLabel}
              </label>
              <input
                id="settings-city"
                type="text"
                maxLength={100}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full min-h-[64px] px-5 text-xl rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xl font-bold text-[#0E7C86]">
              {t.settings.familyContactHeading}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-fam-name" className="block text-lg font-semibold mb-1 text-[#243C45]">
                  {t.settings.familyNameLabel}
                </label>
                <input
                  id="settings-fam-name"
                  type="text"
                  maxLength={100}
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full min-h-[56px] px-4 text-lg rounded-xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none"
                />
              </div>
              <div>
                <label htmlFor="settings-fam-phone" className="block text-lg font-semibold mb-1 text-[#243C45]">
                  {t.settings.familyPhoneLabel}
                </label>
                <input
                  id="settings-fam-phone"
                  type="tel"
                  maxLength={20}
                  value={familyPhone}
                  onChange={(e) => setFamilyPhone(e.target.value)}
                  className="w-full min-h-[56px] px-4 text-lg rounded-xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label htmlFor="settings-meds" className="block text-xl font-bold">
              {t.settings.healthNotesHeading}
            </label>
            <textarea
              id="settings-meds"
              rows={3}
              maxLength={500}
              value={medicines}
              onChange={(e) => setMedicines(e.target.value)}
              placeholder={t.settings.healthNotesPlaceholder}
              className="w-full p-4 text-lg rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#E8DEC8] flex-wrap">
            {savedSuccess && (
              <span className="text-lg font-bold text-[#064E56] flex items-center gap-2">
                <Check className="w-6 h-6 stroke-[3]" />
                <span>{t.common.success}</span>
              </span>
            )}
            <Button type="submit" variant="primary" size="large" className="ml-auto">
              {t.common.save}
            </Button>
          </div>
        </Card>
      </form>

      {/* Danger Zone: Clear Data */}
      <Card variant="danger" className="p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3 text-[#8B0000]">
          <AlertTriangle className="w-7 h-7" />
          <h2 className="text-2xl font-black">{t.settings.dangerZone}</h2>
        </div>
        <p className="text-lg text-[#0F2A33]">{t.settings.clearConfirmDesc}</p>
        <Button
          type="button"
          variant="danger"
          onClick={() => setClearModalOpen(true)}
          icon={<Trash2 className="w-6 h-6" />}
        >
          {t.settings.clearAllData}
        </Button>
      </Card>

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title={t.settings.clearConfirmTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => setClearModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onClearAllData();
                setClearModalOpen(false);
              }}
            >
              {t.settings.clearConfirmButton}
            </Button>
          </>
        }
      >
        <p className="text-xl text-[#0F2A33]">{t.settings.clearConfirmDesc}</p>
      </Modal>
    </div>
  );
};
