import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useVote } from '../hooks/useVote';

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: 'active' | 'passed' | 'rejected' | 'executed';
  votesFor: number;
  votesAgainst: number;
  totalVotingPower: number;
  timeCreated: number;
  timeVotingEnds: number;
  proposalType: string;
}

interface ProposalCardProps {
  proposal: Proposal;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal }) => {
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);
  const { vote, isVoting } = useVote();

  const votesForPercent = (proposal.votesFor / proposal.totalVotingPower) * 100;
  const votesAgainstPercent = (proposal.votesAgainst / proposal.totalVotingPower) * 100;
  const quorumPercent = ((proposal.votesFor + proposal.votesAgainst) / proposal.totalVotingPower) * 100;

  const handleVote = async (choice: boolean) => {
    setSelectedVote(choice);
    await vote(proposal.id, choice);
  };

  const getStatusBadge = () => {
    switch (proposal.status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'passed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Passed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'executed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Executed
          </span>
        );
    }
  };

  const timeRemaining = formatDistanceToNow(new Date(proposal.timeVotingEnds * 1000), { addSuffix: true });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {proposal.title}
          </h3>
          <p className="text-sm text-gray-500">
            Proposed by {proposal.proposer.slice(0, 4)}...{proposal.proposer.slice(-4)}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Description */}
      <p className="text-gray-700 mb-4">{proposal.description}</p>

      {/* Voting Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>For: {votesForPercent.toFixed(1)}%</span>
          <span>Against: {votesAgainstPercent.toFixed(1)}%</span>
        </div>
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-green-500"
            style={{ width: `${votesForPercent}%` }}
          />
          <div
            className="absolute right-0 top-0 h-full bg-red-500"
            style={{ width: `${votesAgainstPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Quorum: {quorumPercent.toFixed(1)}% (minimum 10% required)
        </p>
      </div>

      {/* Metadata */}
      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <span>Type: {proposal.proposalType}</span>
        <span>{proposal.status === 'active' ? `Ends ${timeRemaining}` : 'Voting ended'}</span>
      </div>

      {/* Vote Buttons */}
      {proposal.status === 'active' && (
        <div className="flex gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedVote === true
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } disabled:opacity-50`}
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Vote For
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedVote === false
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            } disabled:opacity-50`}
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            Vote Against
          </button>
        </div>
      )}
    </div>
  );
};

export default ProposalCard;
