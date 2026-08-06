import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }} className="animate-fade-in">
          <ShieldAlert size={48} style={{ margin: '0 auto 1rem' }} />
          <h1>Welcome Back</h1>
          <p>Enter your credentials to access the dashboard</p>
        </div>
        
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input 
              label="Username"
              type="text" 
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            
            <Input 
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '-0.5rem', textAlign: 'center' }}>
                {error}
              </div>
            )}
            
            <Button type="submit" isLoading={loading} style={{ marginTop: '0.5rem' }}>
              Sign In
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
