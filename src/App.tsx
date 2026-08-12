import { useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Loader2 } from 'lucide-react';
import { GlobalAnnouncement } from './components/ui/GlobalAnnouncement';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 className="animate-spin" size={32} color="var(--text-secondary)" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <>
        <GlobalAnnouncement />
        <AdminDashboard onLogout={() => setIsAdmin(false)} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <GlobalAnnouncement />
        <Login onAdminLogin={() => setIsAdmin(true)} />
      </>
    );
  }

  return (
    <>
      <GlobalAnnouncement />
      <Dashboard user={user} />
    </>
  );
}
