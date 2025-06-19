import { renderHook } from '@testing-library/react';
import { useUrlParameters } from '../use-url-parameters';
import { useBlueprintContext } from '@/contexts/blueprint-context';
import { useTagContext } from '@/contexts/tag-context';

// Mock the contexts
jest.mock('@/contexts/blueprint-context', () => ({
  useBlueprintContext: jest.fn(),
}));

jest.mock('@/contexts/tag-context', () => ({
  useTagContext: jest.fn(),
}));

// Mock URLSearchParams
const mockGet = jest.fn();
const mockGetAll = jest.fn();
const mockDelete = jest.fn();
const mockSet = jest.fn();
const mockHas = jest.fn();
const mockToString = jest.fn();

const mockURLSearchParams = jest.fn(() => ({
  get: mockGet,
  getAll: mockGetAll,
  delete: mockDelete,
  set: mockSet,
  has: mockHas,
  toString: mockToString,
}));

// Mock window.history.replaceState
const mockReplaceState = jest.fn();

// Mock URLSearchParams globally
global.URLSearchParams = mockURLSearchParams as unknown as typeof URLSearchParams;

describe('useUrlParameters', () => {
  const mockAddTag = jest.fn();
  const mockSetSearchTerm = jest.fn();
  const mockSetSelectedBlueprint = jest.fn();
  const mockSelectedTags: string[] = [];
  const mockBlueprints = [
    { id: 'blueprint123', blueprint_name: 'Test Blueprint' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(null);
    mockGetAll.mockReturnValue([]);
    mockToString.mockReturnValue('');
    mockHas.mockReturnValue(false);
    
    // Mock window.history.replaceState
    window.history.replaceState = mockReplaceState;
    
    // Default context mocks
    (useBlueprintContext as jest.Mock).mockReturnValue(mockSetSelectedBlueprint);
    (useTagContext as jest.Mock).mockImplementation((selector) => {
      const mockState = {
        blueprints: mockBlueprints,
        selectedTags: mockSelectedTags,
        addTag: mockAddTag,
        setSearchTerm: mockSetSearchTerm,
        autoload: true,
      };
      return selector(mockState);
    });
  });

  it('processes tag parameters from URL', () => {
    mockGetAll.mockReturnValue(['tag1', 'tag2']);
    mockGet.mockReturnValue(null);

    renderHook(() => useUrlParameters());

    expect(mockAddTag).toHaveBeenCalledWith('tag1');
    expect(mockAddTag).toHaveBeenCalledWith('tag2');
  });

  it('processes search parameter from URL', () => {
    mockGet.mockReturnValue('test search');
    mockGetAll.mockReturnValue([]);

    renderHook(() => useUrlParameters());

    expect(mockSetSearchTerm).toHaveBeenCalledWith('test search');
  });

  it('processes blueprint_id parameter from URL', () => {
    mockGet.mockReturnValue('blueprint123');
    mockGetAll.mockReturnValue([]);

    renderHook(() => useUrlParameters());

    expect(mockSetSelectedBlueprint).toHaveBeenCalledWith(mockBlueprints[0]);
  });

  it('does not add tags that already exist', () => {
    const existingTags = ['tag1', 'tag2'];
    mockGetAll.mockReturnValue(['tag1', 'tag3']);
    mockGet.mockReturnValue(null);

    (useTagContext as jest.Mock).mockImplementation((selector) => {
      const mockState = {
        blueprints: mockBlueprints,
        selectedTags: existingTags,
        addTag: mockAddTag,
        setSearchTerm: mockSetSearchTerm,
        autoload: true,
      };
      return selector(mockState);
    });

    renderHook(() => useUrlParameters());

    expect(mockAddTag).toHaveBeenCalledWith('tag3');
    expect(mockAddTag).not.toHaveBeenCalledWith('tag1');
  });

  it('cleans up URL parameters after processing', () => {
    mockGetAll.mockReturnValue(['tag1']);
    mockGet.mockReturnValue('test search');

    renderHook(() => useUrlParameters());

    expect(mockReplaceState).toHaveBeenCalled();
  });

  it('returns hasSetTagState ref', () => {
    const { result } = renderHook(() => useUrlParameters());

    expect(result.current.hasSetTagState).toBeDefined();
    expect(result.current.hasSetTagState.current).toBe(false);
  });

  it('does nothing when autoload is false', () => {
    (useTagContext as jest.Mock).mockImplementation((selector) => {
      const mockState = {
        blueprints: mockBlueprints,
        selectedTags: mockSelectedTags,
        addTag: mockAddTag,
        setSearchTerm: mockSetSearchTerm,
        autoload: false,
      };
      return selector(mockState);
    });

    renderHook(() => useUrlParameters());

    expect(mockAddTag).not.toHaveBeenCalled();
    expect(mockSetSearchTerm).not.toHaveBeenCalled();
    expect(mockSetSelectedBlueprint).not.toHaveBeenCalled();
  });
}); 