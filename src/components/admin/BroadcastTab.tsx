import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Megaphone, Send, AlertTriangle, Info, XCircle, Trash2, Edit2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import type { AnnouncementData } from '../../types';

export function BroadcastTab() {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'urgent'>('info');
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnnouncementData));
      setAnnouncements(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), {
          message: message.trim(),
          type,
          updatedAt: new Date().toISOString()
        });
        setEditingId(null);
      } else {
        // Deactivate all old ones first (optional, but good practice if you only want 1 active banner)
        const activeAnnouncements = announcements.filter(a => a.active);
        for (const a of activeAnnouncements) {
          await updateDoc(doc(db, 'announcements', a.id), { active: false });
        }

        await addDoc(collection(db, 'announcements'), {
          message: message.trim(),
          type,
          active: true,
          createdAt: new Date().toISOString()
        });
      }
      setMessage('');
      setType('info');
    } catch (err) {
      alert("Error saving broadcast");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ann: AnnouncementData) => {
    setMessage(ann.message);
    setType(ann.type);
    setEditingId(ann.id);
  };

  const cancelEdit = () => {
    setMessage('');
    setType('info');
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this broadcast?")) {
      await deleteDoc(doc(db, 'announcements', id));
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    // If activating, deactivate others first
    if (!currentActive) {
      const activeAnnouncements = announcements.filter(a => a.active);
      for (const a of activeAnnouncements) {
        await updateDoc(doc(db, 'announcements', a.id), { active: false });
      }
    }
    await updateDoc(doc(db, 'announcements', id), { active: !currentActive });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%', maxWidth: '1000px' }} className="animate-fade-in">
      
      {/* Compose Broadcast */}
      <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
          <Megaphone size={24} color="var(--accent-color)" /> {editingId ? 'Edit Broadcast' : 'Send a Broadcast'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Instantly show a banner notification on every user's screen. Only one broadcast can be active at a time.
        </p>

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="E.g. The system will be down for maintenance at 12:00 AM."
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                minHeight: '100px',
                resize: 'vertical'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Message Type</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', border: `2px solid ${type === 'info' ? '#3b82f6' : 'var(--border-color)'}`, background: type === 'info' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                <input type="radio" name="type" checked={type === 'info'} onChange={() => setType('info')} style={{ display: 'none' }} />
                <Info size={18} color="#3b82f6" />
                <span style={{ fontWeight: type === 'info' ? 600 : 400, color: type === 'info' ? '#3b82f6' : 'var(--text-primary)' }}>Information (Blue)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', border: `2px solid ${type === 'warning' ? '#f59e0b' : 'var(--border-color)'}`, background: type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'transparent' }}>
                <input type="radio" name="type" checked={type === 'warning'} onChange={() => setType('warning')} style={{ display: 'none' }} />
                <AlertTriangle size={18} color="#f59e0b" />
                <span style={{ fontWeight: type === 'warning' ? 600 : 400, color: type === 'warning' ? '#f59e0b' : 'var(--text-primary)' }}>Warning (Yellow)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', border: `2px solid ${type === 'urgent' ? '#ef4444' : 'var(--border-color)'}`, background: type === 'urgent' ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                <input type="radio" name="type" checked={type === 'urgent'} onChange={() => setType('urgent')} style={{ display: 'none' }} />
                <XCircle size={18} color="#ef4444" />
                <span style={{ fontWeight: type === 'urgent' ? 600 : 400, color: type === 'urgent' ? '#ef4444' : 'var(--text-primary)' }}>Urgent (Red)</span>
              </label>

            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Button type="submit" isLoading={loading} style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
              <Send size={18} /> {editingId ? 'Update Broadcast' : 'Send Broadcast'}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={cancelEdit} style={{ padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 600 }}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Broadcast History */}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Broadcast History</h3>
        
        <div className="admin-data-table-container">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Message</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((ann) => (
                <tr key={ann.id} style={{ background: ann.active ? 'rgba(52, 199, 89, 0.05)' : 'transparent' }}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {ann.createdAt ? new Date(ann.createdAt).toLocaleString('th-TH') : 'N/A'}
                  </td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ann.message}
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize', fontSize: '0.8rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.05)' }}>
                      {ann.type}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${ann.active ? 'online' : 'offline'}`}>
                      <span className="dot" />
                      {ann.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleEdit(ann)}
                        style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <Button 
                        variant={ann.active ? 'secondary' : 'primary'} 
                        onClick={() => toggleActive(ann.id, ann.active)}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '100px' }}
                      >
                        {ann.active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <button 
                        onClick={() => handleDelete(ann.id)}
                        style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {announcements.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No broadcasts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
