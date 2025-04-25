'use client'

import React from 'react';
import ResultsContainer from './results-container';
import BlueprintContainer from './blueprint-container';
import { BlueprintProvider } from '@/contexts/blueprint-context';
import { TagProvider } from '@/contexts/tag-context';

interface PartSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  partName: string;
  configValues: Record<string, any> | null;
}

const PartSelectionModal = ({ isOpen, onClose, partName, configValues }: PartSelectionModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Part Selection For Blueprint: {partName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4">
          <TagProvider autoload={false} search_models={true} search_blueprints={false}>
            <BlueprintProvider autoload={false}>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/4">
                  <ResultsContainer configValues={configValues} />
                </div>
                <div className="w-full md:w-3/4">
                  <BlueprintContainer />
                </div>
              </div>
            </BlueprintProvider>
          </TagProvider>
        </div>
      </div>
    </div>
  );
};

export default PartSelectionModal; 