import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ResultsContainer from '../results-container';
import { useBlueprintContext } from '@/contexts/blueprint-context';
import { useTagContext } from '@/contexts/tag-context';

jest.mock('@/contexts/blueprint-context', () => ({
  useBlueprintContext: jest.fn(),
}));
jest.mock('@/contexts/tag-context', () => ({
  useTagContext: jest.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Save original location
const originalLocation = window.location;

describe('ResultsContainer', () => {
  const mockSetSelectedBlueprint = jest.fn();
  const mockClearTags = jest.fn();
  const mockRemoveTag = jest.fn();
  const mockAddTag = jest.fn();
  const mockFetchBlueprints = jest.fn();
  const mockSetTagState = jest.fn();
  const mockSetSearchTerm = jest.fn();

  const blueprints = [
    { id: '1', blueprint_name: 'BP1' },
    { id: '2', blueprint_name: 'BP2' },
  ];
  const paging = { total_count: 2, start_count: 0, next_token: 'n', previous_token: 'p' };

  beforeEach(() => {
    (useBlueprintContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        setSelectedBlueprint: mockSetSelectedBlueprint,
        selectedBlueprint: null,
      })
    );
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging,
        selectedTags: ['foo', 'bar'],
        denyTags: ['baz'],
        searchTerm: 'search',
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders blueprints and selected/denied tags', () => {
    render(<ResultsContainer />);
    expect(screen.getByText('Blueprints')).toBeInTheDocument();
    expect(screen.getByText('foo')).toBeInTheDocument();
    expect(screen.getByText('bar')).toBeInTheDocument();
    expect(screen.getByText('baz')).toBeInTheDocument();
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText('BP1')).toBeInTheDocument();
    expect(screen.getByText('BP2')).toBeInTheDocument();
    const totalCountDiv = screen.getByText((content, element) =>
      element?.className === 'totalCount'
    );
    expect(totalCountDiv).toBeInTheDocument();
    expect((totalCountDiv.textContent || '').replace(/\s+/g, ' ')).toContain('1 - 2 of 2 that match your tags');
  });

  it('removes tag when clicking - button', () => {
    render(<ResultsContainer />);
    const fooButton = screen.getAllByRole('button').find(btn => btn.parentElement?.textContent?.includes('foo'));
    if (fooButton) fireEvent.click(fooButton);
    expect(mockRemoveTag).toHaveBeenCalled();
  });

  it('removes search term when clicking - button', () => {
    render(<ResultsContainer />);
    const searchButton = screen.getAllByRole('button').find(btn => btn.parentElement?.textContent?.includes('search'));
    if (searchButton) fireEvent.click(searchButton);
    expect(mockSetSearchTerm).toHaveBeenCalledWith(null);
  });

  it('calls clearTags and setSelectedBlueprint(null) on clear', () => {
    render(<ResultsContainer />);
    fireEvent.click(screen.getByText('clear'));
    expect(mockClearTags).toHaveBeenCalled();
    expect(mockSetSelectedBlueprint).toHaveBeenCalledWith(null);
  });

  it('calls setSelectedBlueprint when blueprint is clicked', () => {
    render(<ResultsContainer />);
    fireEvent.click(screen.getByText('BP1'));
    expect(mockSetSelectedBlueprint).toHaveBeenCalledWith(blueprints[0]);
  });

  it('calls fetchBlueprints for pagination', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging: { total_count: 10, start_count: 2, next_token: 'n', previous_token: 'p' },
        selectedTags: ['foo', 'bar'],
        denyTags: ['baz'],
        searchTerm: 'search',
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    fireEvent.click(screen.getByText('Next Page'));
    expect(mockFetchBlueprints).toHaveBeenCalledWith({ next: 'n' });
    fireEvent.click(screen.getByText('Previous Page'));
    expect(mockFetchBlueprints).toHaveBeenCalledWith({ previous: 'p' });
  });

  it('shows deeplink and copy button', () => {
    render(<ResultsContainer />);
    expect(screen.getByText('deeplink')).toBeInTheDocument();
    expect(screen.getByTitle('Copy url to clipboard')).toBeInTheDocument();
  });

  it('handles isTagRemovable for tags from other selections', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging,
        selectedTags: ['non-removable'],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer tagsFromOtherSelections={['non-removable']} />);
    const tagNodes = screen.getAllByText('non-removable');
    tagNodes.forEach(tagNode => {
      const removeButton = tagNode.parentElement?.querySelector('button');
      expect(removeButton).not.toBeInTheDocument();
    });
  });

  it('handles isTagRemovable for config require tags', () => {
    const configValues = {
      require: {
        part1: { tag: 'config-required' }
      }
    };
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging,
        selectedTags: ['config-required'],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer configValues={configValues} />);
    const tagNodes = screen.getAllByText('config-required');
    tagNodes.forEach(tagNode => {
      const removeButton = tagNode.parentElement?.querySelector('button');
      expect(removeButton).not.toBeInTheDocument();
    });
  });

  it('handles isTagRemovable for config deny tags', () => {
    const configValues = {
      deny: {
        part1: { tag: 'config-denied' }
      }
    };
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging,
        selectedTags: ['some-tag'],
        denyTags: ['config-denied'],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer configValues={configValues} />);
    const denyTagElement = screen.getByText('config-denied');
    const removeButton = denyTagElement.parentElement?.querySelector('button');
    expect(removeButton).not.toBeInTheDocument();
  });

  it('handles pagination with no next token', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging: { total_count: 2, start_count: 0, previous_token: 'p' },
        selectedTags: [],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    const previousButton = screen.queryByText('Previous Page');
    const nextButton = screen.queryByText('Next Page');
    expect(previousButton).not.toBeInTheDocument();
    expect(nextButton).not.toBeInTheDocument();
  });

  it('handles only selected tags without search term', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging,
        selectedTags: ['tag1', 'tag2'],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    const selectedTagsElements = screen.getAllByText((content, element) => 
      element?.textContent?.includes('Selected Tags') || false
    );
    expect(selectedTagsElements.length).toBeGreaterThan(0);
    expect(screen.queryByText('Search')).not.toBeInTheDocument();
  });

  it('handles selected blueprint highlighting', () => {
    (useBlueprintContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        setSelectedBlueprint: mockSetSelectedBlueprint,
        selectedBlueprint: { id: '1', blueprint_name: 'BP1' },
      })
    );
    render(<ResultsContainer />);
    const selectedItem = screen.getByText('BP1').closest('li');
    expect(selectedItem).toHaveClass('selected');
  });

  it('handles empty blueprints list', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints: [],
        paging: { total_count: 0, start_count: 0 },
        selectedTags: [],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    const totalCountDiv = screen.getByText((content, element) =>
      element?.className === 'totalCount'
    );
    expect(totalCountDiv.textContent).toContain('1 - 0 of 0');
  });

  it('handles pagination with no previous token', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging: { total_count: 10, start_count: 0, next_token: 'n' },
        selectedTags: [],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    expect(screen.queryByText('Previous Page')).not.toBeInTheDocument();
    expect(screen.getByText('Next Page')).toBeInTheDocument();
  });

  it('handles pagination when startCount is 1', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging: { total_count: 10, start_count: 0, previous_token: 'p', next_token: 'n' },
        selectedTags: [],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    expect(screen.queryByText('Previous Page')).not.toBeInTheDocument();
  });

  it('handles pagination when endCount equals total_count', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints: [{ id: '1', blueprint_name: 'BP1' }],
        paging: { total_count: 1, start_count: 0, previous_token: 'p', next_token: 'n' },
        selectedTags: [],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    expect(screen.queryByText('Next Page')).not.toBeInTheDocument();
  });

  it('handles configValues with no tags section', () => {
    const configValues = {};
    render(<ResultsContainer configValues={configValues} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: [],
      deny: []
    });
  });

  it('handles configValues with empty require section', () => {
    const configValues = { require: {} };
    render(<ResultsContainer configValues={configValues} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: [],
      deny: []
    });
  });

  it('handles configValues with empty deny section', () => {
    const configValues = { deny: {} };
    render(<ResultsContainer configValues={configValues} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: [],
      deny: []
    });
  });

  it('handles configValues with require section without tag property', () => {
    const configValues = {
      require: {
        part1: { otherProp: 'value' }
      }
    };
    render(<ResultsContainer configValues={configValues} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: [],
      deny: []
    });
  });

  it('handles configValues with deny section without tag property', () => {
    const configValues = {
      deny: {
        part1: { otherProp: 'value' }
      }
    };
    render(<ResultsContainer configValues={configValues} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: [],
      deny: []
    });
  });

  it('handles constrain section without tag property', () => {
    const configValues = {
      constrain: [
        { otherProp: 'value' }
      ]
    };
    render(<ResultsContainer configValues={configValues} tagsFromOtherSelections={['test']} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: [],
      deny: []
    });
  });

  it('handles constrain section with tag but no matching tagsFromOtherSelections', () => {
    const configValues = {
      constrain: [
        { tag: 'base' }
      ]
    };
    render(<ResultsContainer configValues={configValues} tagsFromOtherSelections={['other']} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: [],
      deny: []
    });
  });

  it('handles constrain section with empty filterTags', () => {
    const configValues = {
      constrain: [
        { tag: 'base' }
      ]
    };
    render(<ResultsContainer configValues={configValues} tagsFromOtherSelections={['base-1']} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: ['base-1'],
      deny: []
    });
  });

  it('handles constrain section with exact filter match', () => {
    const configValues = {
      constrain: [
        { tag: 'base', filter: 'base-1' }
      ]
    };
    render(<ResultsContainer configValues={configValues} tagsFromOtherSelections={['base-1', 'base-2']} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: ['base-2'],
      deny: []
    });
  });

  it('handles constrain section with prefix filter match', () => {
    const configValues = {
      constrain: [
        { tag: 'base', filter: 'base' }
      ]
    };
    render(<ResultsContainer configValues={configValues} tagsFromOtherSelections={['base-1', 'base-2']} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: [],
      deny: []
    });
  });

  it('handles constrain section with tag prefix match', () => {
    const configValues = {
      constrain: [
        { tag: 'base', filter: 'base-1' }
      ]
    };
    render(<ResultsContainer configValues={configValues} tagsFromOtherSelections={['base-1', 'base-1-extra']} />);
    expect(mockSetTagState).toHaveBeenCalledWith({
      require: [],
      deny: []
    });
  });

  it('handles no selected tags and no search term', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging,
        selectedTags: [],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    expect(screen.queryByText('Selected Tags')).not.toBeInTheDocument();
    expect(screen.queryByText('Search')).not.toBeInTheDocument();
  });

  it('handles only search term without selected tags', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging,
        selectedTags: [],
        denyTags: [],
        searchTerm: 'searchonly',
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.queryByText('Selected Tags')).not.toBeInTheDocument();
  });

  it('handles configValues with clear link hidden', () => {
    const configValues = { someConfig: true };
    render(<ResultsContainer configValues={configValues} />);
    expect(screen.queryByText('clear')).not.toBeInTheDocument();
  });

  it('handles duplicate selected tags', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging,
        selectedTags: ['tag1', 'tag1', 'tag2'],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    const tag1Elements = screen.getAllByText('tag1');
    expect(tag1Elements).toHaveLength(1);
  });

  it('handles null paging values', () => {
    (useTagContext as jest.Mock).mockImplementation((selector: any) =>
      selector({
        blueprints,
        paging: null,
        selectedTags: [],
        denyTags: [],
        searchTerm: null,
        removeTag: mockRemoveTag,
        addTag: mockAddTag,
        clearTags: mockClearTags,
        fetchBlueprints: mockFetchBlueprints,
        setTagState: mockSetTagState,
        autoload: false,
        setSearchTerm: mockSetSearchTerm,
      })
    );
    render(<ResultsContainer />);
    const totalCountDiv = screen.getByText((content, element) =>
      element?.className === 'totalCount'
    );
    expect(totalCountDiv.textContent).toContain('1 - 2 of');
  });
}); 