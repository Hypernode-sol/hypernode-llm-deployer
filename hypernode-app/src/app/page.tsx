'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArrowRight, Zap, Shield, Coins, Cpu, BarChart3, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Decentralized GPU Network
                <br />
                <span className="gradient-text">on Solana</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Access powerful GPUs for AI inference or monetize your hardware.
                Fast, trustless, and built on Solana blockchain.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/marketplace"
                  className="btn btn-primary text-lg px-8 py-3 flex items-center justify-center space-x-2"
                >
                  <span>Browse Jobs</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/node"
                  className="btn btn-outline text-lg px-8 py-3 flex items-center justify-center space-x-2"
                >
                  <Cpu className="w-5 h-5" />
                  <span>Connect Your GPU</span>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  Devnet
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Network Status
                </div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  ~13k CU
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Gas Optimized
                </div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  5 Programs
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Core Protocol
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose Hypernode?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Built with industry best practices for security, modularity, and performance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="card">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Fast Execution
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Jobs are matched with available GPUs instantly. Execute AI workloads
                  in seconds, not minutes.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="card">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Trustless Design
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  All transactions verified on-chain. Escrow payments protect both
                  clients and node operators.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="card">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                  <Coins className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Earn Rewards
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Stake HYPER tokens to participate. Earn rewards from marketplace
                  fees and job completions.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="card">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                  <Cpu className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  GPU Variety
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Support for NVIDIA and AMD GPUs. Choose the hardware that fits
                  your workload.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="card">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Real-time Monitoring
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Track job status, GPU utilization, and earnings in real-time
                  through your dashboard.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="card">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  DAO Governance
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Community-driven protocol. Vote on proposals using xHYPER-weighted
                  voting power.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                How It Works
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* For Clients */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  For Clients
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Connect Wallet
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        Connect your Solana wallet (Phantom, Solflare)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Submit Job
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        Choose your AI model and submit your inference job
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Get Results
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        Receive results automatically when job completes
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* For Node Operators */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  For Node Operators
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Stake HYPER
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        Stake HYPER tokens to participate in the network
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Register GPU
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        Install worker client and register your GPU
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Earn HYPER
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        Execute jobs and earn automatic payments in SOL + HYPER rewards
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Join the decentralized GPU revolution on Solana
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/marketplace"
                className="bg-white text-primary-600 hover:bg-gray-100 font-medium px-8 py-3 rounded-lg transition-colors inline-flex items-center justify-center space-x-2"
              >
                <span>Submit a Job</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/node"
                className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-medium px-8 py-3 rounded-lg transition-colors inline-flex items-center justify-center space-x-2"
              >
                <Cpu className="w-5 h-5" />
                <span>Become a Node Operator</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
