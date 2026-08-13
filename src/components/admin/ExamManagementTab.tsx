import React, { useState } from 'react';
import { FileText, PlusCircle, Edit2, Trash2, Clock, MapPin, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ExamData, SubjectData } from '../../types';

interface ExamManagementTabProps {
  examList: ExamData[];
  subjectList: SubjectData[];
  onAddExam: (exam: Omit<ExamData, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateExam: (id: string, exam: Omit<ExamData, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteExam: (id: string) => Promise<void>;
}

export function ExamManagementTab({
  examList, subjectList, onAddExam, onUpdateExam, onDeleteExam
}: ExamManagementTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setTitle('');
    setSubjectId('');
    setExamDate('');
    setStartTime('');
    setEndTime('');
    setRoom('');
    setNotes('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (exam: ExamData) => {
    setTitle(exam.title || '');
    setSubjectId(exam.subjectId || '');
    setExamDate(exam.examDate || '');
    setStartTime(exam.startTime || '');
    setEndTime(exam.endTime || '');
    setRoom(exam.room || '');
    setNotes(exam.notes || '');
    setEditingId(exam.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId || !examDate) return;

    const data = { 
      title: (title || '').trim(), 
      subjectId, 
      examDate, 
      startTime: startTime || '', 
      endTime: endTime || '', 
      room: (room || '').trim(), 
      notes: (notes || '').trim() 
    };

    if (editingId) {
      await onUpdateExam(editingId, data);
    } else {
      await onAddExam(data);
    }
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this exam?')) return;
    await onDeleteExam(id);
  };

  const getSubjectName = (sid: string) => subjectList.find(s => s.id === sid)?.name || '—';

  // Sort: upcoming first, then by date
  const sortedExams = [...examList].sort((a, b) => (a.examDate || '').localeCompare(b.examDate || ''));

  return (
    <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="ios-list-header" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="var(--accent-color)" /> Exam Management
        </h3>
        <Button onClick={() => { resetForm(); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <PlusCircle size={16} /> Add Exam
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="ios-list-group" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontWeight: 600 }}>{editingId ? 'Edit Exam' : 'Add Exam'}</h4>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input label="Exam Title" placeholder="e.g. Midterm Math" value={title} onChange={e => setTitle(e.target.value)} />

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Subject</label>
              <select
                className="ios-select"
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Select subject</option>
                {subjectList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <Input label="Exam Date" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input label="Start Time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              <Input label="End Time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>

            <Input label="Room" placeholder="e.g. Room 301" value={room} onChange={e => setRoom(e.target.value)} />

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Notes</label>
              <textarea
                className="ios-select"
                placeholder="e.g. Chapters 1-5, bring calculator"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button type="submit" disabled={!title.trim() || !subjectId || !examDate} style={{ flex: 1 }}>
                {editingId ? 'Update' : 'Add'}
              </Button>
              <button type="button" onClick={resetForm} className="btn btn-secondary" style={{ flex: 1, borderRadius: '12px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exam List */}
      <div className="ios-list-group">
        <div className="ios-list">
          {sortedExams.length === 0 ? (
            <div className="ios-list-item" style={{ justifyContent: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              No exams yet.
            </div>
          ) : (
            sortedExams.map(exam => {
              const now = new Date();
              const examD = new Date(exam.examDate + 'T00:00:00');
              const isPast = examD < new Date(now.getFullYear(), now.getMonth(), now.getDate());

              return (
                <div key={exam.id} className="ios-list-item" style={{ alignItems: 'flex-start', opacity: isPast ? 0.5 : 1, gap: '0.75rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                    <span style={{
                      fontSize: '0.7rem',
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
                    <span className="ios-list-item-title" style={{ fontWeight: 600 }}>
                      {exam.title}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <FileText size={11} /> {exam.examDate}
                      </span>
                      {exam.startTime && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Clock size={11} /> {exam.startTime}{exam.endTime ? `—${exam.endTime}` : ''}
                        </span>
                      )}
                      {exam.room && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <MapPin size={11} /> {exam.room}
                        </span>
                      )}
                    </div>
                    {exam.notes && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {exam.notes}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button onClick={() => handleEdit(exam)} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '0.25rem' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(exam.id)} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', padding: '0.25rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
