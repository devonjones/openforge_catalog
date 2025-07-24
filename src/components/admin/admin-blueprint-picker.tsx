'use client'

import React from 'react';
import { createPortal } from 'react-dom';
import ResultsContainer from '../results-container';
import BlueprintContainer from '../blueprint-container';
import TagContainer from '../tag-container';
import { BlueprintProvider } from '@/contexts/blueprint-context';
import { TagProvider } from '@/contexts/tag-context';
import { Blueprint } from '@/types';
import { useBlueprintContext } from '@/contexts/blueprint-context';
import '../part-selection-modal.css';

interface AdminBlueprintPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (blueprint: Blueprint) => void;
}

// Inner component that has access to context
const BlueprintPickerContent = ({ onSelect, onClose }: { onSelect: (blueprint: Blueprint) => void; onClose: () => void }) => {
  const selectedBlueprint = useBlueprintContext((state) => state.selectedBlueprint);
  
  const handleSelectBlueprint = () => {
    if (selectedBlueprint) {
      onSelect(selectedBlueprint);
      onClose();
    }
  };

  return (
    <div className="part-selection-modal__content">
      <div className="part-selection-modal__header">
        <h2 className="part-selection-modal__title">Select Blueprint</h2>
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
        <div className="part-selection-modal__grid">
          <div className="part-selection-modal__tags">
            <TagContainer />
          </div>
          <div className="part-selection-modal__sidebar">
            <ResultsContainer />
          </div>
          <div className="part-selection-modal__main">
            {selectedBlueprint ? (
              <>
                <BlueprintContainer />
                <div style={{ padding: '1rem', borderTop: '1px solid #e0e0e0', marginTop: '1rem' }}>
                  <button 
                    onClick={handleSelectBlueprint}
                    className="admin-select-button"
                    style={{
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Select This Blueprint
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                Select a blueprint from the results
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminBlueprintPicker = ({ isOpen, onClose, onSelect }: AdminBlueprintPickerProps): React.ReactPortal | null => {
  if (!isOpen) return null;

  return createPortal(
    <div className="part-selection-modal">
      <TagProvider autoload={true} search_models={true} search_blueprints={true}>
        <BlueprintProvider autoload={false}>
          <BlueprintPickerContent onSelect={onSelect} onClose={onClose} />
        </BlueprintProvider>
      </TagProvider>
    </div>,
    document.body
  );
};

export default AdminBlueprintPicker;