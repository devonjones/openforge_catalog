'use client'

import React, { useState } from 'react';
import { Blueprint } from '@/types';
import { useBlueprintContext } from '@/contexts/blueprint-context';
import PartSelectionModal from './part-selection-modal';

interface ConfigBoxProps {
  title: string;
  value: any;
}

const ConfigBox = ({ title, value }: ConfigBoxProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const blueprint = useBlueprintContext((state) => state.selectedBlueprint);
  const configSelections = useBlueprintContext((state) => state.configSelections);
  const setConfigSelection = useBlueprintContext((state) => state.setConfigSelection);
  const selectedBlueprint = configSelections[title];

  const handlePartSelected = (partName: string, blueprint: Blueprint) => {
    setConfigSelection(partName, blueprint);
    setIsModalOpen(false);
  };

  const handleOpenModal = () => {
    // Collect all tags from other selected blueprints
    const otherBlueprintTags = new Set<string>();
    Object.entries(configSelections).forEach(([key, bp]) => {
      if (key !== title) {
        bp.tags.forEach(tag => otherBlueprintTags.add(tag));
      }
    });
    setIsModalOpen(true);
  };

  const renderValue = (val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-gray-500">null</span>;
    }
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return (
          <ul className="list-disc pl-4">
            {val.map((item, index) => (
              <li key={index}>{renderValue(item)}</li>
            ))}
          </ul>
        );
      }
      return (
        <div className="pl-4">
          {Object.entries(val).map(([key, value]) => (
            <div key={key} className="mt-2">
              <strong>{key}:</strong> {renderValue(value)}
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(val)}</span>;
  };

  // Generate otherBlueprintTags from the blueprint store
  const otherBlueprintTags = new Set<string>();
  Object.entries(configSelections).forEach(([key, bp]) => {
    if (key !== title) {
      bp.tags.forEach(tag => otherBlueprintTags.add(tag));
    }
  });

  return (
    <div className="border rounded p-4 mb-4 flex-1 min-w-[200px] mr-4 relative group">
      <h3 className="text-lg font-semibold mb-2 cursor-help" title={JSON.stringify(value, null, 2)}>
        {title}
      </h3>
      {selectedBlueprint ? (
        <div className="mt-2">
          <div className="font-medium">{selectedBlueprint.blueprint_name}</div>
          {selectedBlueprint.images[0] && (
            <img 
              src={selectedBlueprint.images[0].image_url} 
              alt={selectedBlueprint.blueprint_name}
              className="mt-2 max-w-[200px] max-h-[200px] object-contain"
            />
          )}
          <button
            onClick={() => setConfigSelection(title, null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Clear Selection
          </button>
        </div>
      ) : (
        <div className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute left-0 top-full mt-2 w-full bg-white border rounded p-4 shadow-lg z-10">
          {renderValue(value)}
        </div>
      )}
      <button
        onClick={handleOpenModal}
        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        {selectedBlueprint ? 'Change Part' : 'Select Part'}
      </button>
      <PartSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        partName={title}
        configValues={value}
        onPartSelected={handlePartSelected}
        tagsFromOtherSelections={Array.from(otherBlueprintTags)}
      />
    </div>
  );
};

export default ConfigBox; 