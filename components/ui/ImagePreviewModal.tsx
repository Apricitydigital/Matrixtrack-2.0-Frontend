'use client';

import type { ReactNode } from 'react';
import { PhotoViewer } from '@components/cleanliness-issues/PhotoViewer';

/** Shared zoomable preview for report photos; changing the image resets to fit. */
export default function ImagePreviewModal({ uri, onClose, caption = 'Inspection evidence', footer }: {
  uri: string | null;
  onClose: () => void;
  caption?: string;
  footer?: ReactNode;
}) {
  if (!uri) return null;
  return <PhotoViewer key={uri} photo={{ url: uri }} caption={caption} onClose={onClose} showMetadata={false} footer={footer} />;
}
