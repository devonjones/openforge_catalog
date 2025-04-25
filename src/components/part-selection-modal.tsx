'use client'

import React from 'react';
import ResultsContainer from './results-container';
import BlueprintContainer from './blueprint-container';
import { BlueprintProvider } from '@/contexts/blueprint-context';
import { TagProvider } from '@/contexts/tag-context';
import './part-selection-modal.css';

interface PartSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  partName: string;
  configValues: Record<string, any> | null;
}

const PartSelectionModal = ({ isOpen, onClose, partName, configValues }: PartSelectionModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="part-selection-modal">
      <div className="part-selection-modal__content">
        <div className="part-selection-modal__header">
          <h2 className="part-selection-modal__title">Part Selection For Blueprint: {partName}</h2>
          <button
            onClick={onClose}
            className="part-selection-modal__close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="part-selection-modal__body">
          <TagProvider autoload={false} search_models={true} search_blueprints={false}>
            <BlueprintProvider autoload={false}>
              <div className="part-selection-modal__grid">
                <div className="part-selection-modal__sidebar">
                  <ResultsContainer configValues={configValues} />
                </div>
                <div className="part-selection-modal__main">
                  <BlueprintContainer configValues={configValues} />
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