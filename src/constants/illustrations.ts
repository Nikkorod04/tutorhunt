import type { ImageSourcePropType } from 'react-native';

/** Bundled illustrations used by onboarding and built-in student avatars. */
export const ILLUSTRATIONS = {
  boy: require('../../assets/illustrations/boy.png') as ImageSourcePropType,
  girl: require('../../assets/illustrations/girl.png') as ImageSourcePropType,
  tutor: require('../../assets/illustrations/tutor.png') as ImageSourcePropType,
  tutoring: require('../../assets/illustrations/tutoring.png') as ImageSourcePropType,
} as const;
