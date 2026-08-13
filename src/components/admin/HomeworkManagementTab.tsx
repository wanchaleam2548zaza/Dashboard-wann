import React from 'react';
import { BookOpen, Pencil, Trash2, PlusCircle, CheckSquare, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { db } from '../../firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { CompletedByAvatars } from '../ui/CompletedByAvatars';

import type { SubjectData, HomeworkData } from '../../types';

interface HomeworkManagementTabProps {
  quickEditSubject: SubjectData;
  setActiveTab: (tab: any) => void;
  setQuickEditSubject: React.Dispatch<React.SetStateAction<SubjectData | null>>;
  hwTitle: string;
  setHwTitle: (val: string) => void;
  hwDueDate: string;
  setHwDueDate: (val: string) => void;
  editingHomeworkId: string | null;
  setEditingHomeworkId: (val: string | null) => void;
  isAddingHw: boolean;
  setIsAddingHw: (val: boolean) => void;
  handleEditSubjectClick: (subject: SubjectData) => void;
  setQuickAddSubjectDay: (day: string | null) => void;
  handleDeleteSubject: (id: string) => Promise<void>;
  groupedHomework: Record<string, HomeworkData[]>;
  allCompletedHomework: {userId: string, homeworkId: string}[];
  userList: any[];
  handleDeleteHomework: (id: string) => Promise<void>;
}

export function HomeworkManagementTab({
  quickEditSubject, setActiveTab, setQuickEditSubject, hwTitle, setHwTitle, hwDueDate,
  setHwDueDate, editingHomeworkId, setEditingHomeworkId, isAddingHw, setIsAddingHw,
  handleEditSubjectClick, setQuickAddSubjectDay, handleDeleteSubject, groupedHomework,
  allCompletedHomework, userList, handleDeleteHomework
}: HomeworkManagementTabProps) {
  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Subject Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <Button variant="secondary" onClick={() => { setActiveTab('overview'); setQuickEditSubject(null); setHwTitle(''); setHwDueDate(''); setEditingHomeworkId(null); setIsAddingHw(false); }} style={{ width: 'auto', padding: '0.5rem 1rem', flexShrink: 0 }}>
          &larr; Back to Overview
        </Button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.75rem', color: 'var(--text-primary)' }}>
            <BookOpen size={28} color="var(--accent-color)" /> {quickEditSubject.name}
          </h3>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{quickEditSubject.day}</span>
            <span>&bull;</span>
            <span>{quickEditSubject.startTime} - {quickEditSubject.endTime}</span>
            <span>&bull;</span>
            <span>Room: {quickEditSubject.room}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => {
              handleEditSubjectClick(quickEditSubject);
              setQuickAddSubjectDay(quickEditSubject.day || 'Monday');
              setActiveTab('overview');
            }}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Edit Subject"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => {
              handleDeleteSubject(quickEditSubject.id);
              setActiveTab('overview');
              setQuickEditSubject(null);
            }}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            title="Delete Subject"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
        {/* Add/Edit Form */}
        <div style={{ minWidth: 0 }}>
          <h4 className="ios-list-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={18} /> {editingHomeworkId ? 'Edit Homework' : 'Add Homework'}
          </h4>
          <div className="ios-list-group">
            <div className="ios-list" style={{ padding: '1.5rem' }}>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsAddingHw(true);
                try {
                  const hwData = { title: hwTitle, subjectId: quickEditSubject.id, dueDate: hwDueDate };
                  if (editingHomeworkId) {
                    await updateDoc(doc(db, 'homework', editingHomeworkId), hwData);
                    setEditingHomeworkId(null);
                  } else {
                    await addDoc(collection(db, 'homework'), { ...hwData, createdAt: new Date().toISOString() });
                  }
                  setHwTitle(''); setHwDueDate('');
                } catch (err) {
                  alert("Error saving homework");
                } finally {
                  setIsAddingHw(false);
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input label="Title" value={hwTitle} onChange={e => setHwTitle(e.target.value)} required placeholder="e.g. Chapter 1 Exercises" />
                <Input type="date" label="Due Date" value={hwDueDate} onChange={e => setHwDueDate(e.target.value)} required />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <Button type="submit" isLoading={isAddingHw} style={{ flex: 1 }}>{editingHomeworkId ? 'Save Changes' : 'Add Homework'}</Button>
                  {editingHomeworkId && (
                    <Button type="button" variant="secondary" onClick={() => { setEditingHomeworkId(null); setHwTitle(''); setHwDueDate(''); }}>Cancel</Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Existing Homework for this subject */}
        <div style={{ minWidth: 0 }}>
          <h4 className="ios-list-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={18} color="var(--accent-color)" /> Existing Homework
          </h4>
          <div className="ios-list-group" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <div className="ios-list">
              {(() => {
                const subjectHomework = groupedHomework[quickEditSubject.id] || [];
                if (subjectHomework.length === 0) return <div className="ios-list-item" style={{ justifyContent: 'center', color: 'var(--text-secondary)' }}>No homework assigned.</div>;
                return subjectHomework.map((hw) => (
                  <div key={hw.id} className="ios-list-item" style={{ alignItems: 'center' }}>
                    <div className="ios-list-item-content">
                      <span className="ios-list-item-title">{hw.title}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={12} color="var(--accent-color)" /> Due: <strong style={{ color: 'var(--text-primary)' }}>{new Date(hw.dueDate).toLocaleDateString()}</strong>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <CompletedByAvatars homeworkId={hw.id} allCompleted={allCompletedHomework} users={userList} />
                      </div>
                    </div>
                    <div className="ios-list-item-value" style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => { setHwTitle(hw.title); setHwDueDate(hw.dueDate); setEditingHomeworkId(hw.id); }} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-color)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'} title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteHomework(hw.id)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-primary)'} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
