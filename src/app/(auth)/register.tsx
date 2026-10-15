import { Redirect } from 'expo-router';
import React from 'react';

/** Google is the only supported account creation method in Phase 3. */
export default function RegisterScreen() {
  return <Redirect href="/login" />;
}
