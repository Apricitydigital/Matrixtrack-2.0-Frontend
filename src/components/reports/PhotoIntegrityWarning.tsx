import React from 'react';
export function PhotoIntegrityWarning({ confidence }: { confidence?: number | null }) {
  if (confidence == null) return null;
  return <span role="note" style={{display:'block',background:'#fff7ed',color:'#92400e',border:'1px solid #d97706',borderRadius:8,padding:10,margin:'8px 0',fontSize:12}}>
    <strong>Photo may have been taken from another device/screen. AI confidence: {confidence}%.</strong> Submitted after accepting the warning. This is an AI estimate.
  </span>;
}
