'use client'

import { TagProvider } from '@/contexts/tag-context';
import TagContainer from '@/components/tag-container';
import BlueprintContainer from '@/components/blueprint-container';

export default function BlueprintsTab() {
  return (
    <TagProvider 
      autoload={false}
      search_models={false}
      search_blueprints={true}
    >
      <div className="flex flex-col md:flex-row gap-4 p-4">
        <div className="w-full md:w-1/3">
          <TagContainer />
        </div>
        <div className="w-full md:w-2/3">
          <BlueprintContainer />
        </div>
      </div>
    </TagProvider>
  );
} 