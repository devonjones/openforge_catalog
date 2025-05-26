'use client'

import React, { useState } from 'react';
import { Blueprint, ConfigTags } from '@/types';
import { useBlueprintContext } from '@/contexts/blueprint-context';
import PartSelectionModal from './part-selection-modal';
import { getOtherBlueprintTags } from '@/lib/tags';

interface ConfigBoxProps {
  title: string;
  value: ConfigTags;
}

const ConfigBox = ({ title, value }: ConfigBoxProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const blueprint = useBlueprintContext((state) => state.selectedBlueprint);
  const configSelections = useBlueprintContext((state) => state.configSelections);
  const setConfigSelection = useBlueprintContext((state) => state.setConfigSelection);
  const selectedBlueprint = configSelections[title];

  const handlePartSelected = (partName: string, blueprint: Blueprint) => {
    setConfigSelection(title, blueprint);
    setIsModalOpen(false);
  };

  const handleOpenModal = () => {
    const otherBlueprintTags = getOtherBlueprintTags(configSelections, title, blueprint);
    setIsModalOpen(true);
  };

  const renderTagRequirements = (tags: ConfigTags) => {
    const requirements = [];
    
    if (tags.require && tags.require.length > 0) {
      requirements.push(
        <div key="require" className="mt-2">
          <strong className="text-green-600">Required Tags:</strong>
          <ul className="list-disc pl-4">
            {tags.require.map((tag, index) => (
              <li key={index}>{tag.tag}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (tags.accept && tags.accept.length > 0) {
      requirements.push(
        <div key="accept" className="mt-2">
          <strong className="text-blue-600">Accepted Tags:</strong>
          <ul className="list-disc pl-4">
            {tags.accept.map((tag, index) => (
              <li key={index}>{tag.tag}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (tags.deny && tags.deny.length > 0) {
      requirements.push(
        <div key="deny" className="mt-2">
          <strong className="text-red-600">Denied Tags:</strong>
          <ul className="list-disc pl-4">
            {tags.deny.map((tag, index) => (
              <li key={index}>{tag.tag}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (tags.constrain && tags.constrain.length > 0) {
      requirements.push(
        <div key="constrain" className="mt-2">
          <strong className="text-yellow-600">Constrained Tags:</strong>
          <ul className="list-disc pl-4">
            {tags.constrain.map((tag, index) => (
              <li key={index}>{tag.tag}</li>
            ))}
          </ul>
        </div>
      );
    }

    return requirements;
  };

  const otherBlueprintTags = getOtherBlueprintTags(configSelections, title, blueprint);

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
          {renderTagRequirements(value)}
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