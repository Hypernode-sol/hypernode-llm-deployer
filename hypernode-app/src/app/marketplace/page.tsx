'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { JobCard } from '@/components/marketplace/JobCard';
import { CreateJobForm } from '@/components/marketplace/CreateJobForm';
import { Plus, Filter, Search } from 'lucide-react';
import { CreateJobParams } from '@/types';

export default function MarketplacePage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateJob = async (params: CreateJobParams) => {
    setIsCreating(true);
    try {
      // TODO: Integrate with SDK to create job on-chain
      console.log('Creating job:', params);

      // Placeholder: simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert('Job created successfully! (This is a placeholder - SDK integration needed)');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Failed to create job. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                GPU Marketplace
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Browse available jobs or submit your own AI inference task
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn-primary mt-4 md:mt-0 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Job</span>
            </button>
          </div>

          {/* Create Job Form */}
          {showCreateForm && (
            <div className="card mb-8 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Create New Job
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <CreateJobForm onSubmit={handleCreateJob} isLoading={isCreating} />
            </div>
          )}

          {/* Filters & Search */}
          <div className="card mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    className="input pl-10"
                  />
                </div>
              </div>
              <button className="btn btn-secondary flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Jobs Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Available Jobs
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Connect wallet to view jobs
              </span>
            </div>

            {/* Placeholder - No jobs yet */}
            <div className="card text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No jobs available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your wallet to browse jobs or create your first job
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-primary mx-auto"
              >
                Create First Job
              </button>
            </div>

            {/* TODO: Replace with actual jobs from blockchain
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard
                  key={job.id.toString()}
                  job={job}
                  onClick={() => handleJobClick(job)}
                />
              ))}
            </div>
            */}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
