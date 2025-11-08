import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Vote, TrendingUp, Users, Clock } from 'lucide-react';
import ProposalList from './ProposalList';
import CreateProposal from './CreateProposal';
import Stats from './Stats';
import VotingPower from './VotingPower';

const Dashboard: React.FC = () => {
  const { connected } = useWallet();
  const [activeTab, setActiveTab] = useState<'proposals' | 'create'>('proposals');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Vote className="w-8 h-8 text-purple-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Hypernode Governance
              </h1>
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {!connected ? (
        // Not Connected State
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Vote className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Hypernode DAO
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Connect your wallet to participate in governance
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <FeatureCard
                icon={<TrendingUp className="w-8 h-8" />}
                title="xHYPER Weighted Voting"
                description="Voting power based on staked xHYPER tokens"
              />
              <FeatureCard
                icon={<Users className="w-8 h-8" />}
                title="Community Driven"
                description="Shape the future of the network together"
              />
              <FeatureCard
                icon={<Clock className="w-8 h-8" />}
                title="3-Day Voting Period"
                description="Ample time for deliberation and participation"
              />
            </div>
          </div>
        </div>
      ) : (
        // Connected State
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <Stats />

          {/* Voting Power */}
          <VotingPower />

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('proposals')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'proposals'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Active Proposals
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'create'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Create Proposal
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'proposals' ? <ProposalList /> : <CreateProposal />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <div className="text-purple-600 mb-3">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default Dashboard;
