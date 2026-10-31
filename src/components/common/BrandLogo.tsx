import React from 'react';
export function BrandLogo({className=''}:{className?:string}) {
  return <img className={`brand-logo ${className}`} src="/matrixtrack-logo.png" alt="MatrixTrack 2.0" width={44} height={44} decoding="async"/>;
}
