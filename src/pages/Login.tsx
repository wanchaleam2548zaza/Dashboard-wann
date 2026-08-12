import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

interface LoginProps {
  onAdminLogin: () => void;
}

export function Login({ onAdminLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (username === 'admin' && password === '465466') {
        // Admin Bypass
        onAdminLogin();
        return;
      }

      await signInWithEmailAndPassword(auth, `${username}@dashboard.com`, password);
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center' }}>
      <main className="main-content">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }} className="animate-slide-up">
          <ShieldAlert size={48} style={{ margin: '0 auto 1rem', color: 'var(--accent-color)' }} />
          <h1>Welcome Back</h1>
          <p>Enter your credentials to access the dashboard</p>
        </div>

        <div className="animate-slide-up delay-100 ios-list-group">
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="ios-list">
              <div className="ios-list-item" style={{ padding: '0' }}>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ width: '100%', border: 'none', background: 'transparent', padding: '1rem', color: 'var(--text-primary)', outline: 'none', fontSize: '1rem' }}
                />
              </div>
              <div className="ios-list-item" style={{ padding: '0' }}>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', border: 'none', background: 'transparent', padding: '1rem', color: 'var(--text-primary)', outline: 'none', fontSize: '1rem' }}
                />
              </div>
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <Button type="submit" isLoading={loading} style={{ marginTop: '0.5rem' }}>
              Sign In
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
