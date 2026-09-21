import React, { useState } from 'react';
import {
  Plus,
  BellRing,
  Bell,
  CheckCircle2,
  Calendar,
  Pill,
  Receipt,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { ReminderCard } from '../../components/ReminderCard';
import { NotificationService } from '../../services/notificationService';
import { useI18n } from '../../i18n';
import { getTodayDateString, isReminderDue } from '../../utils/dates';
import type { ReminderItem, ReminderCategory, ReminderRepeat } from '../../types';

export interface RemindersViewProps {
  reminders: ReminderItem[];
  onAddReminder: (item: Omit<ReminderItem, 'id' | 'completed'>) => void;
  onMarkDone: (id: string) => void;
  onSnooze: (id: string) => void;
  onDelete: (id: string) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  reminders,
  onAddReminder,
  onMarkDone,
  onSnooze,
  onDelete,
}) => {
  const { language, t } = useI18n();

  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'medicine' | 'bill'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ReminderCategory>('medicine');
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState('09:00');
  const [repeat, setRepeat] = useState<ReminderRepeat>('daily');

  // Notification status
  const [hasNotificationPermission, setHasNotificationPermission] = useState(
    NotificationService.getPermission() === 'granted'
  );

  const handleRequestNotifications = async () => {
    const granted = await NotificationService.requestPermission();
    setHasNotificationPermission(granted);
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddReminder({
      title: title.trim(),
      category,
      date,
      time,
      repeat,
      source: 'manual',
    });

    setTitle('');
    setCategory('medicine');
    setDate(getTodayDateString());
    setTime('09:00');
    setRepeat('daily');
    setModalOpen(false);
  };

  const todayStr = getTodayDateString();

  // Due reminders (not completed, time is reached or passed)
  const dueReminders = reminders.filter((r) => !r.completed && isReminderDue(r));

  // Filtered upcoming reminders
  const activeReminders = reminders.filter((r) => !r.completed);
  const completedReminders = reminders.filter((r) => r.completed);

  const filteredUpcoming = activeReminders.filter((r) => {
    if (activeFilter === 'today') return r.date === todayStr;
    if (activeFilter === 'medicine') return r.category === 'medicine';
    if (activeFilter === 'bill') return r.category === 'bill';
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-[#0F2A33] tracking-tight">
            {t.reminders.title}
          </h1>
          <p className="text-xl sm:text-2xl text-[#243C45]">{t.reminders.whatThisDoes}</p>
        </header>

        <Button
          type="button"
          variant="accent"
          size="default"
          onClick={() => setModalOpen(true)}
          icon={<Plus className="w-6 h-6 stroke-[3]" />}
        >
          {t.reminders.addNew}
        </Button>
      </div>

      {/* Browser Notification Banner if not yet enabled */}
      {!hasNotificationPermission && NotificationService.isSupported() && (
        <div
          role="region"
          aria-label="Notification setup"
          className="p-5 bg-[#FFF9EF] border-2 border-[#E8DEC8] rounded-3xl flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F4F5] text-[#0E7C86] flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-lg font-semibold text-[#0F2A33]">
              {t.reminders.enableNotifications}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRequestNotifications}
            className="w-full sm:w-auto"
          >
            {language === 'hi' ? 'सूचनाएं चालू करें' : 'Enable Notifications'}
          </Button>
        </div>
      )}

      {/* Due Now Banner if any item is due right now */}
      {dueReminders.length > 0 && (
        <section aria-labelledby="due-now-heading" className="space-y-4">
          <div className="p-5 bg-[#FFF4DC] border-3 border-[#F4A300] rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#F4A300] text-[#0F2A33] flex items-center justify-center shrink-0">
                <BellRing className="w-7 h-7 animate-bounce" aria-hidden="true" />
              </div>
              <div>
                <h2 id="due-now-heading" className="text-2xl sm:text-3xl font-black text-[#0F2A33]">
                  {t.reminders.dueNowHeading} ({dueReminders.length})
                </h2>
                <p className="text-base sm:text-lg text-[#9A6700] font-semibold">
                  {language === 'hi' ? 'कृपया इन्हें समय पर पूरा करें या स्नूज़ करें' : 'Action needed now: take medicine or mark completed'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {dueReminders.map((r) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  onMarkDone={onMarkDone}
                  onSnooze={onSnooze}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filter Tabs */}
      <section aria-label="Reminder filters" className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'all', label: t.reminders.filterAll },
          { id: 'today', label: t.reminders.filterToday },
          { id: 'medicine', label: t.reminders.filterMedicines },
          { id: 'bill', label: t.reminders.filterBills },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFilter(f.id as typeof activeFilter)}
            className={`min-h-[52px] px-5 py-2 rounded-2xl font-bold text-lg transition-all cursor-pointer ${
              activeFilter === f.id
                ? 'bg-[#0E7C86] text-white shadow-xs'
                : 'bg-white text-[#4A636C] hover:text-[#0F2A33] border-2 border-[#E8DEC8]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </section>

      {/* Upcoming Reminders List */}
      <section aria-labelledby="upcoming-reminders-heading" className="space-y-4">
        <h2 id="upcoming-reminders-heading" className="text-2xl font-black text-[#0F2A33]">
          {t.reminders.upcomingHeading}
        </h2>

        {filteredUpcoming.length === 0 ? (
          <Card variant="surface" className="p-8 text-center text-[#4A636C] space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#0E7C86] mx-auto opacity-70" />
            <p className="text-xl font-bold text-[#0F2A33]">{t.reminders.noDueNow}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredUpcoming.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onMarkDone={onMarkDone}
                onSnooze={onSnooze}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Completed History Log */}
      {completedReminders.length > 0 && (
        <section aria-labelledby="history-reminders-heading" className="space-y-4 pt-6 border-t-2 border-[#E8DEC8]">
          <h2 id="history-reminders-heading" className="text-2xl font-black text-[#0F2A33]">
            {t.reminders.historyHeading} ({completedReminders.length})
          </h2>
          <div className="space-y-3">
            {completedReminders.slice(-5).reverse().map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onMarkDone={onMarkDone}
                onSnooze={onSnooze}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t.reminders.addNew}
      >
        <form onSubmit={handleSaveReminder} className="space-y-5 text-[#0F2A33]">
          {/* Title */}
          <div>
            <label htmlFor="rem-title" className="block text-xl font-bold mb-2">
              {t.reminders.formTitle}
            </label>
            <input
              id="rem-title"
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.reminders.formTitlePlaceholder}
              className="w-full min-h-[64px] px-5 text-xl rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xl font-bold mb-2">
              {t.reminders.formCategory}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'medicine', label: t.reminders.categoryMedicine, icon: Pill },
                { id: 'appointment', label: t.reminders.categoryAppointment, icon: Calendar },
                { id: 'bill', label: t.reminders.categoryBill, icon: Receipt },
                { id: 'other', label: t.reminders.categoryOther, icon: Bell },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id as ReminderCategory)}
                    className={`p-3 rounded-xl border-2 font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      category === c.id
                        ? 'bg-[#0E7C86] text-white border-[#0E7C86]'
                        : 'bg-white text-[#0F2A33] border-[#E8DEC8] hover:border-[#0E7C86]'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rem-date" className="block text-xl font-bold mb-2">
                {t.reminders.formDate}
              </label>
              <input
                id="rem-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[60px] px-4 text-xl rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none"
              />
            </div>
            <div>
              <label htmlFor="rem-time" className="block text-xl font-bold mb-2">
                {t.reminders.formTime}
              </label>
              <input
                id="rem-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full min-h-[60px] px-4 text-xl rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none"
              />
            </div>
          </div>

          {/* Repeat */}
          <div>
            <label className="block text-xl font-bold mb-2">
              {t.reminders.formRepeat}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'none', label: t.reminders.repeatNone },
                { id: 'daily', label: t.reminders.repeatDaily },
                { id: 'weekly', label: t.reminders.repeatWeekly },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRepeat(r.id as ReminderRepeat)}
                  className={`min-h-[56px] p-3 rounded-xl border-2 font-bold text-base transition-all cursor-pointer ${
                    repeat === r.id
                      ? 'bg-[#0E7C86] text-white border-[#0E7C86]'
                      : 'bg-white text-[#0F2A33] border-[#E8DEC8] hover:border-[#0E7C86]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8DEC8]">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t.common.confirm}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteConfirmId) {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              {t.common.delete}
            </Button>
          </>
        }
      >
        <p className="text-xl text-[#0F2A33]">{t.reminders.deleteConfirm}</p>
      </Modal>
    </div>
  );
};
