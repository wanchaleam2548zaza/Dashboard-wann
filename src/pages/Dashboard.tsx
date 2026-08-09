import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { signOut, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { doc, updateDoc, setDoc, collection, onSnapshot, addDoc, query, where, deleteDoc, increment } from 'firebase/firestore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LogOut, Bell, BookOpen, CheckSquare, Clock, MapPin, User as UserIcon, Home, Calendar, UserCircle, PlusCircle, BarChart2, Search, X, CheckCircle2, ArrowLeft, Camera, Trash2, Lock, Eye, EyeOff, Edit2, Check, Globe, MessageSquare, Send, CornerUpLeft, Menu, Share2 } from 'lucide-react';
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

export interface MessageData {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isEdited?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
}

export function Dashboard({ user }: DashboardProps) {
  const { t, language, setLanguage } = useLanguage();
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    return (localStorage.getItem('dashboard_theme') as any) || 'system';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('dashboard_theme', theme);
  }, [theme]);

  const [loading, setLoading] = useState(false);
  const [subjectList, setSubjectList] = useState<SubjectData[]>([]);
  const [homeworkList, setHomeworkList] = useState<HomeworkData[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'analytics' | 'friends' | 'profile' | 'subject-details' | 'chat'>('home');
  
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
  const [homeHwTab, setHomeHwTab] = useState<'new' | 'pending' | 'urgent' | 'completed'>('pending');

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

  const [canAddHomework, setCanAddHomework] = useState(false);

  // Chat State
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<MessageData[]>([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageData | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageData | null>(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    isFirstLoad.current = true;
    if (activeTab === 'chat' && activeChatId) {
      const q = query(collection(db, 'messages'), where('chatId', '==', activeChatId));
      const unsub = onSnapshot(q, (snap) => {
        const msgs: MessageData[] = [];
        
        if (!isFirstLoad.current) {
          snap.docChanges().forEach(change => {
            if (change.type === 'added') {
              const data = change.doc.data() as MessageData;
              if (data.senderId !== user.uid && Notification.permission === 'granted') {
                new Notification(`New message from ${data.senderName}`, { body: data.text });
              }
            }
          });
        }
        
        snap.forEach(d => msgs.push({ id: d.id, ...d.data() } as MessageData));
        msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setChatMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        isFirstLoad.current = false;
      });
      return () => unsub();
    }
  }, [activeTab, activeChatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatId) return;
    const msgText = chatInput.trim();
    setChatInput('');
    try {
      if (editingMessage) {
        await updateDoc(doc(db, 'messages', editingMessage.id), {
          text: msgText,
          isEdited: true
        });
        setEditingMessage(null);
      } else {
        const payload: any = {
          chatId: activeChatId,
          senderId: user.uid,
          senderName: displayName || user.email?.split('@')[0] || 'Unknown',
          text: msgText,
          createdAt: new Date().toISOString()
        };
        if (replyingTo) {
          payload.replyTo = {
            id: replyingTo.id,
            text: replyingTo.text,
            senderName: replyingTo.senderName
          };
        }
        await addDoc(collection(db, 'messages'), payload);
        
        if (activeChatId !== 'global') {
          const recipientId = activeChatId.replace(user.uid, '').replace('_', '');
          if (recipientId) {
            setDoc(doc(db, `users/${recipientId}/chats`, activeChatId), {
              unreadCount: increment(1),
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(console.error);
          }
        }

        setReplyingTo(null);
      }
    } catch (err) {
      console.error("Error sending message", err);
      alert("Failed to send message");
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (confirm(t('chat_delete' as TranslationKey) + '?')) {
      try {
        await deleteDoc(doc(db, 'messages', id));
        setActiveMessageId(null);
      } catch (err) {
        console.error("Error deleting message", err);
      }
    }
  };

  const startPrivateChat = (friendId: string) => {
    const chatId = [user.uid, friendId].sort().join('_');
    setActiveChatId(chatId);
    setActiveTab('chat');
  };

  // Friends / User List State
  interface UserListItem {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    isOnline?: boolean;
  }
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

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
        setCanAddHomework(!!data.canAddHomework);
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

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, `users/${user.uid}/chats`), (snap) => {
      const counts: Record<string, number> = {};
      snap.forEach(d => {
        counts[d.id] = d.data().unreadCount || 0;
      });
      setUnreadCounts(counts);
    });
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    if (activeChatId && activeChatId !== 'global' && user) {
      setDoc(doc(db, `users/${user.uid}/chats`, activeChatId), { unreadCount: 0 }, { merge: true }).catch(console.error);
    }
  }, [activeChatId, user.uid]);

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
      if (canAddHomework) {
        await addDoc(collection(db, 'homework'), {
          title: suggestTitle,
          subjectId: suggestSubject,
          dueDate: suggestDueDate,
          createdAt: new Date().toISOString()
        });
        alert('Homework added successfully!');
      } else {
        await addDoc(collection(db, 'homeworkRequests'), {
          title: suggestTitle,
          subjectId: suggestSubject,
          dueDate: suggestDueDate,
          userId: user.uid,
          username: user.email?.replace('@dashboard.com', '') || 'Unknown',
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        alert('Homework suggestion submitted for approval!');
      }
      setSuggestTitle('');
      setSuggestSubject('');
      setSuggestDueDate('');
      setShowSuggestForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to submit.');
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
  const pendingHomeworkList = homeworkList.filter(hw => !completedHomeworkIds.has(hw.id));
  const totalHomework = pendingHomeworkList.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const hwDueThisWeek = pendingHomeworkList.filter(hw => {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }} title="Menu">
            <Menu size={24} />
          </button>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Dashboard</h1>
        </div>
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
            
            {/* Today's Classes - Flat List */}
            <div>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', marginLeft: '0.75rem', fontWeight: 600 }}>
                {t('home_todays_classes')} ({t(`day_${defaultDay}` as TranslationKey)})
              </h3>
              
              <div style={{ 
                  display: 'flex', flexDirection: 'column', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
              }}>
                {(!groupedSubjects[defaultDay] || groupedSubjects[defaultDay].length === 0) ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem', margin: 0 }}>{t('home_no_classes')}</p>
                ) : (
                  groupedSubjects[defaultDay].map((subject, idx) => (
                    <div 
                      key={subject.id} 
                      onClick={() => { setSelectedSubject(subject); setActiveTab('subject-details'); }}
                      style={{ 
                        padding: '0.875rem 1rem', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        borderBottom: idx === groupedSubjects[defaultDay].length - 1 ? 'none' : '1px solid var(--border-color)',
                        transition: 'background-color 0.2s' 
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{subject.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{subject.room}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {subject.startTime}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                          - {subject.endTime}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Homework List - Flat */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem', marginLeft: '0.75rem' }}>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontWeight: 600 }}>
                  {t('home_homework')}
                </h3>
              </div>

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

              <div style={{ 
                  display: 'flex', flexDirection: 'column', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
              }}>
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

                  if (filteredHw.length === 0) {
                    return <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem', margin: 0 }}>{t('hw_no_homework_in_tab')}</p>;
                  }
                  
                  return filteredHw.map((hw, idx) => {
                    const subject = subjectList.find(s => s.id === hw.subjectId);
                    const isCompleted = completedHomeworkIds.has(hw.id);
                    return (
                      <div 
                        key={hw.id} 
                        onClick={() => setSelectedHomework(hw)} 
                        style={{ 
                          padding: '0.875rem 1rem', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '1rem', 
                          transition: 'background-color 0.2s',
                          borderBottom: idx === filteredHw.length - 1 ? 'none' : '1px solid var(--border-color)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ color: isCompleted ? '#34c759' : 'var(--text-secondary)', flexShrink: 0 }}>
                           {isCompleted ? <CheckCircle2 size={24} /> : <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid var(--text-secondary)' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: '0.15rem', color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none', fontSize: '0.95rem' }}>{hw.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{subject ? subject.name : 'Unknown Subject'}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500, color: isCompleted ? 'var(--text-secondary)' : '#ff3b30' }}>
                              <Calendar size={12} /> {new Date(hw.dueDate).toLocaleDateString()}
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

            {/* Selected Day Timeline - Flat */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ 
                display: 'flex', flexDirection: 'column', 
                background: 'var(--bg-secondary)', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                {(!groupedSubjects[selectedDay] || groupedSubjects[selectedDay].length === 0) ? (
                   <p style={{ color: 'var(--text-secondary)', padding: '1.5rem', textAlign: 'center', margin: 0 }}>{t('schedule_no_classes_on')} {t(`day_${selectedDay}` as TranslationKey)}.</p>
                ) : (
                  groupedSubjects[selectedDay].map((subject, idx) => (
                    <div 
                      key={subject.id} 
                      onClick={() => { setSelectedSubject(subject); setActiveTab('subject-details'); }}
                      style={{ 
                        padding: '1rem', background: 'var(--bg-secondary)', 
                        borderBottom: idx === groupedSubjects[selectedDay].length - 1 ? 'none' : '1px solid var(--border-color)', 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.2rem' }}>{subject.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><UserIcon size={12} /> {subject.teacher}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12} /> {subject.room}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {subject.startTime}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                          - {subject.endTime}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>


          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={20} /> {t('workload_title')}
            </h2>

            {/* Top Stats */}
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: '1.25rem', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('workload_total_assignments')}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalHomework}</div>
              </div>
              <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('workload_due_this_week')}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-color)' }}>{hwDueThisWeek}</div>
              </div>
            </div>

            {/* Heaviest Workload */}
            {mostActiveSubject && (
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bell size={20} color="var(--accent-color)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.15rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('workload_heaviest_workload')}</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mostActiveSubject.name} ({mostActiveSubject.count} {t('workload_assignments')})</div>
                </div>
              </div>
            )}

            {/* Homework by Subject */}
            <div>
              <h3 style={{ fontSize: '1.125rem', margin: '0.5rem 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <BookOpen size={20} color="var(--text-primary)" /> {t('workload_homework_by_subject')}
              </h3>
              
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border-color)' }}>
                {subjectHwCounts.every(s => s.count === 0) ? (
                  <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t('workload_no_homework')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {subjectHwCounts.map((subject) => {
                      const maxCount = Math.max(...subjectHwCounts.map(s => s.count));
                      const percentage = maxCount === 0 ? 0 : (subject.count / maxCount) * 100;
                      return (
                        <div key={subject.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{subject.name}</span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{subject.count} {t('workload_assignments')}</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
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
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 190px)', position: 'relative' }}>
            {!activeChatId ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: '0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  {t('chat_title' as TranslationKey)}
                </h2>

                {/* Active Now (Horizontal Scroll) */}
                <div style={{ padding: '0.5rem 0' }}>
                  <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0.5rem', fontWeight: 600 }}>{t('chat_active_now' as TranslationKey)}</h3>
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0.5rem', margin: '0 -0.5rem', scrollbarWidth: 'none' }}>
                    {userList.filter(u => u.isOnline).map(u => (
                      <div key={u.id} onClick={() => startPrivateChat(u.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', flexShrink: 0 }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid var(--accent-color)', overflow: 'hidden', padding: '2px' }}>
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                              {u.avatarUrl ? <img src={u.avatarUrl} alt={u.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserCircle size={32} color="var(--text-secondary)" />}
                            </div>
                          </div>
                          <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#34c759', border: '3px solid var(--bg-primary)' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.displayName || u.username || u.id}
                        </span>
                      </div>
                    ))}
                    {userList.filter(u => u.isOnline).length === 0 && (
                       <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '1rem 0' }}>No friends active right now.</div>
                    )}
                  </div>
                </div>

                {/* Combined Chat List (Global + Friends) */}
                <div style={{ flex: 1, padding: '0.5rem 0' }}>
                  <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0.5rem', fontWeight: 600 }}>{t('chat_messages' as TranslationKey)}</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    
                    {/* Global Room */}
                    <div 
                      onClick={() => setActiveChatId('global')}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '1rem', 
                        padding: '1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Globe size={24} color="#fff" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>{t('chat_global_room' as TranslationKey)}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Chat with everyone</div>
                      </div>
                    </div>

                    {/* Friends Chats */}
                    {userList.map((u, idx) => {
                      const name = u.displayName || u.username || u.id;
                      const chatId = [user.uid, u.id].sort().join('_');
                      const unread = unreadCounts[chatId] || 0;
                      return (
                        <div 
                          key={u.id} 
                          onClick={() => startPrivateChat(u.id)} 
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '1rem', 
                            padding: '1rem', cursor: 'pointer',
                            borderBottom: idx === userList.length - 1 ? 'none' : '1px solid var(--border-color)',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {u.avatarUrl ? <img src={u.avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserCircle size={28} color="var(--text-secondary)" />}
                            </div>
                            {u.isOnline && <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#34c759', border: '2px solid var(--bg-secondary)' }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                              {unread > 0 && (
                                <div style={{ background: 'var(--accent-color)', color: 'var(--accent-text)', fontSize: '0.75rem', fontWeight: 600, minWidth: '20px', height: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.4rem', flexShrink: 0 }}>
                                  {unread > 99 ? '99+' : unread}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {u.isOnline ? t('friends_status_online' as TranslationKey) : t('friends_status_offline' as TranslationKey)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <button onClick={() => setActiveChatId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={20} />
                  </button>
                  <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                    {activeChatId === 'global' ? t('chat_global_room' as TranslationKey) : (
                      <>{t('chat_private_with' as TranslationKey)} {
                        (() => {
                          const u = userList.find(u => [user.uid, u.id].sort().join('_') === activeChatId);
                          return u ? (u.displayName || u.username || u.id) : 'Unknown';
                        })()
                      }</>
                    )}
                  </div>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '1rem 0', scrollbarWidth: 'none' }}>
                  {chatMessages.length === 0 ? (
                    <div style={{ margin: 'auto', color: 'var(--text-secondary)' }}>{t('chat_no_messages' as TranslationKey)}</div>
                  ) : (
                    chatMessages.map((msg, idx) => {
                      const isMe = msg.senderId === user.uid;
                      const isActive = activeMessageId === msg.id;
                      const prevMsg = idx > 0 ? chatMessages[idx - 1] : null;
                      const nextMsg = idx < chatMessages.length - 1 ? chatMessages[idx + 1] : null;
                      const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
                      const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

                      return (
                        <div key={msg.id} style={{ 
                          alignSelf: isMe ? 'flex-end' : 'flex-start', 
                          maxWidth: '75%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          marginTop: isFirstInGroup && idx > 0 ? '0.5rem' : '0'
                        }}>
                          {!isMe && isFirstInGroup && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', marginLeft: '0.75rem' }}>{msg.senderName}</div>}
                          
                          <div 
                            onClick={() => setActiveMessageId(isActive ? null : msg.id)}
                            style={{ 
                              background: isMe ? 'var(--accent-color)' : 'var(--bg-secondary)', 
                              color: isMe ? 'var(--accent-text)' : 'var(--text-primary)', 
                              padding: '0.5rem 0.875rem', 
                              borderTopLeftRadius: !isMe && !isFirstInGroup ? '0.25rem' : '1.25rem',
                              borderBottomLeftRadius: !isMe && !isLastInGroup ? '0.25rem' : '1.25rem',
                              borderTopRightRadius: isMe && !isFirstInGroup ? '0.25rem' : '1.25rem',
                              borderBottomRightRadius: isMe && !isLastInGroup ? '0.25rem' : '1.25rem',
                              border: isMe ? 'none' : '1px solid var(--border-color)',
                              wordBreak: 'break-word',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.25rem',
                              fontSize: '0.95rem',
                              lineHeight: '1.4'
                            }}
                          >
                            {msg.replyTo && (
                              <div style={{
                                padding: '0.4rem 0.5rem',
                                background: isMe ? 'color-mix(in srgb, var(--accent-text) 15%, transparent)' : 'color-mix(in srgb, var(--text-primary) 5%, transparent)',
                                borderRadius: '0.5rem',
                                borderLeft: `3px solid ${isMe ? 'var(--accent-text)' : 'var(--border-color)'}`,
                                fontSize: '0.75rem',
                                marginBottom: '0.25rem',
                                color: isMe ? 'var(--accent-text)' : 'var(--text-primary)'
                              }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.125rem', opacity: 0.9 }}>{msg.replyTo.senderName}</div>
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.8 }}>{msg.replyTo.text}</div>
                              </div>
                            )}
                            <div>
                              {msg.text.startsWith('[HW_SHARE:') ? (() => {
                                const hwId = msg.text.replace('[HW_SHARE:', '').replace(']', '').trim();
                                const hw = homeworkList.find((h: any) => h.id === hwId);
                                if (!hw) return <div style={{ fontStyle: 'italic', opacity: 0.8 }}>Shared homework not found.</div>;
                                const subject = subjectList.find(s => s.id === hw.subjectId);
                                return (
                                  <div onClick={() => setSelectedHomework(hw)} style={{ cursor: 'pointer', background: isMe ? 'rgba(255,255,255,0.1)' : 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '0.75rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isMe ? 'var(--accent-text)' : 'var(--text-secondary)' }}>
                                      <BookOpen size={16} />
                                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{subject?.name || t('form_select_subject' as TranslationKey)}</span>
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isMe ? 'var(--accent-text)' : 'var(--text-primary)' }}>{hw.title}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.8, color: isMe ? 'var(--accent-text)' : 'var(--text-secondary)' }}>Due: {new Date(hw.dueDate).toLocaleDateString()}</div>
                                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: isMe ? 'var(--accent-text)' : 'var(--accent-color)', fontWeight: 600, textDecoration: 'underline' }}>Tap to view details</div>
                                  </div>
                                );
                              })() : msg.text}
                              {msg.isEdited && <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '0.5rem' }}>({t('chat_edited_mark' as TranslationKey)})</span>}
                            </div>
                          </div>
                          
                          {isActive && (
                            <div className="animate-fade-in" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignSelf: isMe ? 'flex-end' : 'flex-start', padding: '0.4rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', boxShadow: 'var(--shadow-md)', zIndex: 10 }}>
                              <button onClick={() => { setReplyingTo(msg); setActiveMessageId(null); setEditingMessage(null); document.getElementById('chat-input')?.focus(); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0 0.25rem', fontWeight: 500 }}>
                                <CornerUpLeft size={14} color="var(--text-secondary)" /> {t('chat_reply' as TranslationKey)}
                              </button>
                              {isMe && (
                                <>
                                  <div style={{ width: '1px', background: 'var(--border-color)' }} />
                                  <button onClick={() => { setEditingMessage(msg); setChatInput(msg.text); setActiveMessageId(null); setReplyingTo(null); document.getElementById('chat-input')?.focus(); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0 0.25rem', fontWeight: 500 }}>
                                    <Edit2 size={14} color="var(--text-secondary)" /> {t('chat_edit' as TranslationKey)}
                                  </button>
                                  <div style={{ width: '1px', background: 'var(--border-color)' }} />
                                  <button onClick={() => { handleDeleteMessage(msg.id); setActiveMessageId(null); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0 0.25rem', fontWeight: 500 }}>
                                    <Trash2 size={14} /> {t('chat_delete' as TranslationKey)}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div style={{ position: 'relative', marginTop: 'auto', background: 'var(--bg-primary)', paddingTop: '0.5rem' }}>
                  {(replyingTo || editingMessage) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '1rem', borderLeft: '4px solid var(--accent-color)', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.875rem', overflow: 'hidden' }}>
                        {replyingTo ? (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{t('chat_replying_to' as TranslationKey)} {replyingTo.senderName}</div>
                            <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyingTo.text}</div>
                          </>
                        ) : editingMessage ? (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('chat_editing' as TranslationKey)}</div>
                            <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{editingMessage.text}</div>
                          </>
                        ) : null}
                      </div>
                      <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setChatInput(''); }} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', borderRadius: '50%', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.35rem 0.35rem 0.35rem 1rem', borderRadius: '100px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                    <input
                      id="chat-input"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder={t('chat_type_message' as TranslationKey)}
                      style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
                    />
                    <button type="submit" disabled={!chatInput.trim()} style={{ background: chatInput.trim() ? 'var(--accent-color)' : 'var(--border-color)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: chatInput.trim() ? 'var(--accent-text)' : 'var(--text-secondary)', cursor: chatInput.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                      <Send size={16} style={{ marginLeft: chatInput.trim() ? '-0.1rem' : '0' }} />
                    </button>
                  </form>
                </div>
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
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', marginLeft: '0.75rem', fontWeight: 600 }}>{t('profile_section_account')}</h3>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                  
                  {/* Display Name Item */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Edit2 size={16} color="var(--accent-color)" />
                    </div>
                    {!editingDisplayName ? (
                      <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}>{t('profile_display_name')}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                        </div>
                        <button onClick={() => { setEditingDisplayName(true); setDisplayNameInput(displayName); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-color)', padding: '0.25rem' }}>
                          <Edit2 size={18} />
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
                          style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
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
                          }} className="btn btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', borderRadius: '8px' }}>
                            {savingDisplayName ? '...' : <><Check size={14} /> {t('profile_save')}</>}
                          </button>
                          <button onClick={() => setEditingDisplayName(false)} style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>{t('profile_cancel')}</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Language Item */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Globe size={16} color="var(--accent-color)" />
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{t('profile_language')}</span>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'en' | 'th' | 'zh')}
                      className="ios-select-inline"
                    >
                      <option value="th">ไทย</option>
                      <option value="zh">中文</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  {/* Theme Item */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Eye size={16} color="var(--accent-color)" />
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{t('profile_theme')}</span>
                    </div>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as 'system' | 'light' | 'dark')}
                      className="ios-select-inline"
                    >
                      <option value="system">{t('profile_theme_system')}</option>
                      <option value="light">{t('profile_theme_light')}</option>
                      <option value="dark">{t('profile_theme_dark')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', marginLeft: '0.75rem', fontWeight: 600 }}>{t('profile_section_security')}</h3>
                {!showChangePassword ? (
                  <div style={{ width: '100%', padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => setShowChangePassword(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 59, 48, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={16} color="#ff3b30" />
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{t('profile_change_password')}</span>
                    </div>
                    <ArrowLeft size={18} color="var(--text-secondary)" style={{ transform: 'rotate(180deg)' }} />
                  </div>
                ) : (
                  <div style={{ width: '100%', padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <button onClick={() => { setShowChangePassword(false); setPwMessage(null); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        <ArrowLeft size={20} />
                      </button>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Lock size={16} color="#ff3b30" /> {t('profile_change_password')}
                      </h3>
                    </div>

                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.8rem' }}>{t('profile_old_password')}</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showOldPw ? 'text' : 'password'} required value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="input-field" placeholder="Enter old password" style={{ padding: '0.6rem', paddingRight: '2.5rem', fontSize: '0.9rem', borderRadius: '8px', background: 'var(--bg-primary)' }} />
                          <button type="button" onClick={() => setShowOldPw(p => !p)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            {showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.8rem' }}>{t('profile_new_password')}</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showNewPw ? 'text' : 'password'} required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" placeholder="At least 6 characters" style={{ padding: '0.6rem', paddingRight: '2.5rem', fontSize: '0.9rem', borderRadius: '8px', background: 'var(--bg-primary)' }} />
                          <button type="button" onClick={() => setShowNewPw(p => !p)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.8rem' }}>{t('profile_confirm_password')}</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showConfirmPw ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field" placeholder="Repeat new password" style={{ padding: '0.6rem', paddingRight: '2.5rem', fontSize: '0.9rem', borderRadius: '8px', background: 'var(--bg-primary)' }} />
                          <button type="button" onClick={() => setShowConfirmPw(p => !p)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {pwMessage && (
                        <div style={{ padding: '0.5rem', borderRadius: '8px', background: pwMessage.type === 'success' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', border: `1px solid ${pwMessage.type === 'success' ? '#34c759' : '#ff3b30'}`, color: pwMessage.type === 'success' ? '#34c759' : '#ff3b30', fontSize: '0.8rem' }}>
                          {pwMessage.text}
                        </div>
                      )}

                      <Button type="submit" variant="primary" isLoading={pwLoading} style={{ marginTop: '0.5rem', padding: '0.75rem', fontSize: '0.95rem', justifyContent: 'center', borderRadius: '8px' }}>
                        {t('profile_save')}
                      </Button>
                    </form>
                  </div>
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
                  <PlusCircle size={14} style={{ marginRight: '0.25rem' }} /> {canAddHomework ? t('add_homework' as TranslationKey) : t('suggest_homework')}
                </Button>
              </div>
            </Card>

            {(() => {
              const subjectRequests = homeworkRequests.filter(req => req.subjectId === selectedSubject.id);
              if (subjectRequests.length === 0) return null;
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', margin: '0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    <Clock size={18} color="var(--accent-color)" /> {t('schedule_your_suggestions')}
                  </h3>
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                    {subjectRequests.map((req, idx) => (
                      <div key={req.id} style={{ padding: '1rem', borderBottom: idx === subjectRequests.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{req.title}</div>
                          <div style={{ 
                            fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '100px',
                            background: req.status === 'pending' ? 'rgba(255, 149, 0, 0.1)' : req.status === 'approved' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                            color: req.status === 'pending' ? '#ff9500' : req.status === 'approved' ? '#34c759' : '#ff3b30',
                            textTransform: 'capitalize'
                          }}>
                            {req.status}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} /> Due: {new Date(req.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div style={{ paddingBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <CheckSquare size={20} color="var(--accent-color)" /> {t('subject_homework')}
              </h3>

              {/* Tabs */}
              <div style={{ 
                display: 'flex', 
                background: 'var(--bg-primary)', 
                padding: '0.25rem', 
                borderRadius: '8px', 
                marginBottom: '1.25rem', 
                overflowX: 'auto', 
                scrollbarWidth: 'none',
                gap: '0.25rem'
              }}>
                {(['new', 'urgent', 'overdue', 'completed'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSubjectHwTab(tab)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      background: subjectHwTab === tab ? 'var(--bg-secondary)' : 'transparent',
                      color: subjectHwTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                      boxShadow: subjectHwTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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
                  <div style={{ 
                      display: 'flex', flexDirection: 'column', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border-color)',
                      overflow: 'hidden'
                  }}>
                    {filteredHw.map((hw, idx) => {
                      const isCompleted = completedHomeworkIds.has(hw.id);
                      return (
                        <div 
                          key={hw.id} 
                          onClick={() => setSelectedHomework(hw)} 
                          style={{ 
                            display: 'flex', alignItems: 'flex-start', gap: '1rem', 
                            padding: '1rem', 
                            cursor: 'pointer', transition: 'background-color 0.2s',
                            borderBottom: idx === filteredHw.length - 1 ? 'none' : '1px solid var(--border-color)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ marginTop: '0.1rem', color: isCompleted ? '#34c759' : 'var(--text-secondary)', flexShrink: 0 }}>
                            {isCompleted ? <CheckCircle2 size={24} /> : <div style={{ width: '22px', height: '22px', margin: '1px', borderRadius: '50%', border: '2px solid var(--text-secondary)' }} />}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none', fontWeight: 600, fontSize: '0.95rem' }}>{hw.title}</span> 
                            <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', padding: '0.2rem 0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
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
                  className="ios-select"
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
                                  if(parentSubject) {
                                    handleSubjectClick(parentSubject);
                                    setSelectedHomework(h);
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

        <button onClick={() => { setActiveTab('chat'); if (activeChatId) setActiveChatId(null); }} style={navBtnStyle(activeTab === 'chat')}>
          <div style={{ position: 'relative' }}>
            <MessageSquare size={20} />
            {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
              <div style={{ position: 'absolute', top: '-4px', right: '-8px', background: 'var(--accent-color)', color: 'var(--accent-text)', fontSize: '0.65rem', fontWeight: 700, minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.2rem', border: '2px solid var(--bg-secondary)' }}>
                {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 99 ? '99+' : Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
              </div>
            )}
          </div>
          <span>{t('nav_chat' as TranslationKey)}</span>
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

      {/* Hamburger Sidebar Menu */}
      {isMenuOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }} onClick={() => setIsMenuOpen(false)} className="animate-fade-in" />
          <div style={{ position: 'fixed', top: 0, bottom: 0, left: 0, width: '280px', backgroundColor: 'var(--bg-primary)', zIndex: 2001, transform: 'translateX(0)', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }} className="animate-slide-up">
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={() => { setActiveTab('schedule'); setIsMenuOpen(false); }} className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'flex-start', border: 'none', background: activeTab === 'schedule' ? 'var(--bg-secondary)' : 'transparent', padding: '1rem', borderRadius: '12px', alignItems: 'center' }}>
                <Calendar size={20} style={{ color: activeTab === 'schedule' ? 'var(--accent-color)' : 'var(--text-primary)' }} />
                <span style={{ color: activeTab === 'schedule' ? 'var(--accent-color)' : 'var(--text-primary)', fontWeight: 500 }}>{t('nav_schedule' as TranslationKey)}</span>
              </button>
              <button onClick={() => { setActiveTab('analytics'); setIsMenuOpen(false); }} className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'flex-start', border: 'none', background: activeTab === 'analytics' ? 'var(--bg-secondary)' : 'transparent', padding: '1rem', borderRadius: '12px', alignItems: 'center' }}>
                <BarChart2 size={20} style={{ color: activeTab === 'analytics' ? 'var(--accent-color)' : 'var(--text-primary)' }} />
                <span style={{ color: activeTab === 'analytics' ? 'var(--accent-color)' : 'var(--text-primary)', fontWeight: 500 }}>{t('nav_stats' as TranslationKey)}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Homework Detail Modal */}
      {selectedHomework && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="animate-fade-in" onClick={() => setSelectedHomework(null)}>
          <div style={{ padding: '1.5rem', width: '90%', maxWidth: '340px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', position: 'relative', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }} className="animate-scale-in" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--bg-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                <CheckSquare size={28} color="var(--accent-color)" />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 600 }}>{selectedHomework.title}</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {subjectList.find(s => s.id === selectedHomework.subjectId)?.name || t('form_select_subject' as TranslationKey)} &bull; {new Date(selectedHomework.dueDate).toLocaleDateString()}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => { toggleHomeworkCompletion(selectedHomework.id); setSelectedHomework(null); }} 
                className="btn"
                style={{ width: '100%', borderRadius: '12px', background: completedHomeworkIds.has(selectedHomework.id) ? 'var(--bg-primary)' : 'var(--accent-color)', color: completedHomeworkIds.has(selectedHomework.id) ? 'var(--text-primary)' : 'var(--accent-text)', border: completedHomeworkIds.has(selectedHomework.id) ? '1px solid var(--border-color)' : 'none', fontWeight: 600, padding: '0.85rem' }}
              >
                {completedHomeworkIds.has(selectedHomework.id) ? (
                  <>
                    <CheckCircle2 size={18} color="var(--text-secondary)" />
                    {t('hw_undo_complete' as TranslationKey)}
                  </>
                ) : (
                  <>
                    <CheckSquare size={18} />
                    {t('hw_mark_done' as TranslationKey)}
                  </>
                )}
              </button>
              <button 
                onClick={() => { 
                  setChatInput(`[HW_SHARE:${selectedHomework.id}]`);
                  setSelectedHomework(null);
                  setActiveChatId(null);
                  setActiveTab('chat');
                }} 
                className="btn btn-secondary" 
                style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
              >
                <Share2 size={18} />
                Share to Chat
              </button>
              <button onClick={() => setSelectedHomework(null)} className="btn btn-secondary" style={{ width: '100%', borderRadius: '12px', border: 'none', background: 'transparent', padding: '0.85rem' }}>
                {t('profile_cancel' as TranslationKey)}
              </button>
            </div>
          </div>
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
