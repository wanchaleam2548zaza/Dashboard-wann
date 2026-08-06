import { useState, useEffect } from 'react';
import { secondaryAuth, db } from '../firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, onSnapshot, setDoc, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Shield, Users, LogOut, LayoutDashboard, PlusCircle, BookOpen, CheckSquare, Pencil, Trash2, Calendar, BarChart2, Bell, Search, X } from 'lucide-react';
interface AdminDashboardProps {
  onLogout: () => void;
}

interface UserData {
  id: string;
  username: string;
  isOnline: boolean;
  createdAt: string;
}

interface SubjectData {
  id: string;
  name: string;
  teacher: string;
  room: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

interface HomeworkData {
  id: string;
  title: string;
  subjectId: string;
  dueDate: string;
  createdAt: string;
}

export interface HomeworkRequestData {
  id: string;
  title: string;
  subjectId: string;
  dueDate: string;
  userId: string;
  username: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subject-details' | 'analytics' | 'notifications'>('overview');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const [userList, setUserList] = useState<UserData[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectData[]>([]);
  const [homeworkList, setHomeworkList] = useState<HomeworkData[]>([]);
  const [homeworkRequests, setHomeworkRequests] = useState<HomeworkRequestData[]>([]);

  // Subject Form State
  const [subjectName, setSubjectName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');
  const [day, setDay] = useState('Monday');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [quickAddSubjectDay, setQuickAddSubjectDay] = useState<string | null>(null);


  // Homework Form State
  const [hwTitle, setHwTitle] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [isAddingHw, setIsAddingHw] = useState(false);
  const [editingHomeworkId, setEditingHomeworkId] = useState<string | null>(null);
  const [quickEditSubject, setQuickEditSubject] = useState<SubjectData | null>(null);

  // Search State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to users collection
    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users: UserData[] = [];
        snapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data() } as UserData);
        });
        setUserList(users);
        setDbError(null);
      },
      (error) => {
        console.error("Firestore users error:", error);
        setDbError(error.message || 'Unknown database error');
      }
    );

    const unsubscribeSubjects = onSnapshot(
      collection(db, 'subjects'),
      (snapshot) => {
        const subjects: SubjectData[] = [];
        snapshot.forEach((doc) => {
          subjects.push({ id: doc.id, ...doc.data() } as SubjectData);
        });
        setSubjectList(subjects);
      },
      (error) => console.error("Firestore subjects error:", error)
    );

    const unsubscribeHomework = onSnapshot(
      collection(db, 'homework'),
      (snapshot) => {
        const hw: HomeworkData[] = [];
        snapshot.forEach((doc) => {
          hw.push({ id: doc.id, ...doc.data() } as HomeworkData);
        });
        setHomeworkList(hw);
      },
      (error) => console.error("Firestore homework error:", error)
    );

    const unsubscribeRequests = onSnapshot(
      collection(db, 'homeworkRequests'),
      (snapshot) => {
        const reqs: HomeworkRequestData[] = [];
        snapshot.forEach((doc) => {
          reqs.push({ id: doc.id, ...doc.data() } as HomeworkRequestData);
        });
        setHomeworkRequests(reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      },
      (error) => console.error("Firestore requests error:", error)
    );

    return () => {
      unsubscribeUsers();
      unsubscribeSubjects();
      unsubscribeHomework();
      unsubscribeRequests();
    };
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingSubject(true);
    try {
      const subjectData = {
        name: subjectName,
        teacher: teacherName,
        room: room,
        day: quickAddSubjectDay || day,
        startTime: startTime,
        endTime: endTime
      };

      if (editingSubjectId) {
        await updateDoc(doc(db, 'subjects', editingSubjectId), subjectData);
        setEditingSubjectId(null);
      } else {
        await addDoc(collection(db, 'subjects'), {
          ...subjectData,
          createdAt: new Date().toISOString()
        });
      }

      setSubjectName('');
      setTeacherName('');
      setRoom('');
      setDay('Monday');
      setStartTime('');
      setEndTime('');
      setQuickAddSubjectDay(null);
    } catch (err) {
      console.error("Error saving subject:", err);
      alert("Error saving subject");
    } finally {
      setIsAddingSubject(false);
    }
  };

  const handleEditSubjectClick = (subject: SubjectData) => {
    setSubjectName(subject.name);
    setTeacherName(subject.teacher);
    setRoom(subject.room);
    setDay(subject.day || 'Monday');
    setStartTime(subject.startTime || '');
    setEndTime(subject.endTime || '');
    setEditingSubjectId(subject.id);
  };

  const handleDeleteSubject = async (id: string) => {
    if (confirm("Are you sure you want to delete this subject?")) {
      try {
        await deleteDoc(doc(db, 'subjects', id));
      } catch (err) {
        console.error("Error deleting subject:", err);
        alert("Error deleting subject");
      }
    }
  };



  const handleDeleteHomework = async (id: string) => {
    if (confirm("Are you sure you want to delete this homework?")) {
      try {
        await deleteDoc(doc(db, 'homework', id));
      } catch (err) {
        console.error("Error deleting homework:", err);
        alert("Error deleting homework");
      }
    }
  };

  const handleApproveRequest = async (req: HomeworkRequestData) => {
    try {
      await addDoc(collection(db, 'homework'), {
        title: req.title,
        subjectId: req.subjectId,
        dueDate: req.dueDate,
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'homeworkRequests', req.id), { status: 'approved' });
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request");
    }
  };

  const handleDenyRequest = async (req: HomeworkRequestData) => {
    try {
      await updateDoc(doc(db, 'homeworkRequests', req.id), { status: 'denied' });
    } catch (error) {
      console.error("Error denying request:", error);
      alert("Failed to deny request");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, `${username}@dashboard.com`, password);

      // 2. Save user info to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: username,
        isOnline: false,
        createdAt: new Date().toISOString()
      });

      await signOut(secondaryAuth); // Sign out of the secondary app

      setMessage({ type: 'success', text: 'User created successfully! They can now log in.' });
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error creating user' });
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const groupedSubjects = subjectList.reduce((acc, subject) => {
    const day = subject.day || 'Unknown';
    if (!acc[day]) acc[day] = [];
    acc[day].push(subject);
    return acc;
  }, {} as Record<string, SubjectData[]>);

  Object.keys(groupedSubjects).forEach(day => {
    groupedSubjects[day].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  });

  const groupedHomework = subjectList.reduce((acc, subject) => {
    acc[subject.id] = homeworkList.filter(hw => hw.subjectId === subject.id);
    return acc;
  }, {} as Record<string, HomeworkData[]>);


  // Analytics Calculations
  const totalHomework = homeworkList.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const hwDueThisWeek = homeworkList.filter(hw => {
    const due = new Date(hw.dueDate);
    return due >= today && due <= nextWeek;
  }).length;

  const subjectHwCounts = subjectList.map(s => {
    return {
      id: s.id,
      name: s.name,
      count: homeworkList.filter(hw => hw.subjectId === s.id).length
    };
  }).sort((a, b) => b.count - a.count);

  const mostActiveSubject = subjectHwCounts.length > 0 && subjectHwCounts[0].count > 0 ? subjectHwCounts[0] : null;

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
          <Shield size={28} color="var(--accent-color)" />
          <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Admin Panel</h1>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <Button
            variant={activeTab === 'overview' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('overview')}
            style={{ justifyContent: 'flex-start', border: activeTab === 'overview' ? 'none' : 'none', background: activeTab === 'overview' ? 'var(--accent-color)' : 'transparent' }}
          >
            <LayoutDashboard size={18} />
            Overview
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('analytics')}
            style={{ justifyContent: 'flex-start', border: activeTab === 'analytics' ? 'none' : 'none', background: activeTab === 'analytics' ? 'var(--accent-color)' : 'transparent' }}
          >
            <BarChart2 size={18} />
            Analytics
          </Button>
          <Button
            variant={activeTab === 'notifications' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('notifications')}
            style={{ justifyContent: 'flex-start', border: activeTab === 'notifications' ? 'none' : 'none', background: activeTab === 'notifications' ? 'var(--accent-color)' : 'transparent', position: 'relative' }}
          >
            <Bell size={18} />
            Notifications
            {homeworkRequests.filter(r => r.status === 'pending').length > 0 && (
              <span style={{ position: 'absolute', right: '1rem', background: '#ef4444', color: 'white', borderRadius: '10px', padding: '0.1rem 0.4rem', fontSize: '0.7rem', fontWeight: 600 }}>
                {homeworkRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'users' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('users')}
            style={{ justifyContent: 'flex-start', border: activeTab === 'users' ? 'none' : 'none', background: activeTab === 'users' ? 'var(--accent-color)' : 'transparent' }}
          >
            <Users size={18} />
            User Management
          </Button>
        </nav>

        <Button variant="secondary" onClick={onLogout} style={{ justifyContent: 'center' }}>
          <LogOut size={18} />
          Sign Out
        </Button>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-header">
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
            {activeTab === 'overview' && 'System Overview'}
            {activeTab === 'analytics' && 'Analytics Dashboard'}
            {activeTab === 'notifications' && 'Notifications'}
            {activeTab === 'users' && 'User Management'}
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => setShowSearch(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }} title="Search">
              <Search size={22} />
            </button>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Welcome, Administrator
            </div>
          </div>
        </header>

        <div className="admin-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2rem' }}>

          {activeTab === 'overview' && (
            <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
              <Card style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={20} /> User Presence
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {userList.filter(u => u.isOnline).length} Online / {userList.length} Total
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {dbError && <div style={{ color: '#ef4444', gridColumn: '1 / -1' }}>{dbError}</div>}
                  {userList.length === 0 && !dbError ? (
                    <p style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>No users found.</p>
                  ) : (
                    userList.map(user => (
                      <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{user.username}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: user.isOnline ? '#10b981' : '#ef4444' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: user.isOnline ? '#10b981' : '#ef4444' }} />
                          {user.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Weekly Schedule Overview */}
              <Card style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={20} /> Weekly Schedule Overview
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  paddingBottom: '0.5rem'
                }}>
                  {daysOfWeek.map(day => {
                    const daySubjects = groupedSubjects[day] || [];
                    return (
                      <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{
                          textAlign: 'center',
                          fontWeight: 600,
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          background: 'var(--bg-primary)',
                          borderBottom: '2px solid var(--accent-color)',
                          borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>{day.substring(0, 3)}</span>
                          <button onClick={() => setQuickAddSubjectDay(day)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-color)', padding: 0, display: 'flex' }} title={`Add Subject to ${day}`}>
                            <PlusCircle size={14} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {daySubjects.length === 0 ? (
                            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>-</div>
                          ) : (
                            daySubjects.map(subject => (
                              <div key={subject.id}
                                onClick={() => { setQuickEditSubject(subject); setActiveTab('subject-details'); }}
                                style={{
                                  padding: '0.6rem 0.5rem',
                                  background: 'var(--bg-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.25rem',
                                  cursor: 'pointer',
                                  transition: 'border-color 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                title="Click to view/edit homework"
                              >
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.75rem', lineHeight: '1.2' }}>{subject.name}</div>
                                <div style={{ color: 'var(--accent-color)', fontWeight: 500, fontSize: '0.65rem' }}>{subject.startTime} - {subject.endTime}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
              {quickAddSubjectDay && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="animate-fade-in">
                  <Card style={{ padding: '2rem', width: '100%', maxWidth: '500px', margin: '1rem', background: 'var(--bg-primary)' }}>
                    <h3 style={{ fontSize: '1.25rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BookOpen size={24} /> {editingSubjectId ? 'Edit Subject' : `Add Subject for ${quickAddSubjectDay}`}
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
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <Button type="submit" isLoading={isAddingSubject} style={{ flex: 1 }}>{editingSubjectId ? 'Save Changes' : 'Add Subject'}</Button>
                        <Button type="button" variant="secondary" onClick={() => { setQuickAddSubjectDay(null); setEditingSubjectId(null); setSubjectName(''); setTeacherName(''); setRoom(''); setStartTime(''); setEndTime(''); }}>Cancel</Button>
                      </div>
                    </form>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <Card style={{ width: '100%', maxWidth: '500px' }} className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <PlusCircle size={24} />
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Create New User</h3>
              </div>

              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Create a new user account. The user will be able to log in using the username and password you set here.
              </p>

              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                  label="Username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Set a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />

                {message && (
                  <div style={{
                    color: message.type === 'error' ? '#ef4444' : '#10b981',
                    fontSize: '0.875rem',
                    padding: '0.75rem',
                    backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    {message.text}
                  </div>
                )}

                <Button type="submit" isLoading={loading} style={{ marginTop: '0.5rem' }}>
                  Create Account
                </Button>
              </form>
            </Card>
          )}

          {activeTab === 'subject-details' && quickEditSubject && (
            <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.6rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
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
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.6rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
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
                <Card style={{ padding: '1.5rem', height: 'fit-content' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PlusCircle size={20} /> {editingHomeworkId ? 'Edit Homework' : 'Add Homework'}
                  </h4>
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
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <Button type="submit" isLoading={isAddingHw} style={{ flex: 1 }}>{editingHomeworkId ? 'Save Changes' : 'Add Homework'}</Button>
                      {editingHomeworkId && (
                        <Button type="button" variant="secondary" onClick={() => { setEditingHomeworkId(null); setHwTitle(''); setHwDueDate(''); }}>Cancel</Button>
                      )}
                    </div>
                  </form>
                </Card>

                {/* Existing Homework for this subject */}
                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={20} /> Existing Homework
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '500px' }}>
                    {(() => {
                      const subjectHomework = groupedHomework[quickEditSubject.id] || [];
                      if (subjectHomework.length === 0) return <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No homework assigned.</p>;
                      return subjectHomework.map(hw => (
                        <div key={hw.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{hw.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={12} /> Due: {new Date(hw.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => { setHwTitle(hw.title); setHwDueDate(hw.dueDate); setEditingHomeworkId(hw.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Edit"><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteHomework(hw.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Assignments</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalHomework}</div>
                </Card>

                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due This Week</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{hwDueThisWeek}</div>
                </Card>

                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most Active Subject</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {mostActiveSubject ? mostActiveSubject.name : 'N/A'}
                  </div>
                  {mostActiveSubject && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{mostActiveSubject.count} assignments</div>}
                </Card>
              </div>

              <Card style={{ padding: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                  <BarChart2 size={20} /> Homework Distribution by Subject
                </h3>

                {subjectHwCounts.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No subjects available for analysis.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                    {subjectHwCounts.map((subject) => {
                      const maxCount = Math.max(...subjectHwCounts.map(s => s.count));
                      const percentage = maxCount === 0 ? 0 : (subject.count / maxCount) * 100;
                      return (
                        <div key={subject.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{subject.name}</span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{subject.count} assignments</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <div style={{
                              width: `${percentage}%`,
                              height: '100%',
                              background: 'var(--accent-color)',
                              borderRadius: '4px',
                              transition: 'width 0.5s ease-out'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
              <Card style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={24} /> Homework Requests
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {homeworkRequests.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No notifications.</p>
                  ) : (
                    homeworkRequests.map(req => {
                      const subject = subjectList.find(s => s.id === req.subjectId);
                      return (
                        <div key={req.id} style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem', fontSize: '1rem' }}>{req.title}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                              <span>Suggested by: <strong style={{ color: 'var(--text-primary)' }}>{req.username}</strong></span>
                              <span>Subject: <strong style={{ color: 'var(--text-primary)' }}>{subject ? subject.name : 'Unknown'}</strong></span>
                              <span>Due: <strong style={{ color: 'var(--text-primary)' }}>{new Date(req.dueDate).toLocaleDateString()}</strong></span>
                            </div>
                          </div>

                          {req.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                              <Button onClick={() => handleApproveRequest(req)} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', width: 'auto' }}>Approve</Button>
                              <Button onClick={() => handleDenyRequest(req)} variant="secondary" style={{ padding: '0.5rem 1rem', color: '#ef4444', border: '1px solid #ef4444', width: 'auto' }}>Deny</Button>
                            </div>
                          ) : (
                            <div style={{
                              fontSize: '0.875rem', fontWeight: 600, padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-xl)',
                              background: req.status === 'approved' ? '#10b98120' : '#ef444420',
                              color: req.status === 'approved' ? '#10b981' : '#ef4444',
                              textTransform: 'capitalize',
                              flexShrink: 0
                            }}>
                              {req.status}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          )}

        </div>
      </main>

      {/* Search Overlay */}
      {showSearch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1000, display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Search size={20} color="var(--text-secondary)" />
            <input
              autoFocus
              type="text"
              placeholder="Search subjects, teachers, rooms, or homework..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.125rem', outline: 'none' }}
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}>
              <X size={24} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {searchQuery.trim() === '' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', paddingTop: '1rem', width: '100%' }}>
                <Card style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={18} color="var(--accent-color)" /> Overview Stats
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{subjectList.length}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Subjects</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-color)' }}>{homeworkList.length}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Assignments</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{homeworkRequests.filter(r => r.status === 'pending').length}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending Requests</div>
                    </div>
                  </div>
                </Card>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>Type above to search subjects or homework...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
                {/* Subject Results */}
                {(() => {
                  const q = searchQuery.toLowerCase();
                  const subjects = subjectList.filter(s => s.name.toLowerCase().includes(q) || s.teacher.toLowerCase().includes(q) || s.room.toLowerCase().includes(q));
                  const homework = homeworkList.filter(h => h.title.toLowerCase().includes(q));

                  if (subjects.length === 0 && homework.length === 0) {
                    return <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>No results found for "{searchQuery}"</div>;
                  }

                  return (
                    <>
                      {subjects.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subjects</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {subjects.map(s => (
                              <div key={s.id} onClick={() => { setQuickEditSubject(s); setActiveTab('subject-details'); setShowSearch(false); setSearchQuery(''); }} style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <BookOpen size={20} color="var(--accent-color)" />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Teacher: {s.teacher} &bull; Room: {s.room}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {homework.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Homework</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {homework.map(h => {
                              const parentSubject = subjectList.find(sub => sub.id === h.subjectId);
                              return (
                                <div key={h.id} onClick={() => {
                                  if (parentSubject) {
                                    setQuickEditSubject(parentSubject);
                                    setActiveTab('subject-details');
                                    setShowSearch(false);
                                    setSearchQuery('');
                                  }
                                }} style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckSquare size={20} color="#10b981" />
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{h.title}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                      {parentSubject ? parentSubject.name : 'Unknown'} &bull; Due: {new Date(h.dueDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
