import React from 'react';
import useStore from '@/store/store';

const Filters = () => {
  const tagCounts = useStore((state) => state.tagCounts);
console.log('TC', tagCounts);
  return (
    <div>
      <h2>Filters</h2>
      <ul>
        {Object.entries(tagCounts).map(([tag, count]) => (
          <li key={tag}>
            {tag}: {count}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Filters;
