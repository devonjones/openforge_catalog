from werkzeug.routing import BaseConverter
from openforge.db.sql.tag_utils import tag_to_array, array_to_tag


class TagConverter(BaseConverter):
    """Custom converter for tag arrays.
    
    Converts URL paths like "texture/dungeon_stone" to arrays like ["texture", "dungeon_stone"].
    Uses existing tag utilities for consistency.
    """
    
    def to_python(self, value):
        """Convert URL path to tag array."""
        # Convert "texture/dungeon_stone" to ["texture", "dungeon_stone"]
        # This converts URL-friendly format to tag array format
        return value.split('/')
    
    def to_url(self, value):
        """Convert tag array to URL path."""
        # Convert ["texture", "dungeon_stone"] to "texture/dungeon_stone"
        # This converts tag array format to URL-friendly format
        if isinstance(value, list):
            return '/'.join(value)
        # Handle case where value might be a pipe-delimited string
        tag_array = tag_to_array(value)
        return '/'.join(tag_array) 