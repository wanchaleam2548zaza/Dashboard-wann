import { useState, useEffect } from 'react';
import { secondaryAuth, db } from '../firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, onSnapshot, setDoc, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '../components/ui/Button';
import { Shield, Users, LogOut, LayoutDashboard, BookOpen, CheckSquare, BarChart2, Bell, Search, X, Megaphone, FileText } from 'lucide-react';
import { UserManagementTab } from '../components/admin/UserManagementTab';
import { ScheduleManagementTab } from '../components/admin/ScheduleManagementTab';
import { HomeworkManagementTab } from '../components/admin/HomeworkManagementTab';
import { BroadcastTab } from '../components/admin/BroadcastTab';
import { ExamManagementTab } from '../components/admin/ExamManagementTab';
import type { UserData, SubjectData, HomeworkData, HomeworkRequestData, ExamData } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}


export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subjects' | 'homework' | 'analytics' | 'subject-details' | 'notifications' | 'broadcasts' | 'exams'>('overview');


  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const [userList, setUserList] = useState<UserData[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectData[]>([]);
  const [homeworkList, setHomeworkList] = useState<HomeworkData[]>([]);
  const [allCompletedHomework, setAllCompletedHomework] = useState<{ userId: string, homeworkId: string }[]>([]);
  const [homeworkRequests, setHomeworkRequests] = useState<HomeworkRequestData[]>([]);

  // Subject Form State
  const [subjectName, setSubjectName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');
  const [day, setDay] = useState('Monday');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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
  const [examList, setExamList] = useState<ExamData[]>([]);

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
        snapshot.forEach((doc) => hw.push({ id: doc.id, ...doc.data() } as HomeworkData));
        setHomeworkList(hw);
      },
      (error) => console.error("Firestore homework error:", error)
    );

    // Subscribe to all completed homework
    const unsubscribeCompletions = onSnapshot(
      collection(db, 'completedHomework'),
      (snapshot) => {
        const completed: { userId: string, homeworkId: string }[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId && data.homeworkId) {
            completed.push({ userId: data.userId, homeworkId: data.homeworkId });
          }
        });
        setAllCompletedHomework(completed);
      },
      (error) => console.error("Firestore completions error:", error)
    );

    // Subscribe to homework requests
    const unsubscribeHwRequests = onSnapshot(
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

    const unsubscribeExams = onSnapshot(
      collection(db, 'exams'),
      (snapshot) => {
        const exams: ExamData[] = [];
        snapshot.forEach((doc) => {
          exams.push({ id: doc.id, ...doc.data() } as ExamData);
        });
        setExamList(exams);
      },
      (error) => console.error("Firestore exams error:", error)
    );

    return () => {
      unsubscribeUsers();
      unsubscribeSubjects();
      unsubscribeHomework();
      unsubscribeCompletions();
      unsubscribeHwRequests();
      unsubscribeExams();
    };
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
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
          }
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
    <div className="admin-desktop-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Shield size={36} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem auto' }} />
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Admin Panel</h1>
        </div>
        
        <nav className="admin-sidebar-nav">
          <button onClick={() => setActiveTab('overview')} className={`admin-sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Overview
          </button>
          
          <button onClick={() => setActiveTab('notifications')} className={`admin-sidebar-btn ${activeTab === 'notifications' ? 'active' : ''}`}>
            <div style={{ position: 'relative' }}>
              <Bell size={20} />
              {homeworkRequests.filter(r => r.status === 'pending').length > 0 && (
                <div style={{ position: 'absolute', top: '-4px', right: '-8px', background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 700, minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.2rem', border: '2px solid var(--bg-secondary)' }}>
                  {homeworkRequests.filter(r => r.status === 'pending').length > 99 ? '99+' : homeworkRequests.filter(r => r.status === 'pending').length}
                </div>
              )}
            </div>
            Alerts
          </button>
          
          <button onClick={() => setActiveTab('users')} className={`admin-sidebar-btn ${activeTab === 'users' ? 'active' : ''}`}>
            <Users size={20} /> Users
          </button>

          <button onClick={() => setActiveTab('broadcasts')} className={`admin-sidebar-btn ${activeTab === 'broadcasts' ? 'active' : ''}`}>
            <Megaphone size={20} /> Broadcasts
          </button>

          <button onClick={() => setActiveTab('analytics')} className={`admin-sidebar-btn ${activeTab === 'analytics' ? 'active' : ''}`}>
            <BarChart2 size={20} /> Analytics
          </button>

          <button onClick={() => setActiveTab('exams')} className={`admin-sidebar-btn ${activeTab === 'exams' ? 'active' : ''}`}>
            <FileText size={20} /> Exams
          </button>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={onLogout} className="admin-sidebar-btn" style={{ width: '100%', color: '#ff3b30' }}>
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <button onClick={() => setShowSearch(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '100px', padding: '0.5rem 1.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <Search size={18} /> Search
          </button>
        </div>

        {activeTab === 'overview' && (
          <ScheduleManagementTab
            userList={userList}
            dbError={dbError}
            daysOfWeek={daysOfWeek}
            groupedSubjects={groupedSubjects}
            setQuickAddSubjectDay={setQuickAddSubjectDay}
            quickAddSubjectDay={quickAddSubjectDay}
            setQuickEditSubject={setQuickEditSubject}
            setActiveTab={setActiveTab}
            editingSubjectId={editingSubjectId}
            handleAddSubject={handleAddSubject}
            subjectName={subjectName}
            setSubjectName={setSubjectName}
            teacherName={teacherName}
            setTeacherName={setTeacherName}
            room={room}
            setRoom={setRoom}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
          />
        )}

        {activeTab === 'users' && (
          <UserManagementTab
            handleCreateUser={handleCreateUser}
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            message={message}
            loading={loading}
            userList={userList}
          />
        )}

        {activeTab === 'broadcasts' && (
          <BroadcastTab />
        )}

        {activeTab === 'subject-details' && quickEditSubject && (
          <HomeworkManagementTab
            quickEditSubject={quickEditSubject}
            setActiveTab={setActiveTab}
            setQuickEditSubject={setQuickEditSubject}
            hwTitle={hwTitle}
            setHwTitle={setHwTitle}
            hwDueDate={hwDueDate}
            setHwDueDate={setHwDueDate}
            editingHomeworkId={editingHomeworkId}
            setEditingHomeworkId={setEditingHomeworkId}
            isAddingHw={isAddingHw}
            setIsAddingHw={setIsAddingHw}
            handleEditSubjectClick={(subject) => {
              setEditingSubjectId(subject.id);
              setSubjectName(subject.name);
              setTeacherName(subject.teacher);
              setRoom(subject.room);
              setStartTime(subject.startTime || '');
              setEndTime(subject.endTime || '');
            }}
            setQuickAddSubjectDay={setQuickAddSubjectDay}
            handleDeleteSubject={handleDeleteSubject}
            groupedHomework={groupedHomework}
            allCompletedHomework={allCompletedHomework}
            userList={userList}
            handleDeleteHomework={handleDeleteHomework}
          />
        )}

        {activeTab === 'analytics' && (
          <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div className='ios-list-group' style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary))' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Assignments</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalHomework}</div>
              </div>

              <div className='ios-list-group' style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary))' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due This Week</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-color)' }}>{hwDueThisWeek}</div>
              </div>

              <div className='ios-list-group' style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary))' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most Active Subject</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {mostActiveSubject ? mostActiveSubject.name : 'N/A'}
                </div>
                {mostActiveSubject && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{mostActiveSubject.count} assignments</div>}
              </div>
            </div>

            <div className='ios-list-group' style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                <BarChart2 size={20} color="var(--accent-color)" /> Homework Distribution
              </h3>

              {subjectHwCounts.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', margin: 0, padding: '1rem', textAlign: 'center' }}>No subjects available for analysis.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                  {subjectHwCounts.map((subject) => {
                    const maxCount = Math.max(...subjectHwCounts.map(s => s.count));
                    const percentage = maxCount === 0 ? 0 : (subject.count / maxCount) * 100;
                    return (
                      <div key={subject.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{subject.name}</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{subject.count} assignments</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'var(--accent-color)',
                            borderRadius: '12px',
                            transition: 'width 0.5s ease-out'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

              )}
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <ExamManagementTab
            examList={examList}
            subjectList={subjectList}
            onAddExam={async (data) => {
              await addDoc(collection(db, 'exams'), { ...data, createdAt: new Date().toISOString() });
            }}
            onUpdateExam={async (id, data) => {
              await updateDoc(doc(db, 'exams', id), data);
            }}
            onDeleteExam={async (id) => {
              await deleteDoc(doc(db, 'exams', id));
            }}
          />
        )}

        {activeTab === 'notifications' && (
          <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
            <div className='ios-list-group' style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', maxHeight: '700px' }}>
              <h3 style={{ fontSize: '1.125rem', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Bell size={22} color="var(--accent-color)" /> Homework Requests
              </h3>

              <div style={{
                display: 'flex', flexDirection: 'column',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                flex: 1
              }}>
                {homeworkRequests.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', padding: '1.5rem', textAlign: 'center' }}>No notifications.</p>
                ) : (
                  homeworkRequests.map((req, idx) => {
                    const subject = subjectList.find(s => s.id === req.subjectId);
                    return (
                      <div key={req.id} style={{
                        padding: '1rem',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                        borderBottom: idx === homeworkRequests.length - 1 ? 'none' : '1px solid var(--border-color)'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem', fontSize: '0.95rem' }}>{req.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            <span>Suggested by: <strong style={{ color: 'var(--text-primary)' }}>{req.username}</strong></span>
                            <span>Subject: <strong style={{ color: 'var(--text-primary)' }}>{subject ? subject.name : 'Unknown'}</strong></span>
                            <span>Due: <strong style={{ color: 'var(--text-primary)' }}>{new Date(req.dueDate).toLocaleDateString()}</strong></span>
                          </div>
                        </div>

                        {req.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                            <Button onClick={() => handleApproveRequest(req)} style={{ padding: '0.4rem 1rem', background: '#34c759', color: 'white', border: 'none', width: 'auto', borderRadius: '100px', fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 2px 4px rgba(52, 199, 89, 0.2)' }}>Approve</Button>
                            <Button onClick={() => handleDenyRequest(req)} variant="secondary" style={{ padding: '0.4rem 1rem', color: '#ff3b30', background: 'rgba(255, 59, 48, 0.1)', border: 'none', width: 'auto', borderRadius: '100px', fontSize: '0.875rem', fontWeight: 600 }}>Deny</Button>
                          </div>
                        ) : (
                          <div style={{
                            fontSize: '0.75rem', fontWeight: 600, padding: '0.35rem 0.75rem', borderRadius: '100px',
                            background: req.status === 'approved' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                            color: req.status === 'approved' ? '#34c759' : '#ff3b30',
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
            </div>
          </div>
        )}

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
                <div className='ios-list-group' style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
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
                </div>
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
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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



