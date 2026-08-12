import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Info, AlertTriangle, XCircle, X } from 'lucide-react';
import type { AnnouncementData } from '../../types';

export function GlobalAnnouncement() {
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    // Only fetch active announcements
    // We avoid orderBy here to prevent requiring a composite index in Firestore
    const q = query(
      collection(db, 'announcements'),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // If there are multiple active, just take the first one (or we could sort in memory)
        const doc = snapshot.docs[snapshot.docs.length - 1]; // Getting the latest one roughly
        setAnnouncement({ id: doc.id, ...doc.data() } as AnnouncementData);
        setIsHidden(false); // Reset hidden state when a new announcement comes in
      } else {
        setAnnouncement(null);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!announcement || isHidden) return null;

  const getIcon = () => {
    switch (announcement.type) {
      case 'urgent': return <XCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'info':
      default: return <Info size={20} />;
    }
  };

  return (
    <div className={`broadcast-banner ${announcement.type}`}>
      <div className="broadcast-content">
        {getIcon()}
        <div className="marquee-wrapper">
          <span className="broadcast-text">{announcement.message}</span>
        </div>
      </div>
      <button onClick={() => setIsHidden(true)} className="broadcast-close" title="Dismiss">
        <X size={18} />
      </button>
    </div>
  );
}
