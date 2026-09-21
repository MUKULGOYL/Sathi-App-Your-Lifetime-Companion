# Sathi / साथी - Senior Citizen Daily Companion

Sathi is a GenAI-powered web companion designed with and for senior citizens, helping them navigate daily tasks with independence, ease, and peace of mind. Available seamlessly in English and Hindi (हिंदी).

## Core Features
1. **Home & Morning Briefing**: Personalized daily briefing with weather, medicine schedule, daily priorities, safety reminders, and uplifting tips.
2. **Ask Anything**: Gentle, conversational question answering tailored for senior citizens with step-by-step guidance, simplified summaries, and one-tap reminder creation.
3. **Document & Bill Simplifier**: Upload or paste official notices, utility bills, hospital documents, or medicine instructions to receive a 6th-grade level breakdown with highlighted due dates, amounts, and action items.
4. **Reminders & Medicine Tracker**: High-contrast, audio-supported schedule for medicines, clinic visits, and bill payments with audible alarm notifications, snoozing, and completion logs.
5. **Scam & Fraud Shield**: Instant verification of suspicious SMS messages, WhatsApp forwards, links, or phone calls with clear verdicts (Safe / Suspicious / Scam), recommended steps, and emergency reporting options (1930 Cyber Helpline).
6. **Daily Check-in**: 15-second emotional and physical health check-in with comforting AI guidance and historical tracking.
7. **One-Tap Emergency SOS**: Instant access to family member calls, 112 National Emergency, 108 Ambulance, 14567 Elderline, and GPS location sharing via SMS/WhatsApp.
8. **Senior-Friendly Accessibility**: Text-to-speech aloud reading, speech-to-text voice input, adjustable text sizes, high contrast themes, and WCAG AA accessibility compliance.

## Project Structure

```
├── .env.example                # Environment variables specification
├── index.html                  # HTML entry point with accessibility meta tags
├── metadata.json               # AI Studio project metadata & permissions
├── package.json                # Dependencies and project scripts
├── tsconfig.json               # TypeScript compiler configuration
├── vite.config.ts              # Vite + Tailwind + Vitest configuration
├── server.ts                   # Express server entry point with Vite middleware
├── server/                     # Backend Express services & Gemini API logic
│   ├── gemini.ts               # Google GenAI SDK integration with Zod schemas
│   ├── index.ts                # Express route handlers (/api/generate, /api/health)
│   ├── prompts.ts              # System instructions and prompt templates
│   ├── rateLimiter.ts          # In-memory IP rate limiter
│   └── schemas.ts              # Zod validation schemas for API inputs & outputs
├── src/                        # Frontend React + TypeScript application
│   ├── main.tsx                # React DOM entry point
│   ├── App.tsx                 # Root application controller & navigation state
│   ├── types.ts                # Shared TypeScript models and interfaces
│   ├── index.css               # Global styling with Tailwind CSS
│   ├── components/             # Reusable, accessible UI components
│   │   ├── BigTile.tsx         # Large touch-friendly navigation tiles
│   │   ├── BottomNav.tsx       # Bottom navigation bar with active indicators
│   │   ├── Button.tsx          # Accessible buttons with multiple variants & sizes
│   │   ├── Card.tsx            # Elevated surface cards
│   │   ├── ErrorBoundary.tsx   # React error boundary with localized fallbacks
│   │   ├── LanguageToggle.tsx  # Dual language selector (English / हिंदी)
│   │   ├── Modal.tsx           # Accessible modal dialogues with focus trapping
│   │   ├── ReadAloudButton.tsx # Web Speech API text-to-speech audio player
│   │   ├── ReminderCard.tsx    # Interactive reminder cards with due badges
│   │   ├── SosButton.tsx       # Persistent emergency SOS button
│   │   ├── Spinner.tsx         # Calming animated loading status indicators
│   │   ├── Toast.tsx           # Accessible notification toasts
│   │   ├── TopBar.tsx          # Top navigation bar with SOS and settings
│   │   ├── VerdictBadge.tsx    # Color-coded safety verdict badges
│   │   └── VoiceInputButton.tsx# Speech recognition microphone button
│   ├── constants/              # Application constants & presets
│   │   └── index.ts            # Example prompts, scam samples, symptom lists
│   ├── features/               # Modular feature views
│   │   ├── ask/                # Ask Sathi conversational view
│   │   ├── checkin/            # Daily wellbeing check-in view
│   │   ├── home-briefing/      # Morning briefing & dashboard view
│   │   ├── onboarding/         # First-time user setup modal
│   │   ├── reminders/          # Medicine & task reminders view
│   │   ├── scam-shield/        # Scam detection & fraud analysis view
│   │   ├── settings/           # User profile & display customization view
│   │   ├── simplify/           # Document & bill simplification view
│   │   └── sos/                # Emergency helplines & location sharing view
│   ├── i18n/                   # Internationalization dictionary & context
│   │   ├── en.ts               # English translations
│   │   ├── hi.ts               # Hindi (हिंदी) translations
│   │   ├── index.tsx           # React I18n context provider & hooks
│   │   └── types.ts            # Type definitions for translation keys
│   ├── services/               # Client-side services
│   │   ├── apiClient.ts        # Typed HTTP client with abort controller support
│   │   ├── imageService.ts     # Client-side canvas image compression
│   │   ├── notificationService.ts # Web Notification API service
│   │   ├── speechService.ts    # Web Speech API (Synthesis & Recognition)
│   │   └── storageService.ts   # LocalStorage persistence with Zod schema validation
│   └── utils/                  # Utility functions & helpers
│       ├── dates.ts            # Date formatting, comparison, and due calculation
│       ├── hash.ts             # Deterministic hash generation for caching
│       ├── sanitize.ts         # User input sanitization and XSS prevention
│       └── sensitiveData.ts    # PII / Sensitive data detection and masking
└── tests/                      # Vitest test suite
    ├── setup.ts                # Test setup and browser mocks
    ├── accessibility.test.tsx  # WCAG AA accessibility tests (jest-axe)
    ├── apiClient.test.ts       # API client error handling & request tests
    ├── dates.test.ts           # Date calculation & formatting tests
    ├── i18n.test.ts            # Translation key completeness & parity tests
    ├── reminders.test.ts       # Reminder due calculations & snoozing tests
    └── sensitiveData.test.ts   # Sensitive data masking & detection tests
```

## Running the Project

- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Tests**: `npm run test`
- **Lint / Typecheck**: `npm run lint`
