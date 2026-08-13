export interface SubjectData {
  id: string;
  name: string;
  teacher: string;
  room: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

export interface UserData {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isOnline: boolean;
  canAddHomework?: boolean;
  isSecA?: boolean;
  isPresident?: boolean;
  createdAt: string;
}

export interface HomeworkData {
  id: string;
  title: string;
  subjectId: string;
  dueDate: string;
  createdAt: string;
}

export interface CalendarEventData {
  id: string;
  userId: string;
  date: string;
  title: string;
  color: string;
  createdAt: string;
  readOnly?: boolean;
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

export interface AnnouncementData {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
  active: boolean;
  createdAt: string;
}

export interface ExamData {
  id: string;
  title: string;
  subjectId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string;
  notes: string;
  createdAt: string;
}
