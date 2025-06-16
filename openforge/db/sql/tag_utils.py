from typing import Union, List

def tag_to_array(tag: Union[str, List[str]]) -> List[str]:
    """Convert a tag string or array to a tag array.
    
    Args:
        tag: Either a pipe-delimited string (e.g. "foo|bar") or a list of strings
        
    Returns:
        List of tag components
    """
    if isinstance(tag, list):
        return tag
    if isinstance(tag, str):
        return tag.split("|")
    return list(tag)

def array_to_tag(tag_array: List[str]) -> str:
    """Convert a tag array to a pipe-delimited string.
    
    Args:
        tag_array: List of tag components
        
    Returns:
        Pipe-delimited string
    """
    if isinstance(tag_array, str):
        return tag_array
    return "|".join(tag_array)

def tag_to_string(tag: Union[str, List[str]]) -> str:
    """Convert a tag array or string to a pipe-delimited string.
    
    Args:
        tag: Either a pipe-delimited string or a list of strings
        
    Returns:
        Pipe-delimited string
    """
    if isinstance(tag, list):
        return array_to_tag(tag)
    return tag

def convert_tag_dict(tag_dict):
    if tag_dict is None:
        return None
    if 'tag' in tag_dict and isinstance(tag_dict['tag'], list):
        tag_dict['tag'] = array_to_tag(tag_dict['tag'])
    return tag_dict 