'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  id: string;
  type: 'success' | 'error';
  message: string;
  onClose: (id: string) => void;
}

interface ToastContextType {
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast: React.FC<ToastProps> = ({ id, type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div className={`
      flex items-center p-4 mb-3 rounded-lg shadow-lg max-w-sm 
      transform transition-all duration-300 ease-in-out
      ${type === 'success' 
        ? 'bg-green-50 border border-green-200 text-green-800' 
        : 'bg-red-50 border border-red-200 text-red-800'
      }
    `}>
      <div className="flex-shrink-0 mr-3">
        {type === 'success' ? (
          <CheckCircle className="h-5 w-5 text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 text-red-400" />
        )}
      </div>
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      <button
        onClick={() => onClose(id)}
        className={`
          ml-2 inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
          ${type === 'success' 
            ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' 
            : 'text-red-500 hover:bg-red-100 focus:ring-red-600'
          }
        `}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: 'success' | 'error';
    message: string;
  }>>([]);

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container - Fixed position on the right side */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};