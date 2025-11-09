'use client';

import React from 'react';
import { CheckCircle, Clock, XCircle, Loader2, AlertCircle } from 'lucide-react';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

interface StatusBadgeProps {
  status: JobStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'badge-gray',
    icon: Clock,
  },
  running: {
    label: 'Running',
    className: 'badge-warning',
    icon: Loader2,
    animated: true,
  },
  completed: {
    label: 'Completed',
    className: 'badge-success',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    className: 'badge-danger',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'badge-gray',
    icon: AlertCircle,
  },
};

export function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span className={`badge ${config.className} ${sizeClasses[size]} flex items-center space-x-1`}>
      {showIcon && (
        <Icon
          className={`w-3 h-3 ${config.animated ? 'animate-spin' : ''}`}
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
