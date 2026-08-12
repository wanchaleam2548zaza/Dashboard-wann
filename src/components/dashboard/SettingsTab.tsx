import React from 'react';
import { Camera, Trash2, Check, Globe, Eye, Lock, ArrowLeft, EyeOff, LogOut } from 'lucide-react';
import type { TranslationKey } from '../../translations';
import type { User as FirebaseUser } from 'firebase/auth';
import { Button } from '../ui/Button';

interface SettingsTabProps {
  user: FirebaseUser;
  t: (key: TranslationKey) => string;
  avatarUrl: string | null;
  isUploadingAvatar: boolean;
  avatarInputRef: any;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteAvatar: () => void;
  editingDisplayName: boolean;
  setEditingDisplayName: (val: boolean) => void;
  displayName: string;
  displayNameInput: string;
  setDisplayNameInput: (val: string) => void;
  savingDisplayName: boolean;
  handleSaveDisplayName: () => void;
  language: string;
  setLanguage: (val: any) => void;
  theme: string;
  setTheme: (val: any) => void;
  showChangePassword: boolean;
  setShowChangePassword: React.Dispatch<React.SetStateAction<boolean>>;
  oldPassword: string;
  setOldPassword: (val: string) => void;
  showOldPw: boolean;
  setShowOldPw: React.Dispatch<React.SetStateAction<boolean>>;
  newPassword: string;
  setNewPassword: (val: string) => void;
  showNewPw: boolean;
  setShowNewPw: React.Dispatch<React.SetStateAction<boolean>>;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  showConfirmPw: boolean;
  setShowConfirmPw: React.Dispatch<React.SetStateAction<boolean>>;
  pwMessage: { type: 'success' | 'error'; text: string } | null;
  setPwMessage: (val: any) => void;
  pwLoading: boolean;
  handleChangePassword: (e: React.FormEvent) => void;
  handleSignOut: () => void;
  loading: boolean;
}

export function SettingsTab({
  t, avatarUrl, isUploadingAvatar, avatarInputRef, handleAvatarUpload, handleDeleteAvatar,
  editingDisplayName, setEditingDisplayName, displayName, displayNameInput, setDisplayNameInput,
  savingDisplayName, handleSaveDisplayName, language, setLanguage, theme, setTheme,
  showChangePassword, setShowChangePassword, oldPassword, setOldPassword, showOldPw, setShowOldPw,
  newPassword, setNewPassword, showNewPw, setShowNewPw, confirmPassword, setConfirmPassword,
  showConfirmPw, setShowConfirmPw, pwMessage, setPwMessage, pwLoading, handleChangePassword,
  handleSignOut, loading
}: SettingsTabProps) {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Profile Section */}
      <div>
        <h3 className="ios-list-header">{t('profile_section_general' as TranslationKey)}</h3>
        <div className="ios-list-group">
          <div className="ios-list">
            
            {/* Avatar Row */}
            <div className="ios-list-item" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {isUploadingAvatar ? (
                    <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2rem' }}>👤</span>
                  )}
                </div>
                <button onClick={() => avatarInputRef.current?.click()} disabled={isUploadingAvatar} style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', color: 'white', border: '2px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Camera size={14} />
                </button>
                <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {avatarUrl && (
                  <button onClick={handleDeleteAvatar} disabled={isUploadingAvatar} style={{ background: 'none', border: 'none', color: '#ff3b30', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Trash2 size={14} /> {t('profile_delete_picture' as TranslationKey)}
                  </button>
                )}
              </div>
            </div>

            {/* Display Name Row */}
            <div className="ios-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="ios-list-item-title" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {t('profile_display_name' as TranslationKey)}
              </span>
              {!editingDisplayName ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{displayName}</span>
                  <button onClick={() => { setEditingDisplayName(true); setDisplayNameInput(displayName); }} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    {t('profile_edit' as TranslationKey)}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                  <input
                    autoFocus
                    value={displayNameInput}
                    onChange={e => setDisplayNameInput(e.target.value)}
                    className="input-field"
                    placeholder={t('profile_enter_name' as TranslationKey)}
                    maxLength={30}
                    style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button disabled={savingDisplayName || !displayNameInput.trim()} onClick={handleSaveDisplayName} className="btn btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', borderRadius: '8px' }}>
                      {savingDisplayName ? '...' : <><Check size={14} /> {t('profile_save' as TranslationKey)}</>}
                    </button>
                    <button onClick={() => setEditingDisplayName(false)} style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>{t('profile_cancel' as TranslationKey)}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Language Row */}
            <div className="ios-list-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={16} color="var(--accent-text)" />
                </div>
                <span className="ios-list-item-title">{t('profile_language' as TranslationKey)}</span>
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

            {/* Theme Row */}
            <div className="ios-list-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#34c759', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Eye size={16} color="white" />
                </div>
                <span className="ios-list-item-title">{t('profile_theme_app' as TranslationKey)}</span>
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'system' | 'light' | 'dark' | 'white-pink')}
                className="ios-select-inline"
              >
                <option value="system">{t('profile_theme_system' as TranslationKey)}</option>
                <option value="light">{t('profile_theme_light' as TranslationKey)}</option>
                <option value="dark">{t('profile_theme_dark' as TranslationKey)}</option>
                <option value="white-pink">{t('profile_theme_white_pink' as TranslationKey)}</option>
              </select>
            </div>
            
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div>
        <h3 className="ios-list-header">{t('profile_section_security' as TranslationKey)}</h3>
        <div className="ios-list-group">
          <div className="ios-list">
            {!showChangePassword ? (
              <div className="ios-list-item clickable" onClick={() => setShowChangePassword(true)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#ff3b30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={16} color="white" />
                  </div>
                  <span className="ios-list-item-title">{t('profile_change_password' as TranslationKey)}</span>
                </div>
                <ArrowLeft size={16} color="var(--text-secondary)" style={{ transform: 'rotate(180deg)' }} />
              </div>
            ) : (
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button onClick={() => { setShowChangePassword(false); setPwMessage(null); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={20} />
                  </button>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={16} color="#ff3b30" /> {t('profile_change_password' as TranslationKey)}
                  </h3>
                </div>

                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.8rem' }}>{t('profile_old_password' as TranslationKey)}</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showOldPw ? 'text' : 'password'} required value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="input-field" placeholder="Enter old password" style={{ padding: '0.6rem', paddingRight: '2.5rem', fontSize: '0.9rem', borderRadius: '8px', background: 'var(--bg-primary)' }} />
                      <button type="button" onClick={() => setShowOldPw(p => !p)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.8rem' }}>{t('profile_new_password' as TranslationKey)}</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showNewPw ? 'text' : 'password'} required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" placeholder="At least 6 characters" style={{ padding: '0.6rem', paddingRight: '2.5rem', fontSize: '0.9rem', borderRadius: '8px', background: 'var(--bg-primary)' }} />
                      <button type="button" onClick={() => setShowNewPw(p => !p)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.8rem' }}>{t('profile_confirm_password' as TranslationKey)}</label>
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
                    {t('profile_save' as TranslationKey)}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout */}
      <button 
        onClick={handleSignOut} 
        disabled={loading}
        style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 59, 48, 0.3)', background: 'var(--bg-secondary)', color: '#ff3b30', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'background-color 0.2s', opacity: loading ? 0.7 : 1 }}
      >
        <LogOut size={18} /> {t('profile_sign_out' as TranslationKey)}
      </button>

    </div>
  );
}
