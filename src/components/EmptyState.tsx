import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
    {icon && <div className="mb-3 text-stone-300">{icon}</div>}
    <p className="text-stone-500 font-medium text-sm">{title}</p>
    {description && <p className="text-stone-400 text-xs mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
