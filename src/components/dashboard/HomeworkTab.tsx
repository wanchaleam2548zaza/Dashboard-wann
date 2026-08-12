import { useState } from 'react';
import { Calendar, CheckCircle2, ArrowDownUp } from 'lucide-react';
import type { TranslationKey } from '../../translations';
import { CompletedByAvatars } from '../ui/CompletedByAvatars';
import type { SubjectData, HomeworkData } from '../../types';

interface HomeworkTabProps {
  t: (key: TranslationKey) => string;
  defaultDay: string;
  groupedSubjects: Record<string, SubjectData[]>;
  setSelectedSubject: (subject: SubjectData) => void;
  setActiveTab: (tab: any) => void;
  homeHwTab: 'new' | 'pending' | 'urgent' | 'completed';
  setHomeHwTab: (val: any) => void;
  homeworkList: HomeworkData[];
  completedHomeworkIds: Set<string>;
  setSelectedHomework: (hw: HomeworkData) => void;
  subjectList: SubjectData[];
  allCompletedHomework: {userId: string, homeworkId: string, completedAt?: string}[];
  userList: any[];
}

export function HomeworkTab({
  t, defaultDay, groupedSubjects, setSelectedSubject, setActiveTab,
  homeHwTab, setHomeHwTab, homeworkList, completedHomeworkIds,
  setSelectedHomework, subjectList, allCompletedHomework, userList
}: HomeworkTabProps) {
  const [completedSortBy, setCompletedSortBy] = useState<'completedAt' | 'dueDate'>('completedAt');
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Today's Classes */}
      <div>
        <h3 className="ios-list-header">
          {t('home_todays_classes' as TranslationKey)} ({t(`day_${defaultDay}` as TranslationKey)})
        </h3>
        
        <div className="ios-list-group">
          <div className="ios-list">
            {(!groupedSubjects[defaultDay] || groupedSubjects[defaultDay].length === 0) ? (
              <div className="ios-list-item" style={{ justifyContent: 'center' }}>
                <span className="ios-list-item-title" style={{ color: 'var(--text-secondary)' }}>
                  {t('home_no_classes' as TranslationKey)}
                </span>
              </div>
            ) : (
              groupedSubjects[defaultDay].map((subject) => (
                <div 
                  key={subject.id} 
                  className="ios-list-item clickable"
                  onClick={() => { setSelectedSubject(subject); setActiveTab('subject-details'); }}
                >
                  <div className="ios-list-item-content">
                    <span className="ios-list-item-title">{subject.name}</span>
                    <span className="ios-list-item-subtitle">{subject.room}</span>
                  </div>
                  <div className="ios-list-item-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '1rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
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

      {/* Homework List */}
      <div>
        <h3 className="ios-list-header">{t('home_homework' as TranslationKey)}</h3>
        <div style={{ 
          display: 'flex', 
          background: 'var(--bg-secondary)', 
          padding: '0.25rem', 
          borderRadius: '8px', 
          marginBottom: '0.75rem', 
          overflowX: 'auto', 
          scrollbarWidth: 'none',
          gap: '0.25rem',
          border: '1px solid var(--border-color)'
        }}>
          {(['new', 'pending', 'urgent', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setHomeHwTab(tab)}
              style={{
                flex: 1,
                padding: '0.4rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                background: homeHwTab === tab ? 'var(--bg-primary)' : 'transparent',
                color: homeHwTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: homeHwTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t(`hw_tab_${tab}` as TranslationKey)}
            </button>
          ))}
        </div>

        {homeHwTab === 'completed' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', padding: '0 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <ArrowDownUp size={16} />
              </div>
              <select 
                value={completedSortBy} 
                onChange={(e) => setCompletedSortBy(e.target.value as 'completedAt' | 'dueDate')}
                className="ios-select"
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '0.25rem 0.5rem', 
                  fontSize: '0.85rem', 
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              >
                <option value="completedAt">{t('completion_date' as TranslationKey) || 'Completion Date'}</option>
                <option value="dueDate">{t('due_date' as TranslationKey) || 'Due Date'}</option>
              </select>
            </div>
          </div>
        )}

        <div className="ios-list-group">
          <div className="ios-list">
            {(() => {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const threeDaysFromNow = new Date(now);
              threeDaysFromNow.setDate(now.getDate() + 3);

              const filteredHw = homeworkList.filter(hw => {
                const isCompleted = completedHomeworkIds.has(hw.id);
                if (homeHwTab === 'completed') return isCompleted;
                if (isCompleted) return false;

                const dueDate = new Date(hw.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                if (homeHwTab === 'pending') return true;
                if (homeHwTab === 'urgent') return dueDate >= now && dueDate <= threeDaysFromNow;
                if (homeHwTab === 'new') return dueDate > threeDaysFromNow;
                
                return true;
              });

              if (homeHwTab === 'completed') {
                filteredHw.sort((a, b) => {
                  if (completedSortBy === 'dueDate') {
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                  } else {
                    const completedA = allCompletedHomework.find(c => c.homeworkId === a.id)?.completedAt || '0';
                    const completedB = allCompletedHomework.find(c => c.homeworkId === b.id)?.completedAt || '0';
                    return new Date(completedB).getTime() - new Date(completedA).getTime();
                  }
                });
              }

              if (filteredHw.length === 0) {
                return (
                  <div className="ios-list-item" style={{ justifyContent: 'center' }}>
                    <span className="ios-list-item-title" style={{ color: 'var(--text-secondary)' }}>
                      {t('hw_no_homework_in_tab' as TranslationKey)}
                    </span>
                  </div>
                );
              }
              
              return filteredHw.map((hw) => {
                const subject = subjectList.find(s => s.id === hw.subjectId);
                const isCompleted = completedHomeworkIds.has(hw.id);
                return (
                  <div 
                    key={hw.id} 
                    className="ios-list-item clickable"
                    onClick={() => setSelectedHomework(hw)} 
                    style={{ alignItems: 'flex-start', padding: '1rem' }}
                  >
                    <div style={{ color: isCompleted ? '#34c759' : 'var(--text-secondary)', flexShrink: 0, marginRight: '1rem', marginTop: '2px' }}>
                       {isCompleted ? <CheckCircle2 size={22} /> : <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--text-secondary)' }} />}
                    </div>
                    <div className="ios-list-item-content">
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none', fontSize: '0.95rem' }}>{hw.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{subject ? subject.name : 'Unknown Subject'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500, color: isCompleted ? 'var(--text-secondary)' : '#ff3b30' }}>
                          <Calendar size={12} /> {new Date(hw.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <CompletedByAvatars homeworkId={hw.id} allCompleted={allCompletedHomework} users={userList} />
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
