'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Coins, TrendingUp, Lock, Unlock, Info } from 'lucide-react';
import { calculateXHyper, STAKING_MULTIPLIERS } from '@/lib/utils';

export default function StakingPage() {
  const { connected } = useWallet();
  const [amount, setAmount] = useState<number>(1000);
  const [duration, setDuration] = useState<number>(180);

  if (!connected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Coins className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your wallet to stake HYPER tokens
            </p>
            <WalletMultiButton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const xHyper = calculateXHyper(amount, duration);
  const multiplier = STAKING_MULTIPLIERS[duration] || 1.0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Stake HYPER
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Lock HYPER tokens to earn xHYPER and participate in the network
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Staking Form */}
            <div className="lg:col-span-2">
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Stake Your Tokens
                </h2>

                {/* Amount Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount (HYPER)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    min={100}
                    className="input"
                    placeholder="1000"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Balance: 0 HYPER
                    </span>
                    <button className="text-sm text-primary-600 hover:text-primary-700">
                      Max
                    </button>
                  </div>
                </div>

                {/* Duration Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Lock Duration
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(STAKING_MULTIPLIERS).map(([days, mult]) => {
                      const label =
                        days === '14' ? '2 Weeks' :
                        days === '30' ? '1 Month' :
                        days === '90' ? '3 Months' :
                        days === '180' ? '6 Months' :
                        '1 Year';

                      return (
                        <button
                          key={days}
                          onClick={() => setDuration(parseInt(days))}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            duration === parseInt(days)
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                          }`}
                        >
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {label}
                          </div>
                          <div className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                            {mult}x multiplier
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* xHYPER Preview */}
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      You will receive
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {multiplier}x multiplier
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {xHyper.toLocaleString()} xHYPER
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Voting power in DAO governance
                  </div>
                </div>

                {/* Info Alert */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900 dark:text-blue-200">
                      <p className="font-semibold mb-1">Important</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Tokens are locked for the selected duration</li>
                        <li>Unstaking requires a cooldown period equal to stake duration</li>
                        <li>xHYPER cannot be transferred</li>
                        <li>Rewards are earned from marketplace fees (1%)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Stake Button */}
                <button className="btn btn-primary w-full py-3 flex items-center justify-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>Stake HYPER</span>
                </button>
              </div>
            </div>

            {/* Stats & Current Stakes */}
            <div className="space-y-6">
              {/* Stats */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Your Stats
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      HYPER Balance
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      0 HYPER
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Total Staked
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      0 HYPER
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Total xHYPER
                    </div>
                    <div className="text-xl font-bold text-primary-600">
                      0 xHYPER
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Unclaimed Rewards
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      0 HYPER
                    </div>
                  </div>
                </div>

                <button className="btn btn-primary w-full mt-6">
                  Claim Rewards
                </button>
              </div>

              {/* Current Stakes */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Active Stakes
                </h3>
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No active stakes
                  </p>
                </div>
              </div>

              {/* Multipliers */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Multiplier Tiers
                </h3>
                <div className="space-y-3">
                  {Object.entries(STAKING_MULTIPLIERS).map(([days, mult]) => {
                    const label =
                      days === '14' ? '2 Weeks' :
                      days === '30' ? '1 Month' :
                      days === '90' ? '3 Months' :
                      days === '180' ? '6 Months' :
                      '1 Year';

                    return (
                      <div
                        key={days}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {label}
                        </span>
                        <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                          {mult}x
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
