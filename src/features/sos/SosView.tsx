import React, { useState } from 'react';
import {
  PhoneCall,
  MapPin,
  HeartHandshake,
  Share2,
  Shield,
  LifeBuoy,
  Phone,
  MessageSquare,
  Info,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useI18n } from '../../i18n';
import { APP_LIMITS } from '../../constants';
import type { UserProfile } from '../../types';

export interface SosViewProps {
  profile: UserProfile;
}

export const SosView: React.FC<SosViewProps> = ({ profile }) => {
  const { language, t } = useI18n();

  const [locationLoading, setLocationLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleGetLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError(
        language === 'hi'
          ? 'इस डिवाइस पर जीपीएस लोकेशन समर्थित नहीं है।'
          : 'Geolocation is not supported on this device.'
      );
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationLoading(false);
      },
      (err) => {
        console.error('[Geolocation error]:', err);
        setLocationError(t.sos.locationError);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: APP_LIMITS.GEOLOCATION_TIMEOUT_MS,
        maximumAge: APP_LIMITS.GEOLOCATION_MAX_AGE_MS,
      }
    );
  };

  const familyPhone = profile.familyContactPhone?.replace(/[^0-9]/g, '') || '';
  const familyName = profile.familyContactName || (language === 'hi' ? 'परिवार' : 'Family');

  const buildLocationMessage = () => {
    if (!coords) return '';
    const mapsLink = `https://maps.google.com/?q=${coords.lat},${coords.lng}`;
    return language === 'hi'
      ? `नमस्ते, मुझे मदद की आवश्यकता है। मेरी वर्तमान लोकेशन यहाँ है: ${mapsLink}`
      : `Hello, I need assistance. My current location is: ${mapsLink}`;
  };

  const getSmsLocationLink = () => {
    const text = encodeURIComponent(buildLocationMessage());
    if (familyPhone) {
      return `sms:${familyPhone}?body=${text}`;
    }
    return `sms:?body=${text}`;
  };

  const getWhatsappLocationLink = () => {
    const text = encodeURIComponent(buildLocationMessage());
    if (familyPhone) {
      return `https://wa.me/91${familyPhone}?text=${text}`;
    }
    return `https://wa.me/?text=${text}`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Calming Reassurance Banner */}
      <div className="p-6 bg-[#FDE8E8] border-3 border-[#C62828] rounded-3xl space-y-2 text-center shadow-sm">
        <h1 className="text-3xl sm:text-4xl font-black text-[#C62828]">
          {t.sos.title}
        </h1>
        <p className="text-xl sm:text-2xl text-[#0F2A33] font-bold">
          {t.sos.comfortNote}
        </p>
      </div>

      {/* Offline Notice */}
      <div className="p-4 bg-[#FFF9EF] border-2 border-[#E8DEC8] rounded-2xl flex items-center gap-3 text-[#4A636C]">
        <Info className="w-6 h-6 shrink-0 text-[#0E7C86]" />
        <p className="text-base sm:text-lg font-semibold">{t.sos.offlineNote}</p>
      </div>

      {/* Emergency Helpline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Family Member Call */}
        <Card variant="surface" className="p-6 sm:p-8 space-y-4 border-2 border-[#0E7C86] bg-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E6F4F5] text-[#0E7C86] flex items-center justify-center shrink-0">
              <HeartHandshake className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#0F2A33]">
                {t.sos.familyCallTitle}
              </h2>
              <p className="text-lg text-[#4A636C]">
                {familyPhone ? `${familyName} (${familyPhone})` : t.sos.noFamilyContact}
              </p>
            </div>
          </div>

          {familyPhone ? (
            <a
              href={`tel:${familyPhone}`}
              className="min-h-[64px] px-6 py-3 rounded-2xl bg-[#0E7C86] hover:bg-[#095D65] text-white font-bold text-xl flex items-center justify-center gap-3 shadow-md transition-colors"
            >
              <PhoneCall className="w-6 h-6" />
              <span>{language === 'hi' ? `${familyName} को कॉल करें` : `Call ${familyName}`}</span>
            </a>
          ) : (
            <div className="p-4 bg-[#FFF4DC] rounded-xl text-[#9A6700] text-base font-semibold">
              {t.sos.noFamilyContact}
            </div>
          )}
        </Card>

        {/* 112 National Emergency */}
        <Card variant="surface" className="p-6 sm:p-8 space-y-4 border-2 border-[#C62828] bg-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FDE8E8] text-[#C62828] flex items-center justify-center shrink-0">
              <Shield className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#0F2A33]">
                {t.sos.emergency112Title}
              </h2>
              <p className="text-lg text-[#4A636C]">{t.sos.emergency112Desc}</p>
            </div>
          </div>

          <a
            href="tel:112"
            className="min-h-[64px] px-6 py-3 rounded-2xl bg-[#C62828] hover:bg-[#A31F1F] text-white font-bold text-xl flex items-center justify-center gap-3 shadow-md transition-colors"
          >
            <PhoneCall className="w-6 h-6" />
            <span>{language === 'hi' ? '112 पर कॉल करें (आपातकालीन)' : 'Call 112 (Emergency)'}</span>
          </a>
        </Card>

        {/* 108 Ambulance */}
        <Card variant="surface" className="p-6 sm:p-8 space-y-4 border-2 border-[#E8DEC8] bg-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FFF4DC] text-[#9A6700] flex items-center justify-center shrink-0">
              <LifeBuoy className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#0F2A33]">
                {t.sos.ambulance108Title}
              </h2>
              <p className="text-lg text-[#4A636C]">{t.sos.ambulance108Desc}</p>
            </div>
          </div>

          <a
            href="tel:108"
            className="min-h-[64px] px-6 py-3 rounded-2xl bg-[#0F2A33] hover:bg-[#07161B] text-white font-bold text-xl flex items-center justify-center gap-3 shadow-md transition-colors"
          >
            <PhoneCall className="w-6 h-6" />
            <span>{language === 'hi' ? '108 पर कॉल करें (एम्बुलेंस)' : 'Call 108 (Ambulance)'}</span>
          </a>
        </Card>

        {/* 14567 Elderline */}
        <Card variant="surface" className="p-6 sm:p-8 space-y-4 border-2 border-[#E8DEC8] bg-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E6F4F5] text-[#0E7C86] flex items-center justify-center shrink-0">
              <Phone className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#0F2A33]">
                {t.sos.elderline14567Title}
              </h2>
              <p className="text-lg text-[#4A636C]">{t.sos.elderline14567Desc}</p>
            </div>
          </div>

          <a
            href="tel:14567"
            className="min-h-[64px] px-6 py-3 rounded-2xl bg-[#0E7C86] hover:bg-[#095D65] text-white font-bold text-xl flex items-center justify-center gap-3 shadow-md transition-colors"
          >
            <PhoneCall className="w-6 h-6" />
            <span>{language === 'hi' ? '14567 पर कॉल करें (एल्डरलाइन)' : 'Call 14567 (Elderline)'}</span>
          </a>
        </Card>
      </div>

      {/* GPS Location Sender */}
      <Card variant="surface" className="p-6 sm:p-8 space-y-6 border-2 border-[#0E7C86] bg-[#FFF9EF]">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0E7C86] text-white flex items-center justify-center shrink-0">
            <MapPin className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F2A33]">
              {t.sos.locationTitle}
            </h2>
            <p className="text-lg text-[#4A636C] mt-1">{t.sos.locationDesc}</p>
          </div>
        </div>

        {!coords ? (
          <Button
            type="button"
            variant="primary"
            size="large"
            loading={locationLoading}
            loadingText={t.sos.fetchingLocation}
            onClick={handleGetLocation}
            icon={<MapPin className="w-6 h-6" />}
            className="w-full"
          >
            {language === 'hi' ? 'मेरी जीपीएस लोकेशन निकालें' : 'Get My GPS Location'}
          </Button>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-[#E6F4F5] border-2 border-[#0E7C86] rounded-2xl text-[#0E7C86] font-bold text-lg">
              {t.sos.locationReady} (Lat: {coords.lat.toFixed(4)}, Lng: {coords.lng.toFixed(4)})
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href={getSmsLocationLink()}
                className="min-h-[64px] px-6 py-3 rounded-2xl bg-[#0F2A33] text-white font-bold text-lg flex items-center justify-center gap-3 shadow-sm transition-colors hover:bg-black"
              >
                <MessageSquare className="w-6 h-6" />
                <span>{t.sos.sendViaSms}</span>
              </a>

              <a
                href={getWhatsappLocationLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[64px] px-6 py-3 rounded-2xl bg-[#0E7C86] text-white font-bold text-lg flex items-center justify-center gap-3 shadow-sm transition-colors hover:bg-[#095D65]"
              >
                <Share2 className="w-6 h-6" />
                <span>{t.sos.sendViaWhatsapp}</span>
              </a>
            </div>
          </div>
        )}

        {locationError && (
          <div className="p-4 bg-[#FDE8E8] border-2 border-[#C62828] text-[#C62828] font-bold rounded-2xl">
            {locationError}
          </div>
        )}
      </Card>
    </div>
  );
};
