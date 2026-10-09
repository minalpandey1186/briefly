import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface StatusMessageProps {
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ type, message }) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-600',
  };
  const Icon = type === 'error' || type === 'warning' ? AlertCircle : type === 'success' ? CheckCircle : Info;
  return (
    <div className={`flex items-start gap-2 border rounded-lg px-3 py-2.5 text-sm ${styles[type]}`}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};
