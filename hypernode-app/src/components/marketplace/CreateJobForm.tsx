'use client';

import React, { useState } from 'react';
import { CreateJobParams, GpuType } from '@/types';
import { FRAMEWORKS, POPULAR_MODELS, GPU_TYPE_LABELS } from '@/lib/config';
import { Loader2, Plus, X } from 'lucide-react';

interface CreateJobFormProps {
  onSubmit: (params: CreateJobParams) => Promise<void>;
  isLoading?: boolean;
}

export function CreateJobForm({ onSubmit, isLoading }: CreateJobFormProps) {
  const [framework, setFramework] = useState('pytorch');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [input, setInput] = useState('');
  const [minVram, setMinVram] = useState(8);
  const [gpuType, setGpuType] = useState<GpuType>(GpuType.NVIDIA);
  const [timeout, setTimeout] = useState(3600);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);

  const selectedModel = model === 'custom' ? customModel : model;
  const models = POPULAR_MODELS[framework as keyof typeof POPULAR_MODELS] || [];

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedModel || !input) {
      alert('Please fill in all required fields');
      return;
    }

    const env: Record<string, string> = {};
    envVars.forEach(({ key, value }) => {
      if (key && value) {
        env[key] = value;
      }
    });

    const params: CreateJobParams = {
      model: selectedModel,
      framework,
      operations: [
        {
          type: 'run',
          command: framework === 'pytorch' ? 'python inference.py' : 'python generate.py',
        },
      ],
      input: JSON.parse(input),
      minVram,
      gpuType,
      env: Object.keys(env).length > 0 ? env : undefined,
      timeout,
    };

    await onSubmit(params);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Framework */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Framework *
        </label>
        <select
          value={framework}
          onChange={(e) => {
            setFramework(e.target.value);
            setModel('');
          }}
          className="input"
          required
        >
          {FRAMEWORKS.map((fw) => (
            <option key={fw.value} value={fw.value}>
              {fw.label} - {fw.description}
            </option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Model *
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="input"
          required
        >
          <option value="">Select a model</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          <option value="custom">Custom model...</option>
        </select>
      </div>

      {/* Custom Model */}
      {model === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom Model Name *
          </label>
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="e.g., meta-llama/Llama-3.1-70B"
            className="input"
            required
          />
        </div>
      )}

      {/* Input (JSON) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Input (JSON) *
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={framework === 'pytorch'
            ? '{\n  "prompt": "Explain quantum computing",\n  "max_tokens": 200,\n  "temperature": 0.7\n}'
            : '{\n  "prompt": "A beautiful landscape",\n  "num_inference_steps": 25\n}'
          }
          className="input font-mono text-sm"
          rows={6}
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Valid JSON object with model input parameters
        </p>
      </div>

      {/* GPU Requirements */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Min VRAM (GB) *
          </label>
          <input
            type="number"
            value={minVram}
            onChange={(e) => setMinVram(parseInt(e.target.value))}
            min={4}
            max={80}
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            GPU Type
          </label>
          <select
            value={gpuType}
            onChange={(e) => setGpuType(parseInt(e.target.value) as GpuType)}
            className="input"
          >
            {Object.entries(GPU_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Timeout (seconds)
        </label>
        <input
          type="number"
          value={timeout}
          onChange={(e) => setTimeout(parseInt(e.target.value))}
          min={60}
          max={7200}
          className="input"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Job will be cancelled if not completed within this time
        </p>
      </div>

      {/* Environment Variables */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Environment Variables (Optional)
          </label>
          <button
            type="button"
            onClick={handleAddEnvVar}
            className="btn btn-secondary text-sm py-1 px-3 flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
        {envVars.map((envVar, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={envVar.key}
              onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
              placeholder="KEY"
              className="input flex-1"
            />
            <input
              type="text"
              value={envVar.value}
              onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
              placeholder="value"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => handleRemoveEnvVar(index)}
              className="btn btn-secondary p-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full py-3 flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating Job...</span>
            </>
          ) : (
            <span>Create Job</span>
          )}
        </button>
      </div>
    </form>
  );
}
