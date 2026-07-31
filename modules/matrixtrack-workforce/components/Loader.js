import React from 'react';

const Loader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-4">
        <div className="custom-loader"></div>
        <p className="text-slate-600 font-bold text-sm uppercase tracking-[0.2em] animate-pulse">
          Reloading Data...
        </p>
      </div>
    </div>
  );
};

export default Loader;
