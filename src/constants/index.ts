/**
 * Central application constants, helpline directories, limits, and preset templates.
 */

/**
 * Standard operational timings, timeouts, and thresholds.
 */
export const APP_LIMITS = {
  SNOOZE_DEFAULT_MINUTES: 10,
  NOTIFICATION_CHECK_INTERVAL_MS: 60000,
  TOAST_AUTO_DISMISS_MS: 4000,
  SAVED_FEEDBACK_TIMEOUT_MS: 3000,
  MAX_UPLOAD_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_HISTORY_MESSAGES: 50,
  GEOLOCATION_TIMEOUT_MS: 15000,
  GEOLOCATION_MAX_AGE_MS: 60000,
  API_TIMEOUT_MS: 30000,
  API_RETRY_BACKOFF_MS: 800,
} as const;

export const HELPLINES = {
  NATIONAL_EMERGENCY: {
    number: '112',
    labelEn: 'National Emergency',
    labelHi: 'राष्ट्रीय आपातकालीन सेवा (112)',
    descEn: 'Police, Fire, and Medical emergencies across India',
    descHi: 'पूरे भारत में पुलिस, फायर और मेडिकल सहायता',
  },
  AMBULANCE: {
    number: '108',
    labelEn: 'Ambulance Service',
    labelHi: 'एम्बुलेंस सेवा (108)',
    descEn: 'Free government emergency medical transport',
    descHi: 'मुफ्त सरकारी आपातकालीन चिकित्सा वाहन',
  },
  ELDERLINE: {
    number: '14567',
    labelEn: 'Elderline Helpline',
    labelHi: 'एल्डरलाइन वरिष्ठ नागरिक हेल्पलाइन (14567)',
    descEn: 'Toll-free national senior citizen care and guidance',
    descHi: 'वरिष्ठ नागरिकों के लिए राष्ट्रीय टोल-फ्री सहायता',
  },
  CYBER_CRIME: {
    number: '1930',
    labelEn: 'Cyber Crime Helpline',
    labelHi: 'राष्ट्रीय साइबर हेल्पलाइन (1930)',
    descEn: 'Report financial fraud, phishing and online scams immediately',
    descHi: 'वित्तीय धोखाधड़ी और ऑनलाइन ठगी की तुरंत सूचना दें',
    website: 'https://cybercrime.gov.in',
  },
} as const;

export const SYMPTOMS_LIST = [
  { id: 'fatigue', en: 'Tiredness / Weakness', hi: 'थकान व कमजोरी' },
  { id: 'joint_pain', en: 'Knee / Joint Pain', hi: 'घुटने या जोड़ों का दर्द' },
  { id: 'headache', en: 'Headache', hi: 'सिरदर्द' },
  { id: 'cough_cold', en: 'Cough / Cold', hi: 'खांसी या जुकाम' },
  { id: 'indigestion', en: 'Indigestion / Acidity', hi: 'बदहजमी या गैस' },
  { id: 'dizziness', en: 'Dizziness', hi: 'चक्कर आना' },
  { id: 'restlessness', en: 'Restlessness / Unease', hi: 'घबराहट या बेचैनी' },
  { id: 'bp_issue', en: 'BP Fluctuation', hi: 'रक्तचाप (BP) की परेशानी' },
] as const;

export const CHECKIN_SYMPTOMS = SYMPTOMS_LIST;

export const SUGGESTED_ASK_QUESTIONS = [
  {
    en: 'How to make a WhatsApp video call to my family?',
    hi: 'व्हाट्सएप पर परिवार से वीडियो कॉल कैसे करें?',
  },
  {
    en: 'How to safely pay electricity bill via UPI?',
    hi: 'UPI (गूगल पे/फोनपे) से बिजली का बिल सुरक्षित कैसे भरें?',
  },
  {
    en: 'How to book an Uber or Ola cab from phone?',
    hi: 'मोबाइल से कैब या ऑटो कैसे बुक करें?',
  },
  {
    en: 'How do I take a screenshot on my mobile?',
    hi: 'अपने फोन में स्क्रीनशॉट कैसे लेते हैं?',
  },
  {
    en: 'How to block unwanted spam calls?',
    hi: 'परेशान करने वाली अनजान कॉल्स को कैसे ब्लॉक करें?',
  },
] as const;

