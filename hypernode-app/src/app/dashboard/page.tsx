'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LayoutDashboard, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <LayoutDashboard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please connect your Solana wallet to view your dashboard
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
              Track your jobs, earnings, and network activity
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Total Jobs
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    0
                  </p>
                </div>
                <LayoutDashboard className="w-8 h-8 text-primary-500" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Running
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">0</p>
                </div>
                <Loader2 className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Completed
                  </p>
                  <p className="text-2xl font-bold text-green-600">0</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Total Spent
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    0 SOL
                  </p>
                </div>
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Recent Jobs
            </h2>

            <div className="text-center py-12">
              <LayoutDashboard className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No jobs yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Submit your first AI inference job to get started
              </p>
              <a href="/marketplace" className="btn btn-primary">
                Go to Marketplace
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
