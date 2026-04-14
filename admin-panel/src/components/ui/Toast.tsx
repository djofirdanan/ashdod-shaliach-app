import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          direction: 'rtl',
          fontFamily: 'inherit',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        },
        success: {
          iconTheme: { primary: '#4CAF50', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: '#F44336', secondary: '#fff' },
        },
      }}
    />
  );
};
