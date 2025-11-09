'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Cpu, Download, Terminal, CheckCircle, AlertCircle } from 'lucide-react';

export default function NodePage() {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Cpu className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your wallet to register as a node operator
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
              Node Operator
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monetize your GPU by joining the Hypernode network
            </p>
          </div>

          {/* Setup Guide */}
          <div className="card mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Setup Your GPU Node
            </h2>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Stake HYPER Tokens
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You need to stake HYPER tokens to participate in the network. Higher stake = higher priority.
                  </p>
                  <a href="/staking" className="btn btn-primary">
                    Go to Staking
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Install Worker Client
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Download and install the Hypernode worker client on your GPU machine.
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 mb-4">
                    <div>$ cd worker</div>
                    <div>$ npm install</div>
                    <div>$ npm run build</div>
                    <div>$ npm start</div>
                  </div>
                  <a
                    href="https://github.com/Hypernode-sol/hypernode-llm-deployer/tree/main/worker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary flex items-center space-x-2 inline-flex"
                  >
                    <Download className="w-4 h-4" />
                    <span>View Documentation</span>
                  </a>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Configure Environment
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Set up your .env file with your wallet keypair and network settings.
                  </p>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm text-gray-900 dark:text-gray-100">
                    <div>SOLANA_RPC_URL=https://api.devnet.solana.com</div>
                    <div>KEYPAIR_PATH=/path/to/your/keypair.json</div>
                    <div>MARKET_PUBKEY=67UE2LconF9QU5Vobsaf5sXnW9yUisebLj8VmgGWLSdb</div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Start Earning
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Once configured, your worker will automatically register with the marketplace and start accepting jobs. Earnings are paid instantly on job completion.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              System Requirements
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Hardware</span>
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li>• GPU: NVIDIA (CUDA 12.1+) or AMD (ROCm)</li>
                  <li>• VRAM: 8GB minimum (16GB+ recommended)</li>
                  <li>• RAM: 16GB minimum</li>
                  <li>• Disk: 50GB free space</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Software</span>
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li>• OS: Linux (Ubuntu 20.04+), Windows WSL2, macOS</li>
                  <li>• Docker: v24.0+ with GPU support</li>
                  <li>• Node.js: v18+</li>
                  <li>• Solana CLI: v1.18+</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Economics */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Earnings Potential
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      GPU
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Job Type
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Earnings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">RTX 4090</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Llama 7B</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">30s</td>
                    <td className="py-3 px-4 text-primary-600 font-semibold">~0.01 SOL</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">RTX 3090</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Stable Diffusion</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">10s</td>
                    <td className="py-3 px-4 text-primary-600 font-semibold">~0.005 SOL</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">A100</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">Llama 70B</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">2min</td>
                    <td className="py-3 px-4 text-primary-600 font-semibold">~0.05 SOL</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              * Rates vary by market demand. Plus HYPER token rewards from marketplace fees.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
