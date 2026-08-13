import { useState, useEffect } from 'react';
import { FileText, Clock, MapPin, StickyNote, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TranslationKey } from '../../translations';
import type { ExamData, SubjectData } from '../../types';

interface ExamsTabProps {
  t: (key: TranslationKey) => string;
  examList: ExamData[];
  subjectList: SubjectData[];
}

type ExamStatus = 'in-progress' | 'today' | 'tomorrow' | 'upcoming-urgent' | 'upcoming' | 'past';

function getExamStatus(exam: ExamData): ExamStatus {
  if (!exam.examDate) return 'past';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const examDate = new Date(exam.examDate + 'T00:00:00');
  const diffMs = examDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Check if exam is today
  if (diffDays === 0) {
    // Check if in progress
    if (exam.startTime && exam.endTime) {
      const [sh, sm] = exam.startTime.split(':').map(Number);
      const [eh, em] = exam.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin >= startMin && nowMin <= endMin) return 'in-progress';
      if (nowMin > endMin) return 'past';
    }
    return 'today';
  }
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1 && diffDays <= 3) return 'upcoming-urgent';
  if (diffDays > 3) return 'upcoming';
  return 'past';
}

function getCountdownText(exam: ExamData, t: (key: TranslationKey) => string): string {
  if (!exam.examDate) return t('exam_finished' as TranslationKey);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const examDate = new Date(exam.examDate + 'T00:00:00');
  const diffMs = examDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const status = getExamStatus(exam);
  if (status === 'in-progress') return t('exam_in_progress' as TranslationKey);
  if (status === 'past') return t('exam_finished' as TranslationKey);
  if (status === 'today') return t('exam_today' as TranslationKey);
  if (status === 'tomorrow') return t('exam_tomorrow' as TranslationKey);

  if (diffDays > 0) {
    return `${t('exam_starts_in' as TranslationKey)} ${diffDays} ${t('exam_days' as TranslationKey)}`;
  }
  return t('exam_finished' as TranslationKey);
}

function getStatusStyle(status: ExamStatus): React.CSSProperties {
  switch (status) {
    case 'in-progress':
      return { background: 'var(--accent-color)', color: 'var(--accent-text)' };
    case 'today':
      return { background: 'var(--accent-color)', color: 'var(--accent-text)' };
    case 'tomorrow':
      return { background: '#ff9500', color: '#fff' };
    case 'upcoming-urgent':
      return { background: '#ff9500', color: '#fff' };
    case 'upcoming':
      return { background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
    case 'past':
      return { background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
  }
}

function getCardBorder(status: ExamStatus): string {
  switch (status) {
    case 'in-progress': return '2px solid var(--accent-color)';
    case 'today': return '2px solid var(--accent-color)';
    case 'tomorrow': return '2px solid #ff9500';
    case 'upcoming-urgent': return '1px solid #ff9500';
    default: return '1px solid var(--border-color)';
  }
}

export function ExamsTab({ t, examList, subjectList }: ExamsTabProps) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [, setTick] = useState(0);

  // Re-render every 60s to keep countdowns fresh
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const upcoming = examList
    .filter(e => {
      const status = getExamStatus(e);
      return status !== 'past';
    })
    .sort((a, b) => (a.examDate || '').localeCompare(b.examDate || '') || (a.startTime || '').localeCompare(b.startTime || ''));

  const past = examList
    .filter(e => getExamStatus(e) === 'past')
    .sort((a, b) => (b.examDate || '').localeCompare(a.examDate || ''));

  const displayed = tab === 'upcoming' ? upcoming : past;

  const getSubjectName = (subjectId: string) => {
    return subjectList.find(s => s.id === subjectId)?.name || '—';
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: active ? 'var(--accent-color)' : 'transparent',
    color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FileText size={20} /> {t('exam_title' as TranslationKey)}
      </h2>

      {/* Tab Toggle */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        background: 'var(--bg-secondary)',
        borderRadius: '10px',
        padding: '0.25rem',
        border: '1px solid var(--border-color)',
      }}>
        <button onClick={() => setTab('upcoming')} style={tabBtnStyle(tab === 'upcoming')}>
          {t('exam_upcoming' as TranslationKey)} ({upcoming.length})
        </button>
        <button onClick={() => setTab('past')} style={tabBtnStyle(tab === 'past')}>
          {t('exam_past' as TranslationKey)} ({past.length})
        </button>
      </div>

      {/* Exam List */}
      {displayed.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
        }}>
          {t('exam_no_exams' as TranslationKey)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayed.map((exam) => {
            const status = getExamStatus(exam);
            const isPast = status === 'past';
            const isToday = status === 'today' || status === 'in-progress';

            return (
              <div
                key={exam.id}
                className={isToday ? 'exam-card-pulse' : ''}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  padding: '1rem 1.25rem',
                  border: getCardBorder(status),
                  opacity: isPast ? 0.6 : 1,
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Accent glow for today/in-progress */}
                {isToday && (
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'var(--accent-color)',
                    opacity: 0.1,
                    borderRadius: '50%',
                    filter: 'blur(20px)',
                  }} />
                )}

                {/* Top row: Subject + Countdown Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--accent-color)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {getSubjectName(exam.subjectId)}
                    </span>
                    <span style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {exam.title}
                    </span>
                  </div>

                  {/* Countdown Badge */}
                  <div style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    marginLeft: '0.75rem',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    ...getStatusStyle(status),
                  }}>
                    {status === 'in-progress' && <Clock size={12} />}
                    {status === 'past' && <CheckCircle2 size={12} />}
                    {(status === 'today' || status === 'tomorrow' || status === 'upcoming-urgent') && <AlertTriangle size={12} />}
                    {getCountdownText(exam, t)}
                  </div>
                </div>

                {/* Details row */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem 1rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  {/* Date */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FileText size={13} />
                    {new Date(exam.examDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>

                  {/* Time */}
                  {exam.startTime && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={13} />
                      {exam.startTime}{exam.endTime ? ` — ${exam.endTime}` : ''}
                    </span>
                  )}

                  {/* Room */}
                  {exam.room && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={13} />
                      {exam.room}
                    </span>
                  )}
                </div>

                {/* Notes */}
                {exam.notes && (
                  <div style={{
                    marginTop: '0.65rem',
                    padding: '0.6rem 0.75rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.4rem',
                    border: '1px solid var(--border-color)',
                    position: 'relative',
                    zIndex: 1,
                  }}>
                    <StickyNote size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{exam.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
