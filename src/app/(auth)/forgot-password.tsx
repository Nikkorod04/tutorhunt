import { Redirect } from 'expo-router';
import React from 'react';

/** Password recovery is no longer needed while Google is the sole sign-in method. */
export default function ForgotPasswordScreen() {
  return <Redirect href="/login" />;
}