export const SIMPLIFY_EXAMPLES = [
  {
    titleEn: 'Electricity Bill Notice',
    titleHi: 'बिजली बिल सूचना',
    text: `BSES Rajdhani Power Limited - Electricity Bill
Consumer No: 100492819
Billing Period: 01-Aug-2026 to 31-Aug-2026
Total Current Dues: Rs. 1,840.00
Net Amount Payable: Rs. 1,840.00
Due Date for Payment: 28-Sep-2026
If paid after due date, late payment surcharge of Rs. 120.00 will be added.
Pay online at bsesdelhi.com or via authorized UPI apps.
Helpline: 19123`,
  },
  {
    titleEn: 'Bank Pension Life Certificate Letter',
    titleHi: 'बैंक पेंशन जीवन प्रमाण पत्र पत्र',
    text: `State Bank of India - Pension Processing Cell
Dear Pensioner Shri Ramesh Kumar,
Subject: Submission of Annual Digital Life Certificate (Jeevan Pramaan)
Please note that your annual Life Certificate is due for submission by 30-Nov-2026.
You can submit it via:
1. Nearest SBI Branch or Post Office
2. Jeevan Pramaan Face App from your mobile phone
Failure to submit by 30-Nov-2026 will lead to temporary stoppage of December pension credit.
Toll Free: 1800-425-3800`,
  },
  {
    titleEn: 'Medical Prescription',
    titleHi: 'डॉक्टर की दवा पर्ची',
    text: `Dr. Mehta Clinic - General Medicine
Patient: Mrs. Shanti Devi, Age: 68
Date: 15-Sep-2026
Diagnosis: Mild Hypertension & Knee Osteoarthritis
Rx:
1. Tab Telmisartan 40mg - 1 tablet daily after breakfast (Morning)
2. Tab Calcium + Vit D3 - 1 tablet daily after dinner (Night)
3. Paracetamol 650mg - 1 tablet only if knee pain is severe (SOS)
Follow up visit on: 15-Oct-2026 for BP check.
Advice: 20 minutes gentle morning walk, drink 8 glasses of water.`,
  },
] as const;

export const SCAM_EXAMPLES = [
  {
    titleEn: 'Electricity Disconnection Threat (Scam)',
    titleHi: 'बिजली कटने की धमकी वाला फर्जी संदेश',
    channel: 'sms' as const,
    text: `Dear consumer, your electricity power will be disconnected tonight at 9.30 PM from electricity office because your previous month bill was not updated. Please immediately contact our power officer Mr. Verma at 9812345678. Urgent!`,
  },
  {
    titleEn: 'Fake Bank KYC / PAN Suspension (Scam)',
    titleHi: 'बैंक खाता ब्लॉक होने का फर्जी एसएमएस',
    channel: 'sms' as const,
    text: `Dear SBI Customer, your YONO account has been suspended due to pending PAN KYC. Please verify your Aadhaar and PAN immediately at https://sbi-kyc-update-verify.apk to prevent permanent deactivation.`,
  },
  {
    titleEn: 'WhatsApp Lottery / Prize Award (Scam)',
    titleHi: 'केबीसी लॉटरी जीतने का फर्जी व्हाट्सएप मैसेज',
    channel: 'whatsapp' as const,
    text: `Congratulations! Your mobile number has won Rs. 25,00,000 cash prize in KBC WhatsApp Lucky Draw 2026. To claim your lottery amount, send your Aadhaar photo and Rs. 2,500 file processing charge to Manager Rana Pratap at 9988776655.`,
  },
  {
    titleEn: 'Genuine Bill Payment Receipt (Safe)',
    titleHi: 'सच्ची रसीद संदेश (सुरक्षित)',
    channel: 'sms' as const,
    text: `Received payment of Rs. 1,450.00 for Airtel Fiber Account 011-4567890 on 18-Sep-2026 via UPI Ref: 6251892019. Thank you for your payment. View receipt at airtel.in.`,
  },
] as const;
