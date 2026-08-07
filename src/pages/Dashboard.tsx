import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { signOut, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { doc, updateDoc, setDoc, collection, onSnapshot, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LogOut, Bell, BookOpen, CheckSquare, Clock, MapPin, User as UserIcon, Home, Calendar, UserCircle, PlusCircle, BarChart2, Search, X, CheckCircle2, ArrowLeft, Camera, Trash2, Lock, Eye, EyeOff, Users, Edit2, Check, Globe } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import { useLanguage } from '../contexts/LanguageContext';
import type { TranslationKey } from '../translations';

interface DashboardProps {
  user: FirebaseUser;
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

export function Dashboard({ user }: DashboardProps) {
  const { t, language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [subjectList, setSubjectList] = useState<SubjectData[]>([]);
  const [homeworkList, setHomeworkList] = useState<HomeworkData[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'analytics' | 'friends' | 'profile' | 'subject-details'>('home');
  
  const currentDayIndex = new Date().getDay(); // 0 is Sunday
  const defaultDay = currentDayIndex === 0 ? 'Sunday' : 
                     currentDayIndex === 1 ? 'Monday' :
                     currentDayIndex === 2 ? 'Tuesday' :
                     currentDayIndex === 3 ? 'Wednesday' :
                     currentDayIndex === 4 ? 'Thursday' :
                     currentDayIndex === 5 ? 'Friday' : 'Saturday';
                     
  const [selectedDay, setSelectedDay] = useState<string>(defaultDay);
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);
  const [subjectHwTab, setSubjectHwTab] = useState<'new' | 'urgent' | 'overdue' | 'completed'>('new');

  const [homeworkRequests, setHomeworkRequests] = useState<HomeworkRequestData[]>([]);
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState('');
  const [suggestSubject, setSuggestSubject] = useState('');
  const [suggestDueDate, setSuggestDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Homework To-Do State
  const [completedHomeworkIds, setCompletedHomeworkIds] = useState<Set<string>>(new Set());
  const [selectedHomework, setSelectedHomework] = useState<HomeworkData | null>(null);

  // Profile / Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPublicId, setAvatarPublicId] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Display Name State
  const [displayName, setDisplayName] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  // Friends / User List State
  interface UserListItem {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    isOnline?: boolean;
  }
  const [userList, setUserList] = useState<UserListItem[]>([]);

  // Change Password State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [profileLoading, setProfileLoading] = useState(true);

  // Load avatar + displayName from Firestore in real-time
  useEffect(() => {
    const userDocRef = doc(db, 'users', user.uid);
    const unsubMe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        else setAvatarUrl(null);
        
        if (data.avatarPublicId) setAvatarPublicId(data.avatarPublicId);
        else setAvatarPublicId(null);
        
        const dn = data.displayName || data.username || user.email?.replace('@dashboard.com', '') || '';
        // Only update input if we aren't currently editing it
        setDisplayName(dn);
        setDisplayNameInput(prev => editingDisplayName ? prev : dn);
      }
      setProfileLoading(false);
    }, (err) => {
      console.error("Error fetching my profile:", err);
      setProfileLoading(false);
    });

    // Subscribe to all users for Friends tab
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserListItem[] = [];
      snap.forEach(d => {
        if (d.id !== user.uid) {
          list.push({ id: d.id, ...d.data() } as UserListItem);
        }
      });
      list.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));
      setUserList(list);
    });

    return () => {
      unsubMe();
      unsubUsers();
    };
  }, [user.uid, editingDisplayName]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'dashboard_avatars');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
      // If old avatar exists, delete it from Cloudinary first
      if (avatarPublicId) {
        await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: avatarPublicId, upload_preset: uploadPreset }),
        }).catch(() => {});
      }
      // Save new URL + publicId to Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { avatarUrl: data.secure_url, avatarPublicId: data.public_id }, { merge: true });
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      alert(`อัปโหลดรูปไม่สำเร็จ: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    if (!avatarPublicId) return;
    if (!confirm('ต้องการลบรูปโปรไฟล์ใช่ไหม?')) return;
    setIsUploadingAvatar(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: avatarPublicId, upload_preset: uploadPreset }),
      });
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { avatarUrl: null, avatarPublicId: null }, { merge: true });
    } catch (err: any) {
      console.error('Delete avatar error:', err);
      alert(`ลบรูปไม่สำเร็จ: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'New password and Confirm password do not match!' });
      return;
    }
    if (newPassword.length < 6) {
      setPwMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    setPwLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPwMessage({ type: 'success', text: 'Password changed successfully! ✅' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setShowChangePassword(false); setPwMessage(null); }, 2000);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPwMessage({ type: 'error', text: 'Old password is incorrect.' });
      } else {
        setPwMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
      }
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    // Set user online when component mounts. Use setDoc with merge so old users get added automatically.
    const userDocRef = doc(db, 'users', user.uid);
    const username = user.email?.replace('@dashboard.com', '') || 'Unknown';
    setDoc(userDocRef, { username, isOnline: true }, { merge: true }).catch(console.error);

    // Set offline when window closes
    const handleBeforeUnload = () => {
      updateDoc(userDocRef, { isOnline: false }).catch(console.error);
    };

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
      query(collection(db, 'homeworkRequests'), where('userId', '==', user.uid)),
      (snapshot) => {
        const reqs: HomeworkRequestData[] = [];
        snapshot.forEach((doc) => {
          reqs.push({ id: doc.id, ...doc.data() } as HomeworkRequestData);
        });
        setHomeworkRequests(reqs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      },
      (error) => console.error("Firestore requests error:", error)
    );

    const unsubscribeCompletions = onSnapshot(
      query(collection(db, 'completedHomework'), where('userId', '==', user.uid)),
      (snapshot) => {
        const completedIds = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.homeworkId) {
            completedIds.add(data.homeworkId);
          }
        });
        setCompletedHomeworkIds(completedIds);
      },
      (error) => console.error("Firestore completions error:", error)
    );

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Note: React StrictMode in dev might trigger this twice, 
      // but it's fine as the subsequent mount will set it true again.
      updateDoc(userDocRef, { isOnline: false }).catch(console.error);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribeSubjects();
      unsubscribeHomework();
      unsubscribeRequests();
      unsubscribeCompletions();
    };
  }, [user.uid]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      // We don't await updateDoc because if Firestore is offline or disabled, it will hang indefinitely
      updateDoc(userDocRef, { isOnline: false }).catch(console.error);
      
      await signOut(auth);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSuggestHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'homeworkRequests'), {
        title: suggestTitle,
        subjectId: suggestSubject,
        dueDate: suggestDueDate,
        userId: user.uid,
        username: user.email?.replace('@dashboard.com', '') || 'Unknown',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setSuggestTitle('');
      setSuggestSubject('');
      setSuggestDueDate('');
      setShowSuggestForm(false);
      alert('Homework suggestion submitted for approval!');
    } catch (err) {
      console.error(err);
      alert('Failed to submit suggestion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleHomeworkCompletion = async (homeworkId: string) => {
    const docId = `${user.uid}_${homeworkId}`;
    const docRef = doc(db, 'completedHomework', docId);
    
    try {
      if (completedHomeworkIds.has(homeworkId)) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, {
          userId: user.uid,
          homeworkId: homeworkId,
          completedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error toggling homework completion:", err);
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Unknown'];
  
  const groupedSubjects = subjectList.reduce((acc, subject) => {
    const day = subject.day || 'Unknown';
    if (!acc[day]) acc[day] = [];
    acc[day].push(subject);
    return acc;
  }, {} as Record<string, SubjectData[]>);

  // Sort subjects within each day by start time
  Object.keys(groupedSubjects).forEach(day => {
    groupedSubjects[day].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  });

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
    <div className="app-container" style={{ paddingBottom: '70px' }}>
      <header style={{ 
        padding: '1.5rem', 
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--bg-primary)',
        zIndex: 10
      }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => setShowSearch(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }} title="Search">
            <Search size={22} />
          </button>
          <button style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex'
          }}>
            <Bell size={22} />
          </button>
        </div>
      </header>

      <main className="main-content" style={{ padding: '1rem', width: '100%' }}>
        {activeTab === 'home' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem' }}>{t('home_welcome_back')}</h2>
              <p style={{ color: 'var(--text-secondary)' }}>{user.email?.replace('@dashboard.com', '')}</p>
            </div>
            
            {/* Today's Classes */}
            <Card>
              <h3 style={{ fontSize: '1.125rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} /> {t('home_todays_classes')} ({t(`day_${defaultDay}` as TranslationKey)})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(!groupedSubjects[defaultDay] || groupedSubjects[defaultDay].length === 0) ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '1rem 0' }}>{t('home_no_classes')}</p>
                ) : (
                  groupedSubjects[defaultDay].map((subject) => (
                    <div 
                      key={subject.id} 
                      onClick={() => { setSelectedSubject(subject); setActiveTab('subject-details'); }}
                      style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-color)', borderRadius: '0 var(--radius-md) var(--radius-md) 0', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{subject.name}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                          {subject.startTime} - {subject.endTime}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{subject.room}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Upcoming Homework */}
            <Card>
              <h3 style={{ fontSize: '1.125rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={20} /> {t('home_urgent_homework')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(() => {
                  const urgentHw = homeworkList.filter(hw => !completedHomeworkIds.has(hw.id)).slice(0, 3);
                  if (urgentHw.length === 0) {
                    return <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '1rem 0' }}>{t('home_all_caught_up')}</p>;
                  }
                  return urgentHw.map(hw => {
                    const subject = subjectList.find(s => s.id === hw.subjectId);
                    return (
                      <div key={hw.id} onClick={() => setSelectedHomework(hw)} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', transition: 'background-color 0.2s' }}>
                        <div style={{ marginTop: '0.1rem' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--text-secondary)' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{hw.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{subject ? subject.name : 'Unknown Subject'}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
                              <Calendar size={12} /> Deadline: {new Date(hw.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} /> {t('schedule_title')}
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

            {/* Selected Day Timeline */}
            <div style={{ position: 'relative', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <div style={{ 
                position: 'absolute', 
                left: '7px', top: '0', bottom: '0', 
                width: '2px', background: 'var(--border-color)', borderRadius: '2px'
              }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {(!groupedSubjects[selectedDay] || groupedSubjects[selectedDay].length === 0) ? (
                   <p style={{ color: 'var(--text-secondary)', paddingLeft: '1rem' }}>{t('schedule_no_classes_on')} {t(`day_${selectedDay}` as TranslationKey)}.</p>
                ) : (
                  groupedSubjects[selectedDay].map((subject) => (
                    <div key={subject.id} style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: '-1.5rem', top: '0.75rem', width: '10px', height: '10px',
                        borderRadius: '50%', background: 'var(--accent-color)', border: '2px solid var(--bg-primary)',
                        boxShadow: '0 0 0 2px var(--border-color)', zIndex: 1
                      }} />
                      
                      <div 
                        onClick={() => { setSelectedSubject(subject); setActiveTab('subject-details'); }}
                        style={{ 
                          padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.5rem' }}>{subject.name}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={14} color="var(--accent-color)" />
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{subject.startTime} - {subject.endTime}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <UserIcon size={14} /><span>{subject.teacher}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={14} /><span>{subject.room}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {homeworkRequests.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', margin: '0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} /> {t('schedule_your_suggestions')}
                </h3>
                {homeworkRequests.map(req => {
                  const subject = subjectList.find(s => s.id === req.subjectId);
                  return (
                    <div key={req.id} style={{ padding: '1rem', background: 'var(--bg-primary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.title}</div>
                        <div style={{ 
                          fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-xl)',
                          background: req.status === 'pending' ? '#f59e0b20' : req.status === 'approved' ? '#10b98120' : '#ef444420',
                          color: req.status === 'pending' ? '#f59e0b' : req.status === 'approved' ? '#10b981' : '#ef4444',
                          textTransform: 'capitalize'
                        }}>
                          {req.status}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {subject ? subject.name : 'Unknown'} &bull; Due: {new Date(req.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
                )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={20} /> {t('workload_title')}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <Card style={{ padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>{t('workload_total_assignments')}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalHomework}</div>
              </Card>
              <Card style={{ padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>{t('workload_due_this_week')}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-color)' }}>{hwDueThisWeek}</div>
              </Card>
            </div>

            <Card style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} /> {t('workload_homework_by_subject')}
              </h3>

              {subjectHwCounts.every(s => s.count === 0) ? (
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  {t('workload_no_homework')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                  {subjectHwCounts.map((subject) => {
                    const maxCount = Math.max(...subjectHwCounts.map(s => s.count));
                    const percentage = maxCount === 0 ? 0 : (subject.count / maxCount) * 100;
                    return (
                      <div key={subject.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{subject.name}</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{subject.count} {t('workload_assignments')}</span>
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

            {mostActiveSubject && (
              <Card style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={20} color="var(--accent-color)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{t('workload_heaviest_workload')}</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mostActiveSubject.name} ({mostActiveSubject.count} {t('workload_assignments')})</div>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={22} color="var(--accent-color)" /> {t('friends_title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
              {userList.filter(u => u.isOnline).length} {t('friends_online')} &bull; {userList.length} {t('friends_total')}
            </p>
            {userList.length === 0 ? (
              <Card style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-secondary)' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('friends_no_students')}</p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {userList.map(u => {
                  const name = u.displayName || u.username || u.id;
                  const hasDisplayName = !!u.displayName && u.displayName !== u.username;
                  return (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-primary)', border: '2px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <UserCircle size={28} color="var(--text-secondary)" />
                          )}
                        </div>
                        <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px', borderRadius: '50%', background: u.isOnline ? '#10b981' : '#6b7280', border: '2px solid var(--bg-secondary)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {name}
                          {hasDisplayName && u.username && (
                            <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                              @{u.username}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: u.isOnline ? '#10b981' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.isOnline ? '#10b981' : '#6b7280' }} />
                          {u.isOnline ? t('friends_status_online') : t('friends_status_offline')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', paddingTop: '2rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            {profileLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                 <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%' }} />
                 <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading profile...</div>
              </div>
            ) : (
              <>
            {/* Header: Avatar, Name, Email */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', marginBottom: '1rem' }}>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
                  style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative', boxShadow: 'var(--shadow-sm)' }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserCircle size={48} color="var(--text-secondary)" />
                  )}
                  {isUploadingAvatar && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '24px', height: '24px', border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
                  style={{ position: 'absolute', bottom: '2px', right: '2px', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-color)', border: '2px solid var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Change photo"
                >
                  <Camera size={14} color="#fff" />
                </button>
              </div>

              {avatarUrl && (
                <button onClick={handleDeleteAvatar} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, marginTop: '-0.5rem' }}>
                  <Trash2 size={13} /> {t('profile_remove_photo')}
                </button>
              )}

              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem 0', fontWeight: 600 }}>{displayName}</h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>{user.email} &bull; {t('profile_student_account')}</p>
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Account Settings Section */}
              <div>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', marginLeft: '0.5rem', fontWeight: 600 }}>{t('profile_section_account')}</h3>
                <Card style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                  
                  {/* Display Name Item */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Edit2 size={16} color="var(--accent-color)" />
                    </div>
                    {!editingDisplayName ? (
                      <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{t('profile_display_name')}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                        </div>
                        <button onClick={() => { setEditingDisplayName(true); setDisplayNameInput(displayName); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}>
                          <Edit2 size={16} />
                        </button>
                      </>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          autoFocus
                          value={displayNameInput}
                          onChange={e => setDisplayNameInput(e.target.value)}
                          className="input-field"
                          placeholder={t('profile_enter_name')}
                          maxLength={30}
                          style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button disabled={savingDisplayName || !displayNameInput.trim()} onClick={async () => {
                            if (!displayNameInput.trim()) return;
                            setSavingDisplayName(true);
                            try {
                              await setDoc(doc(db, 'users', user.uid), { displayName: displayNameInput.trim() }, { merge: true });
                              setEditingDisplayName(false);
                            } catch (err: any) { alert(`Failed to save: ${err.message}`); }
                            finally { setSavingDisplayName(false); }
                          }} className="btn btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}>
                            {savingDisplayName ? '...' : <><Check size={14} /> {t('profile_save')}</>}
                          </button>
                          <button onClick={() => setEditingDisplayName(false)} style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>{t('profile_cancel')}</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Language Item */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Globe size={16} color="var(--accent-color)" />
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t('profile_language')}</span>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'en' | 'th' | 'zh')}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer', fontSize: '0.875rem', textAlign: 'right', direction: 'rtl' }}
                    >
                      <option value="th">ไทย</option>
                      <option value="zh">中文</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </Card>
              </div>

              {/* Security Section */}
              <div>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', marginLeft: '0.5rem', fontWeight: 600 }}>{t('profile_section_security')}</h3>
                {!showChangePassword ? (
                  <Card style={{ width: '100%', padding: '1rem', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => setShowChangePassword(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={16} color="var(--accent-color)" />
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t('profile_change_password')}</span>
                    </div>
                    <ArrowLeft size={16} color="var(--text-secondary)" style={{ transform: 'rotate(180deg)' }} />
                  </Card>
                ) : (
                  <Card style={{ width: '100%', padding: '1rem', background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <button onClick={() => { setShowChangePassword(false); setPwMessage(null); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        <ArrowLeft size={18} />
                      </button>
                      <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Lock size={14} color="var(--accent-color)" /> {t('profile_change_password')}
                      </h3>
                    </div>

                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.7rem' }}>{t('profile_old_password')}</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showOldPw ? 'text' : 'password'} required value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="input-field" placeholder="Enter old password" style={{ padding: '0.5rem', paddingRight: '2.5rem', fontSize: '0.875rem' }} />
                          <button type="button" onClick={() => setShowOldPw(p => !p)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            {showOldPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.7rem' }}>{t('profile_new_password')}</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showNewPw ? 'text' : 'password'} required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" placeholder="At least 6 characters" style={{ padding: '0.5rem', paddingRight: '2.5rem', fontSize: '0.875rem' }} />
                          <button type="button" onClick={() => setShowNewPw(p => !p)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.7rem' }}>{t('profile_confirm_password')}</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showConfirmPw ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field" placeholder="Repeat new password" style={{ padding: '0.5rem', paddingRight: '2.5rem', fontSize: '0.875rem' }} />
                          <button type="button" onClick={() => setShowConfirmPw(p => !p)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {pwMessage && (
                        <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: pwMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${pwMessage.type === 'success' ? '#10b981' : '#ef4444'}`, color: pwMessage.type === 'success' ? '#10b981' : '#ef4444', fontSize: '0.75rem' }}>
                          {pwMessage.text}
                        </div>
                      )}

                      <Button type="submit" variant="primary" isLoading={pwLoading} style={{ marginTop: '0.25rem', padding: '0.5rem', fontSize: '0.875rem', justifyContent: 'center' }}>
                        {t('profile_save')}
                      </Button>
                    </form>
                  </Card>
                )}
              </div>
            </div>

            <Button variant="secondary" onClick={handleSignOut} isLoading={loading} style={{ width: '100%' }}>
              <LogOut size={16} /> {t('profile_sign_out')}
            </Button>
              </>
            )}
          </div>
        )}

        {activeTab === 'subject-details' && selectedSubject && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <button 
              onClick={() => setActiveTab('schedule')} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, fontWeight: 500, alignSelf: 'flex-start' }}
            >
              <ArrowLeft size={18} /> Back
            </button>

            <Card style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-color)' }}>
              <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>{selectedSubject.name}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <UserIcon size={16} color="var(--text-primary)" />
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teacher</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSubject.teacher}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <MapPin size={16} color="var(--text-primary)" />
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Room</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSubject.room}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', gridColumn: '1 / -1' }}>
                  <Clock size={16} color="var(--text-primary)" />
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSubject.day}s, {selectedSubject.startTime} - {selectedSubject.endTime}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <Button variant="secondary" onClick={(e) => {
                  e.stopPropagation(); 
                  setSuggestSubject(selectedSubject.id);
                  setShowSuggestForm(true);
                }} style={{ width: '100%', padding: '0.4rem', fontSize: '0.875rem' }}>
                  <PlusCircle size={14} style={{ marginRight: '0.25rem' }} /> {t('suggest_homework')}
                </Button>
              </div>
            </Card>

            <div>
              <h3 style={{ fontSize: '1.125rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={20} /> {t('subject_homework')}
              </h3>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '0.5rem' }}>
                {(['new', 'urgent', 'overdue', 'completed'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSubjectHwTab(tab)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: 'var(--radius-xl)',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      background: subjectHwTab === tab ? 'var(--accent-color)' : 'var(--bg-secondary)',
                      color: subjectHwTab === tab ? 'var(--accent-text)' : 'var(--text-secondary)',
                      boxShadow: subjectHwTab === tab ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    {t(`hw_tab_${tab}` as TranslationKey)}
                  </button>
                ))}
              </div>

              {(() => {
                const subjectHomework = homeworkList.filter(hw => hw.subjectId === selectedSubject.id);
                
                const now = new Date();
                now.setHours(0, 0, 0, 0); // Start of today
                const threeDaysFromNow = new Date(now);
                threeDaysFromNow.setDate(now.getDate() + 3);

                const filteredHw = subjectHomework.filter(hw => {
                  const isCompleted = completedHomeworkIds.has(hw.id);
                  if (subjectHwTab === 'completed') return isCompleted;
                  if (isCompleted) return false;

                  const dueDate = new Date(hw.dueDate);
                  dueDate.setHours(0, 0, 0, 0);

                  if (subjectHwTab === 'overdue') return dueDate < now;
                  if (subjectHwTab === 'urgent') return dueDate >= now && dueDate <= threeDaysFromNow;
                  if (subjectHwTab === 'new') return dueDate > threeDaysFromNow;
                  
                  return true;
                });

                if (filteredHw.length === 0) {
                  return (
                    <Card style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-secondary)' }}>
                      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('hw_no_homework_in_tab')}</p>
                    </Card>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredHw.map(hw => {
                      const isCompleted = completedHomeworkIds.has(hw.id);
                      return (
                        <div key={hw.id} onClick={() => setSelectedHomework(hw)} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                          <div style={{ marginTop: '0.1rem', color: isCompleted ? '#10b981' : 'var(--text-secondary)' }}>
                            {isCompleted ? <CheckCircle2 size={20} /> : <div style={{ width: '18px', height: '18px', margin: '1px', borderRadius: '50%', border: '2px solid var(--text-secondary)' }} />}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none', fontWeight: 600, fontSize: '1rem' }}>{hw.title}</span> 
                            <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', padding: '0.2rem 0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              <Calendar size={12} style={{marginRight: '0.2rem'}} /> Deadline: {new Date(hw.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* Suggest Homework Modal overlaying everything */}
      {showSuggestForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="animate-fade-in">
          <Card style={{ padding: '1.5rem', width: '100%', maxWidth: '400px', margin: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--accent-color)' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={20} /> {t('suggest_homework')}
            </h3>
            <form onSubmit={handleSuggestHomework} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input label={t('form_title_label')} value={suggestTitle} onChange={e => setSuggestTitle(e.target.value)} required placeholder={t('form_title_placeholder')} />
              <div className="input-group">
                <label className="input-label">{t('form_subject_label')}</label>
                <select
                  required
                  value={suggestSubject}
                  onChange={e => setSuggestSubject(e.target.value)}
                  className="input-field"
                  style={{ appearance: 'none' }}
                >
                  <option value="" disabled>{t('form_select_subject')}</option>
                  {subjectList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <Input type="date" label={t('form_due_date_label')} value={suggestDueDate} onChange={e => setSuggestDueDate(e.target.value)} required />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Button type="submit" isLoading={isSubmitting} style={{ flex: 1 }}>{t('form_submit')}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowSuggestForm(false)}>{t('form_cancel')}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

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
                {/* Stats */}
                <Card style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={18} color="var(--accent-color)" /> Quick Stats
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{homeworkList.length}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{completedHomeworkIds.size}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Completed</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-color)' }}>{Math.max(0, homeworkList.length - completedHomeworkIds.size)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending</div>
                    </div>
                  </div>
                </Card>

                {/* To-Do List (Pending Homework) */}
                <div>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={18} color="var(--accent-color)" /> Pending To-Do
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(() => {
                      const pendingHw = homeworkList.filter(hw => !completedHomeworkIds.has(hw.id)).slice(0, 5);
                      if (pendingHw.length === 0) {
                        return <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '1rem 0' }}>All caught up! ✨</p>;
                      }
                      return pendingHw.map(hw => {
                        const subject = subjectList.find(s => s.id === hw.subjectId);
                        return (
                          <div key={hw.id} onClick={() => setSelectedHomework(hw)} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', transition: 'background-color 0.2s' }}>
                            <div style={{ marginTop: '0.1rem' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--text-secondary)' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{hw.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{subject ? subject.name : 'Unknown Subject'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  <Calendar size={12} /> Due: {new Date(hw.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
                {(() => {
                  const q = searchQuery.toLowerCase();
                  const subjects = subjectList.filter(s => s.name.toLowerCase().includes(q) || s.teacher.toLowerCase().includes(q) || s.room.toLowerCase().includes(q));
                  const homework = homeworkList.filter(h => h.title.toLowerCase().includes(q));
                  
                  if (subjects.length === 0 && homework.length === 0) {
                    return <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>No results found for "{searchQuery}"</div>;
                  }

                  const handleSubjectClick = (subject: SubjectData) => {
                    setSelectedSubject(subject);
                    setActiveTab('subject-details');
                    setShowSearch(false);
                    setSearchQuery('');
                  };

                  return (
                    <>
                      {subjects.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subjects</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {subjects.map(s => (
                              <div key={s.id} onClick={() => handleSubjectClick(s)} style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                                  if(parentSubject) {
                                    handleSubjectClick(parentSubject);
                                    setSelectedHomework(h);
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

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.75rem 0.5rem',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
        zIndex: 100,
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <button onClick={() => setActiveTab('home')} style={navBtnStyle(activeTab === 'home')}>
          <Home size={20} />
          <span>{t('nav_home')}</span>
        </button>
        <button onClick={() => setActiveTab('schedule')} style={navBtnStyle(activeTab === 'schedule')}>
          <Calendar size={20} />
          <span>{t('nav_schedule')}</span>
        </button>
        <button onClick={() => setActiveTab('friends')} style={navBtnStyle(activeTab === 'friends')}>
          <Users size={20} />
          <span>{t('nav_friends')}</span>
        </button>
        <button onClick={() => setActiveTab('analytics')} style={navBtnStyle(activeTab === 'analytics')}>
          <BarChart2 size={20} />
          <span>{t('nav_stats')}</span>
        </button>
        <button onClick={() => setActiveTab('profile')} style={navBtnStyle(activeTab === 'profile')}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="me" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: activeTab === 'profile' ? '2px solid var(--accent-color)' : '2px solid var(--border-color)' }} />
          ) : (
            <UserCircle size={20} />
          )}
          <span>{t('nav_profile')}</span>
        </button>
      </nav>
      {/* Homework Detail Modal */}
      {selectedHomework && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="animate-fade-in" onClick={() => setSelectedHomework(null)}>
          <Card style={{ padding: '2rem', width: '90%', maxWidth: '400px', margin: '1rem', background: 'var(--bg-primary)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedHomework(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', paddingRight: '2rem' }}>{selectedHomework.title}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                <BookOpen size={18} />
                <span style={{ fontWeight: 500 }}>{subjectList.find(s => s.id === selectedHomework.subjectId)?.name || 'Unknown Subject'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                <Calendar size={18} />
                <span>Due: {new Date(selectedHomework.dueDate).toLocaleDateString()}</span>
              </div>
            </div>

            <Button 
              onClick={() => toggleHomeworkCompletion(selectedHomework.id)} 
              variant={completedHomeworkIds.has(selectedHomework.id) ? 'secondary' : 'primary'}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', background: completedHomeworkIds.has(selectedHomework.id) ? 'var(--bg-secondary)' : '#10b981', color: completedHomeworkIds.has(selectedHomework.id) ? 'var(--text-primary)' : 'white', border: completedHomeworkIds.has(selectedHomework.id) ? '1px solid var(--border-color)' : 'none' }}
            >
              {completedHomeworkIds.has(selectedHomework.id) ? (
                <>
                  <CheckCircle2 size={18} color="#10b981" />
                  Completed (Click to undo)
                </>
              ) : (
                <>
                  <CheckSquare size={18} />
                  Mark as Done
                </>
              )}
            </Button>
          </Card>
        </div>
      )}

    </div>
  );
}

const navBtnStyle = (isActive: boolean): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.25rem',
  color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: isActive ? 600 : 500,
  transition: 'color 0.2s',
  flex: 1
});
