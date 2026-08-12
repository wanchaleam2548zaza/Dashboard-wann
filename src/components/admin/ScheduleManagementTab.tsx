import React from 'react';
import { Users, Calendar, PlusCircle, BookOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

import type { UserData, SubjectData } from '../../types';

interface ScheduleManagementTabProps {
  userList: UserData[];
  dbError: string | null;
  daysOfWeek: string[];
  groupedSubjects: Record<string, SubjectData[]>;
  setQuickAddSubjectDay: (day: string | null) => void;
  quickAddSubjectDay: string | null;
  setQuickEditSubject: React.Dispatch<React.SetStateAction<SubjectData | null>>;
  setActiveTab: (tab: any) => void;
  editingSubjectId: string | null;
  handleAddSubject: (e: React.FormEvent) => Promise<void>;
  subjectName: string;
  setSubjectName: (val: string) => void;
  teacherName: string;
  setTeacherName: (val: string) => void;
  room: string;
  setRoom: (val: string) => void;
  startTime: string;
  setStartTime: (val: string) => void;
  endTime: string;
  setEndTime: (val: string) => void;
}

export function ScheduleManagementTab({
  userList, dbError, daysOfWeek, groupedSubjects, setQuickAddSubjectDay, quickAddSubjectDay,
  setQuickEditSubject, setActiveTab, editingSubjectId, handleAddSubject,
  subjectName, setSubjectName, teacherName, setTeacherName, room, setRoom,
  startTime, setStartTime, endTime, setEndTime
}: ScheduleManagementTabProps) {
  return (
    <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
      
      {/* User Presence */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="ios-list-header" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--accent-color)" /> User Presence
          </h3>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, marginRight: '0.75rem' }}>
            {userList.filter(u => u.isOnline).length} Online / {userList.length} Total
          </div>
        </div>

        <div className="ios-list-group" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <div className="ios-list">
            {dbError && <div style={{ color: '#ef4444', padding: '1rem' }}>{dbError}</div>}
            {userList.length === 0 && !dbError ? (
              <div className="ios-list-item" style={{ justifyContent: 'center', color: 'var(--text-secondary)' }}>No users found.</div>
            ) : (
              userList.map((user) => (
                <div key={user.id} className="ios-list-item" style={{ alignItems: 'center' }}>
                  <span className="ios-list-item-title">{user.username}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: user.isOnline ? '#34c759' : 'var(--text-secondary)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: user.isOnline ? '#34c759' : 'var(--text-secondary)' }} />
                    {user.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Weekly Schedule Overview */}
      <div>
        <h3 className="ios-list-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--accent-color)" /> Weekly Schedule Overview
        </h3>

        <div style={{
          display: 'flex',
          gap: '1rem',
          overflowX: 'auto',
          paddingBottom: '1rem',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none'
        }}>
          {daysOfWeek.map(day => {
            const daySubjects = groupedSubjects[day] || [];
            return (
              <div key={day} style={{
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                minWidth: '240px', scrollSnapAlign: 'start',
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                padding: '1rem'
              }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                  color: 'var(--text-primary)'
                }}>
                  <span>{day}</span>
                  <button onClick={() => setQuickAddSubjectDay(day)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--accent-color)', padding: '0.35rem', display: 'flex', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} title={`Add Subject to ${day}`}>
                    <PlusCircle size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  {daySubjects.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '1rem 0', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No classes</div>
                  ) : (
                    daySubjects.map(subject => (
                      <div key={subject.id}
                        onClick={() => { setQuickEditSubject(subject); setActiveTab('subject-details'); }}
                        style={{
                          padding: '0.875rem',
                          background: 'var(--bg-primary)',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          transition: 'transform 0.2s',
                          border: '1px solid var(--border-color)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        title="Click to view/edit homework"
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: '1.2' }}>{subject.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{subject.startTime} - {subject.endTime}</span>
                          <span style={{ fontWeight: 500 }}>{subject.room}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Subject Modal */}
      {quickAddSubjectDay && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="animate-fade-in">
          <div style={{ padding: '2rem', width: '100%', maxWidth: '500px', margin: '1rem', background: 'var(--bg-primary)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} color="var(--accent-color)" /> {editingSubjectId ? 'Edit Subject' : `Add Subject for ${quickAddSubjectDay}`}
            </h3>
            <form onSubmit={handleAddSubject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input label="Subject Name" value={subjectName} onChange={e => setSubjectName(e.target.value)} required placeholder="e.g. Mathematics" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Teacher" value={teacherName} onChange={e => setTeacherName(e.target.value)} required placeholder="e.g. John Doe" />
                <Input label="Room" value={room} onChange={e => setRoom(e.target.value)} required placeholder="e.g. Room 101" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input type="time" label="Start Time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                <Input type="time" label="End Time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Button type="submit" variant="primary" style={{ flex: 1 }}>{editingSubjectId ? 'Save Changes' : 'Add Subject'}</Button>
                <Button type="button" variant="secondary" onClick={() => setQuickAddSubjectDay(null)} style={{ flex: 1 }}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
