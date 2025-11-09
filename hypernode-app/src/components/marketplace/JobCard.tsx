'use client';

import React from 'react';
import { JobAccount } from '@/types';
import { formatSol, formatDate, formatDuration, formatJobState, formatGpuType, getRelativeTime } from '@/lib/utils';
import { Clock, Cpu, HardDrive, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: JobAccount;
  onClick?: () => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const state = formatJobState(job.state);
  const stateColors: Record<string, string> = {
    Queued: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Running: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    Completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    Stopped: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    'Timed Out': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'card cursor-pointer hover:border-primary-500 transition-all',
        onClick && 'hover:scale-[1.02]'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Circle className={cn('w-2 h-2 fill-current', {
            'text-blue-500': state === 'Queued',
            'text-yellow-500': state === 'Running',
            'text-green-500': state === 'Completed',
            'text-gray-500': state === 'Stopped',
            'text-red-500': state === 'Timed Out',
          })} />
          <span className={cn('badge', stateColors[state] || 'badge-gray')}>
            {state}
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {getRelativeTime(job.timeCreated)}
        </div>
      </div>

      {/* Job ID */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Job ID
        </div>
        <div className="font-mono text-sm text-gray-900 dark:text-white truncate">
          {job.id.toString().slice(0, 32)}...
        </div>
      </div>

      {/* Requirements */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              GPU Type
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {formatGpuType(job.gpuType)}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Min VRAM
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {job.minVram} GB
            </div>
          </div>
        </div>
      </div>

      {/* Payment & Timeout */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Payment
          </div>
          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {formatSol(job.price)} SOL
          </div>
        </div>
        <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            {formatDuration(job.timeout.toNumber())}
          </span>
        </div>
      </div>

      {/* Node assigned (if running) */}
      {job.node && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Assigned Node
          </div>
          <div className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">
            {job.node.toString()}
          </div>
        </div>
      )}
    </div>
  );
}
