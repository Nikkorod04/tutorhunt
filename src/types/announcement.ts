export interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUid: string;
}

export interface UserAnnouncement extends Announcement {
  readAt: Date | null;
}
