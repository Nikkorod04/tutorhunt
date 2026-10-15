import type { ImageSourcePropType } from 'react-native';

import type { StudentAvatarId, StudentGender, TutorAvatarId } from '@/types';

export interface StudentAvatarOption {
  id: Exclude<StudentAvatarId, 'custom' | 'default'>;
  gender: StudentGender;
  source: ImageSourcePropType;
}

export interface TutorAvatarOption {
  id: Exclude<TutorAvatarId, 'custom' | 'default'>;
  source: ImageSourcePropType;
}

export const DEFAULT_AVATAR = require('../../assets/avatars/default.png') as ImageSourcePropType;

export const STUDENT_AVATARS: Record<StudentGender, StudentAvatarOption[]> = {
  male: [
    { id: 'male-01', gender: 'male', source: require('../../assets/avatars/students/male-01.png') },
    { id: 'male-02', gender: 'male', source: require('../../assets/avatars/students/male-02.png') },
    { id: 'male-03', gender: 'male', source: require('../../assets/avatars/students/male-03.png') },
    { id: 'male-04', gender: 'male', source: require('../../assets/avatars/students/male-04.png') },
    { id: 'male-05', gender: 'male', source: require('../../assets/avatars/students/male-05.png') },
  ],
  female: [
    { id: 'female-01', gender: 'female', source: require('../../assets/avatars/students/female-01.png') },
    { id: 'female-02', gender: 'female', source: require('../../assets/avatars/students/female-02.png') },
    { id: 'female-03', gender: 'female', source: require('../../assets/avatars/students/female-03.png') },
    { id: 'female-04', gender: 'female', source: require('../../assets/avatars/students/female-04.png') },
    { id: 'female-05', gender: 'female', source: require('../../assets/avatars/students/female-05.png') },
  ],
};

export const TUTOR_AVATARS: TutorAvatarOption[] = [
  { id: 'animal-01', source: require('../../assets/avatars/tutors/animal-01.png') },
  { id: 'animal-02', source: require('../../assets/avatars/tutors/animal-02.png') },
  { id: 'animal-03', source: require('../../assets/avatars/tutors/animal-03.png') },
  { id: 'animal-04', source: require('../../assets/avatars/tutors/animal-04.png') },
  { id: 'animal-05', source: require('../../assets/avatars/tutors/animal-05.png') },
];

export function isStudentAvatarId(value: unknown): value is StudentAvatarId {
  return value === 'default' || value === 'custom' || (typeof value === 'string' && /^male-0[1-5]$|^female-0[1-5]$/.test(value));
}

export function isTutorAvatarId(value: unknown): value is TutorAvatarId {
  return value === 'default' || value === 'custom' || (typeof value === 'string' && /^animal-0[1-5]$/.test(value));
}
