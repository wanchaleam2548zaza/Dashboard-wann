export const CompletedByAvatars = ({ homeworkId, allCompleted, users }: { homeworkId: string, allCompleted: {userId: string, homeworkId: string}[], users: any[] }) => {
  const completedUsers = allCompleted.filter(c => c.homeworkId === homeworkId);
  if (completedUsers.length === 0) return null;

  const maxToShow = 4;
  const avatarsToShow = completedUsers.slice(0, maxToShow);
  const extraCount = completedUsers.length - maxToShow;

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.75rem' }}>
      {avatarsToShow.map((cu, idx) => {
        const u = users.find(user => user.id === cu.userId);
        if (!u || !u.avatarUrl) return null;
        return (
          <img 
            key={cu.userId} 
            src={u.avatarUrl} 
            title={u.displayName || u.username}
            style={{ 
              width: '26px', 
              height: '26px', 
              borderRadius: '50%', 
              border: '2px solid var(--bg-secondary)', 
              marginLeft: idx === 0 ? 0 : '-10px',
              objectFit: 'cover',
              zIndex: 10 - idx
            }} 
            alt={u.username} 
          />
        );
      })}
      {extraCount > 0 && (
        <div style={{
          width: '26px', 
          height: '26px', 
          borderRadius: '50%', 
          border: '2px solid var(--bg-secondary)', 
          marginLeft: '-10px',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 600,
          zIndex: 0
        }}>
          +{extraCount}
        </div>
      )}
    </div>
  );
};
