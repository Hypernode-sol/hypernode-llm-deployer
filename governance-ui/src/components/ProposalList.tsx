import React from 'react';
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useProposals } from '../hooks/useProposals';
import ProposalCard from './ProposalCard';

const ProposalList: React.FC = () => {
  const { proposals, isLoading } = useProposals();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Active Proposals
        </h3>
        <p className="text-gray-600">
          Be the first to create a proposal for the DAO
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} />
      ))}
    </div>
  );
};

export default ProposalList;
