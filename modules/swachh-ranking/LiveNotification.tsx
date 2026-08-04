'use client';

import React from 'react';

export const fireSubmissionAlert = (message: string) => {
  if (typeof window !== 'undefined') {
    console.log('[LiveNotification]', message);
  }
};

export default function LiveNotification() {
  return null;
}
