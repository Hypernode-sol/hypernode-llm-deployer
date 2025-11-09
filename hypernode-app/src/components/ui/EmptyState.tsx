'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const ActionButton = () => {
    if (!actionLabel) return null;

    const buttonClass = 'btn btn-primary mt-4';

    if (actionHref) {
      return (
        <Link href={actionHref} className={buttonClass}>
          {actionLabel}
        </Link>
      );
    }

    if (onAction) {
      return (
        <button onClick={onAction} className={buttonClass}>
          {actionLabel}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="card text-center py-12">
      <div className="flex justify-center mb-4">
        <Icon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      <ActionButton />
    </div>
  );
}
