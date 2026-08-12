import React, { useState } from 'react';
import { PlusCircle, Users, Check, X, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { db } from '../../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

import type { UserData } from '../../types';

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
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');

  const handleDeleteUser = async (user: UserData) => {
    if (window.confirm(`Are you sure you want to delete user "${user.username}"? They will no longer be able to use the app.`)) {
      try {
        await deleteDoc(doc(db, 'users', user.id));
      } catch (err) {
        alert("Error deleting user: " + (err as Error).message);
      }
    }
  };

  const handleSaveEdit = async (user: UserData) => {
    if (!editUsername.trim()) {
      alert("Username cannot be empty");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.id), { username: editUsername.trim() });
      setEditingUserId(null);
    } catch (err) {
      alert("Error updating user: " + (err as Error).message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%', maxWidth: '1200px' }} className="animate-fade-in">
      
      {/* Create New User Card */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
          <PlusCircle size={20} color="var(--accent-color)" /> Create New User
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Create a new user account. The user will be able to log in using the username and password you set here.
        </p>

        <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
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

          <div style={{ marginBottom: '1rem' }}>
            <Button type="submit" isLoading={loading} style={{ padding: '0.75rem', fontWeight: 600, width: '100%' }}>
              Create Account
            </Button>
          </div>
        </form>

        {message && (
          <div style={{
            marginTop: '1.5rem',
            color: message.type === 'error' ? '#ef4444' : '#34c759',
            fontSize: '0.875rem',
            padding: '1rem',
            backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(52, 199, 89, 0.1)',
            borderRadius: '8px',
            fontWeight: 500
          }}>
            {message.text}
          </div>
        )}
      </div>

      {/* Manage Users Table */}
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
          <Users size={20} color="var(--accent-color)" /> Manage Users
        </h3>
        
        <div className="admin-data-table-container">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Status</th>
                <th>Can Add Homework</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((user) => {
                const isEditing = editingUserId === user.id;
                
                return (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600 }}>
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={editUsername} 
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="input-field"
                          style={{ padding: '0.5rem', margin: 0, fontSize: '0.9rem' }}
                          autoFocus
                        />
                      ) : (
                        user.username
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${user.isOnline ? 'online' : 'offline'}`}>
                        <span className="dot" />
                        {user.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td>
                      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer' }}>
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
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: user.canAddHomework ? '#34c759' : 'var(--border-color)',
                          borderRadius: '30px', transition: '.3s'
                        }}>
                          <span style={{
                            position: 'absolute', content: '""', height: '22px', width: '22px',
                            left: user.canAddHomework ? '26px' : '2px', bottom: '2px',
                            backgroundColor: 'var(--white, #ffffff)',
                            borderRadius: '50%', transition: '.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {user.canAddHomework && <Check size={14} color="#34c759" />}
                            {!user.canAddHomework && <X size={14} color="var(--text-secondary)" />}
                          </span>
                        </span>
                      </label>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Button onClick={() => handleSaveEdit(user)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '100px' }}>Save</Button>
                          <Button variant="secondary" onClick={() => setEditingUserId(null)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '100px' }}>Cancel</Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => { setEditingUserId(user.id); setEditUsername(user.username); }}
                            style={{ background: 'rgba(0, 122, 255, 0.1)', color: '#007aff', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user)}
                            style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {userList.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No users found.
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
