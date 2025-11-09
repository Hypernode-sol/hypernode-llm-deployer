'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { JobCard } from '@/components/marketplace/JobCard';
import { CreateJobForm } from '@/components/marketplace/CreateJobForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useToast } from '@/components/ui/Toast';
import { Plus, Filter, Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { CreateJobParams } from '@/types';

type FilterStatus = 'all' | 'pending' | 'running' | 'completed';
type SortOption = 'newest' | 'oldest' | 'price-high' | 'price-low';

export default function MarketplacePage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Simulate loading jobs from blockchain
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  }, []);

  const handleCreateJob = async (params: CreateJobParams) => {
    setIsCreating(true);
    try {
      // TODO: Integrate with SDK to create job on-chain
      console.log('Creating job:', params);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      showToast({
        type: 'success',
        title: 'Job Created Successfully',
        message: 'Your job has been submitted to the network and will be processed shortly',
      });

      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating job:', error);
      showToast({
        type: 'error',
        title: 'Failed to Create Job',
        message: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchQuery || filterStatus !== 'all' || sortBy !== 'newest';

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                GPU Marketplace
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Browse available jobs or submit your own AI inference task
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn-primary flex items-center space-x-2 justify-center"
            >
              <Plus className={`w-5 h-5 transition-transform ${showCreateForm ? 'rotate-45' : ''}`} />
              <span>{showCreateForm ? 'Cancel' : 'Create Job'}</span>
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
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <CreateJobForm onSubmit={handleCreateJob} isLoading={isCreating} />
            </div>
          )}

          {/* Search & Filters Bar */}
          <div className="card mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs by ID, model, or description..."
                    className="input pl-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center space-x-2`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                    •
                  </span>
                )}
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      className="input"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="running">Running</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sort By
                    </label>
                    <select
                      className="input"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="price-low">Price: Low to High</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={handleClearFilters}
                      disabled={!hasActiveFilters}
                      className="btn btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
              {searchQuery && (
                <span className="badge badge-primary flex items-center space-x-1">
                  <span>Search: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-primary-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterStatus !== 'all' && (
                <span className="badge badge-primary flex items-center space-x-1">
                  <span>Status: {filterStatus}</span>
                  <button onClick={() => setFilterStatus('all')} className="hover:text-primary-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {sortBy !== 'newest' && (
                <span className="badge badge-primary flex items-center space-x-1">
                  <span>Sort: {sortBy}</span>
                  <button onClick={() => setSortBy('newest')} className="hover:text-primary-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Jobs Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Available Jobs
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isLoading ? 'Loading...' : '0 jobs'}
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title="No jobs available"
                description="Connect your wallet to browse jobs or create your first job to get started with the Hypernode network"
                actionLabel="Create First Job"
                onAction={() => setShowCreateForm(true)}
              />
            )}

            {/* TODO: Replace with actual jobs from blockchain
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
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
