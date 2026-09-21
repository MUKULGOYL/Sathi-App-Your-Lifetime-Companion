import React from 'react';
import { Pill, Calendar, Receipt, Check, Clock, Trash2, Bell } from 'lucide-react';
import { useI18n } from '../i18n';
import { formatDate, formatTime, isReminderDue } from '../utils/dates';
import type { ReminderItem } from '../types';

export interface ReminderCardProps {
  reminder: ReminderItem;
  onMarkDone: (id: string) => void;
  onSnooze: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  onMarkDone,
  onSnooze,
  onDelete,
}) => {
  const { language, t } = useI18n();

  const isDue = isReminderDue(reminder);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medicine':
        return <Pill className="w-6 h-6" aria-hidden="true" />;
      case 'appointment':
        return <Calendar className="w-6 h-6" aria-hidden="true" />;
      case 'bill':
        return <Receipt className="w-6 h-6" aria-hidden="true" />;
      default:
        return <Bell className="w-6 h-6" aria-hidden="true" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'medicine':
        return t.reminders.categoryMedicine;
      case 'appointment':
        return t.reminders.categoryAppointment;
      case 'bill':
        return t.reminders.categoryBill;
      default:
        return t.reminders.categoryOther;
    }
  };

  const getRepeatLabel = (repeat: string) => {
    switch (repeat) {
      case 'daily':
        return t.reminders.repeatDaily;
      case 'weekly':
        return t.reminders.repeatWeekly;
      default:
        return t.reminders.repeatNone;
    }
  };

  return (
    <div
      data-testid={`reminder-card-${reminder.id}`}
      className={`p-6 rounded-2xl border-2 transition-all shadow-sm ${
        reminder.completed
          ? 'bg-[#F9F7F1] border-[#E8DEC8] opacity-75'
          : isDue
          ? 'bg-[#FFF4DC] border-[#F4A300] shadow-md ring-2 ring-[#F4A300]'
          : 'bg-white border-[#E8DEC8] hover:border-[#0E7C86]'
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
        {/* Left side info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold shadow-xs ${
              isDue
                ? 'bg-[#F4A300] text-[#0F2A33]'
                : reminder.category === 'medicine'
                ? 'bg-[#E6F4F5] text-[#0E7C86]'
                : 'bg-[#FFF9EF] text-[#4A636C] border border-[#E8DEC8]'
            }`}
            aria-hidden="true"
          >
            {getCategoryIcon(reminder.category)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#FFF9EF] text-[#0E7C86] border border-[#0E7C86]">
                {getCategoryLabel(reminder.category)}
              </span>

              {reminder.repeat !== 'none' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  {getRepeatLabel(reminder.repeat)}
                </span>
              )}

              {isDue && (
                <span
                  data-testid="due-now-badge"
                  className="text-xs sm:text-sm font-black uppercase px-2.5 py-0.5 rounded-md bg-[#C62828] text-white animate-pulse"
                >
                  {t.reminders.dueNowHeading}
                </span>
              )}
            </div>

            <h3
              className={`text-xl sm:text-2xl font-bold leading-snug break-words ${
                reminder.completed ? 'line-through text-gray-500' : 'text-[#0F2A33]'
              }`}
            >
              {reminder.title}
            </h3>

            <p className="text-base sm:text-lg text-[#243C45] mt-1 flex items-center gap-2 flex-wrap">
              <span>{formatDate(reminder.date, language)}</span>
              <span>•</span>
              <span className="font-semibold text-[#0F2A33]">{formatTime(reminder.time, language)}</span>
              {reminder.snoozedUntil && !reminder.completed && (
                <span className="text-sm font-medium text-[#6B4300] italic">
                  {language === 'hi' ? '(10 मिनट के लिए स्नूज़ किया)' : '(Snoozed for 10 min)'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0">
          {!reminder.completed ? (
            <>
              <button
                type="button"
                data-testid={`snooze-btn-${reminder.id}`}
                onClick={() => onSnooze(reminder.id)}
                aria-label={t.reminders.snooze}
                className="min-h-[56px] px-4 py-2 rounded-xl bg-white border-2 border-[#E8DEC8] hover:border-[#F4A300] hover:bg-[#FFF4DC] text-[#0F2A33] font-semibold text-base flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-3 focus-visible:ring-[#0E7C86]"
              >
                <Clock className="w-5 h-5 text-[#6B4300]" aria-hidden="true" />
                <span className="hidden md:inline">{t.reminders.snooze}</span>
              </button>

              <button
                type="button"
                data-testid={`mark-done-btn-${reminder.id}`}
                onClick={() => onMarkDone(reminder.id)}
                aria-label={t.reminders.markTaken}
                className="min-h-[56px] px-5 py-2.5 rounded-xl bg-[#0E7C86] hover:bg-[#095D65] text-white font-bold text-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer focus-visible:ring-3 focus-visible:ring-[#0E7C86]"
              >
                <Check className="w-6 h-6 stroke-[3]" aria-hidden="true" />
                <span>{t.reminders.markTaken}</span>
              </button>
            </>
          ) : (
            <span className="text-base font-semibold text-[#243C45] py-2">
              {language === 'hi' ? 'पूर्ण' : 'Completed'}
            </span>
          )}

          <button
            type="button"
            data-testid={`delete-btn-${reminder.id}`}
            onClick={() => onDelete(reminder.id)}
            aria-label={t.common.delete}
            className="min-h-[56px] min-w-[56px] p-2.5 rounded-xl text-[#243C45] hover:text-[#8B0000] hover:bg-[#FDE8E8] flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-3 focus-visible:ring-[#C62828]"
          >
            <Trash2 className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
