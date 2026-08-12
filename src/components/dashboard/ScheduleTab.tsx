import { Calendar, User as UserIcon, MapPin } from 'lucide-react';
import type { TranslationKey } from '../../translations';
import type { SubjectData } from '../../types';

interface ScheduleTabProps {
  t: (key: TranslationKey) => string;
  daysOfWeek: string[];
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  groupedSubjects: Record<string, SubjectData[]>;
  setSelectedSubject: (subject: SubjectData) => void;
  setActiveTab: (tab: any) => void;
}

export function ScheduleTab({
  t,
  daysOfWeek,
  selectedDay,
  setSelectedDay,
  groupedSubjects,
  setSelectedSubject,
  setActiveTab
}: ScheduleTabProps) {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calendar size={20} /> {t('schedule_title' as TranslationKey)}
      </h2>
      
      {/* Horizontal Day Selector */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        overflowX: 'auto', 
        paddingBottom: '0.5rem',
        scrollbarWidth: 'none'
      }}>
        {daysOfWeek.filter(d => d !== 'Unknown').map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              background: selectedDay === day ? 'var(--accent-color)' : 'var(--bg-secondary)',
              color: selectedDay === day ? 'var(--accent-text)' : 'var(--text-secondary)',
              boxShadow: selectedDay === day ? 'var(--shadow-md)' : 'none',
              borderBottom: selectedDay !== day ? '1px solid var(--border-color)' : 'none'
            }}
          >
            {t(`day_${day}` as TranslationKey).substring(0, 3)}
          </button>
        ))}
      </div>

      {/* Selected Day Timeline - iOS List */}
      <div className="ios-list-group" style={{ marginTop: '0.5rem' }}>
        <div className="ios-list">
          {(!groupedSubjects[selectedDay] || groupedSubjects[selectedDay].length === 0) ? (
            <div className="ios-list-item" style={{ justifyContent: 'center' }}>
              <span className="ios-list-item-title" style={{ color: 'var(--text-secondary)' }}>
                {t('schedule_no_classes_on' as TranslationKey)} {t(`day_${selectedDay}` as TranslationKey)}.
              </span>
            </div>
          ) : (
            groupedSubjects[selectedDay].map((subject) => (
              <div 
                key={subject.id} 
                className="ios-list-item clickable"
                onClick={() => { setSelectedSubject(subject); setActiveTab('subject-details'); }}
              >
                <div className="ios-list-item-content">
                  <div className="ios-list-item-title">{subject.name}</div>
                  <div className="ios-list-item-subtitle" style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <UserIcon size={12} /> {subject.teacher}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} /> {subject.room}
                    </span>
                  </div>
                </div>
                <div className="ios-list-item-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '1rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem' }}>
                    {subject.startTime}
                  </span>
                  <span style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                    - {subject.endTime}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
