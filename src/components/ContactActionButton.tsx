import * as Linking from 'expo-linking';
import React from 'react';

import { Button, Text, useToast } from '@/components/ui';
import type { ContactPreference } from '@/types';
import { contactAction } from '@/utils/contact';

interface ContactActionButtonProps {
  preference: ContactPreference;
  value: string;
  fullWidth?: boolean;
}

export function ContactActionButton({ preference, value, fullWidth = true }: ContactActionButtonProps) {
  const { showToast } = useToast();
  const action = contactAction(preference, value);

  if (!action) {
    return <Text token="caption" color="dangerText">This contact detail is no longer valid. Ask the owner to update it.</Text>;
  }

  const actionLabel = action.label;
  const actionIcon = action.icon;
  const actionUrl = action.url;

  async function openContact() {
    try {
      await Linking.openURL(actionUrl);
    } catch {
      showToast(`Could not open ${actionLabel.toLowerCase()}.`, 'danger');
    }
  }

  return <Button label={actionLabel} icon={actionIcon} variant="secondary" onPress={() => void openContact()} fullWidth={fullWidth} />;
}
