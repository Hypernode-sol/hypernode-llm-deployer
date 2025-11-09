'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  LayoutDashboard,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Cpu,
  TrendingUp
} from 'lucide-react';
import { StatsCard } from '@/components/ui/StatsCard';
import { StatusBadge, type JobStatus } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/SkeletonCard';

interface Job {
  id: string;
  status: JobStatus;
  model: string;
  createdAt: string;
  completedAt?: string;
  cost: number;
}

export default function DashboardPage() {
  const { connected } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);

  const stats = {
    totalJobs: jobs.length,
    running: jobs.filter(j => j.status === 'running').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    totalSpent: jobs.reduce((sum, j) => sum + j.cost, 0),
  };

  useEffect(() => {
    if (connected) {
      // Simulate loading
      setTimeout(() => {
        setIsLoading(false);
        // TODO: Fetch real data from SDK
        // setJobs(fetchedJobs);
      }, 1500);
    }
  }, [connected]);

  if (!connected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <LayoutDashboard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please connect your Solana wallet to view your dashboard and track your jobs
            </p>
            <WalletMultiButton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              My Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your jobs, earnings, and network activity in real-time
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Jobs"
              value={stats.totalJobs}
              icon={LayoutDashboard}
              iconColor="text-primary-500"
              isLoading={isLoading}
              trend={{ value: 12, isPositive: true }}
            />

            <StatsCard
              title="Running"
              value={stats.running}
              icon={Loader2}
              iconColor="text-yellow-500"
              valueColor="text-yellow-600"
              isLoading={isLoading}
            />

            <StatsCard
              title="Completed"
              value={stats.completed}
              icon={CheckCircle}
              iconColor="text-green-500"
              valueColor="text-green-600"
              isLoading={isLoading}
              trend={{ value: 8, isPositive: true }}
            />

            <StatsCard
              title="Total Spent"
              value={`${stats.totalSpent.toFixed(3)} SOL`}
              icon={DollarSign}
              iconColor="text-blue-500"
              isLoading={isLoading}
            />
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Avg. Completion Time
                </h3>
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? (
                  <span className="animate-pulse">--</span>
                ) : (
                  '45s'
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Last 7 days average
              </p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Success Rate
                </h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {isLoading ? (
                  <span className="animate-pulse">--</span>
                ) : (
                  '98.5%'
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Based on completed jobs
              </p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active Nodes
                </h3>
                <Cpu className="w-5 h-5 text-primary-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? (
                  <span className="animate-pulse">--</span>
                ) : (
                  '0'
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your registered nodes
              </p>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Recent Jobs
              </h2>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                View All
              </button>
            </div>

            {isLoading ? (
              <SkeletonTable rows={5} />
            ) : jobs.length === 0 ? (
              <EmptyState
                icon={LayoutDashboard}
                title="No jobs yet"
                description="Submit your first AI inference job to get started with the Hypernode network"
                actionLabel="Go to Marketplace"
                actionHref="/marketplace"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Job ID
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Model
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Created
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {jobs.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-4 text-sm font-mono text-gray-900 dark:text-white">
                          {job.id.substring(0, 8)}...
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {job.model}
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={job.status} size="sm" />
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(job.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {job.cost.toFixed(3)} SOL
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
