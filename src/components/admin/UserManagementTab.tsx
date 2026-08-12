import React from 'react';
import { PlusCircle, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface UserData {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isOnline: boolean;
  createdAt: string;
  canAddHomework?: boolean;
}

interface UserManagementTabProps {
  handleCreateUser: (e: React.FormEvent) => Promise<void>;
  username: string;
  setUsername: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  message: { type: 'error' | 'success', text: string } | null;
  loading: boolean;
  userList: UserData[];
}

export function UserManagementTab({
  handleCreateUser, username, setUsername, password, setPassword,
  message, loading, userList
}: UserManagementTabProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', width: '100%', maxWidth: '900px', alignItems: 'flex-start' }} className="animate-fade-in">
      {/* Create New User */}
      <div>
        <h3 className="ios-list-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={18} color="var(--accent-color)" /> Create New User
        </h3>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem', lineHeight: 1.5, marginLeft: '0.75rem' }}>
          Create a new user account. The user will be able to log in using the username and password you set here.
        </p>

        <div className="ios-list-group">
          <div className="ios-list" style={{ padding: '1rem' }}>
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
                  color: message.type === 'error' ? '#ef4444' : '#34c759',
                  fontSize: '0.875rem',
                  padding: '0.75rem',
                  backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(52, 199, 89, 0.1)',
                  borderRadius: '8px'
                }}>
                  {message.text}
                </div>
              )}

              <Button type="submit" isLoading={loading} style={{ marginTop: '0.5rem', padding: '0.75rem', fontWeight: 600 }}>
                Create Account
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Manage Users */}
      <div>
        <h3 className="ios-list-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} color="var(--accent-color)" /> Manage Users
        </h3>
        
        <div className="ios-list-group" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <div className="ios-list">
            {userList.map((user) => (
              <div key={user.id} className="ios-list-item" style={{ alignItems: 'center' }}>
                <div className="ios-list-item-content">
                  <span className="ios-list-item-title">{user.username}</span>
                  <div style={{ fontSize: '0.75rem', color: user.isOnline ? '#34c759' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: user.isOnline ? '#34c759' : 'var(--text-secondary)' }} />
                    {user.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
                <div className="ios-list-item-value" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Add Homework</span>
                  <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '30px', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={!!user.canAddHomework}
                      onChange={async (e) => {
                        try {
                          await updateDoc(doc(db, 'users', user.id), { canAddHomework: e.target.checked });
                        } catch (err) { alert("Error updating user permission"); }
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: user.canAddHomework ? '#34c759' : 'var(--border-color)',
                      borderRadius: '30px', transition: '.3s'
                    }}>
                      <span style={{
                        position: 'absolute', content: '""', height: '26px', width: '26px',
                        left: user.canAddHomework ? '22px' : '2px', bottom: '2px',
                        backgroundColor: 'white',
                        borderRadius: '50%', transition: '.3s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
