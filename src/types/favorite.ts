export interface TutorFavorite {
  tutorUid: string;
  displayName: string;
  profilePhotoUrl: string | null;
  subjects: string[];
  city: string;
  rateFrom: number | null;
  snapshotAt: Date;
  createdAt: Date;
}
