# Phase 2: Documentation System Implementation Plan

## Overview

This document outlines the implementation strategy for Phase 2 of the OpenForge Catalog system, focusing on the documentation system with support for blueprint documentation, tag documentation, changelog management, and image handling.

## Phase 2: Documentation System Implementation

### Priority: HIGH  
### Timeline: 2-3 weeks
### Dependencies: Phase 1 complete

## Database Schema Updates

### 2.1 Documentation Type Enum Extension

**Extend documentation_type_enum to include new types:**
```sql
-- Update the existing enum to include 'instructions'
ALTER TYPE documentation_type_enum ADD VALUE 'instructions';
```

### 2.2 Image Type Support

**Add image_type to images table:**
```sql
-- Create image_type_enum
CREATE TYPE image_type_enum AS ENUM ('thumbnail', 'documentation');

-- Add image_type column to images table
ALTER TABLE images ADD COLUMN image_type image_type_enum NOT NULL DEFAULT 'thumbnail';

-- Create index for performance
CREATE INDEX idx_images_type ON images(image_type);
```

### 2.3 Tags Documentation Table

**Create tags_documentation table following blueprint_documentation pattern:**
```sql
-- New tags_documentation table
CREATE TABLE tags_documentation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tag text[] NOT NULL, -- Full tag array (e.g., ["texture", "dungeon_stone"])
    document text NOT NULL,
    document_type documentation_type_enum NOT NULL DEFAULT 'instructions',
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_tags_documentation_tag ON tags_documentation USING GIN(tag);
CREATE INDEX idx_tags_documentation_type ON tags_documentation(document_type);

-- Trigger for automatic updated_at timestamp updates
CREATE TRIGGER update_tags_documentation_updated_at 
BEFORE UPDATE ON tags_documentation
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2.4 Session Management Table

**Create sessions table for admin authentication:**
```sql
-- Sessions table for admin authentication
CREATE TABLE admin_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token text NOT NULL UNIQUE,
    api_key_hash text NOT NULL, -- Hashed version of API key for security
    created_at timestamp DEFAULT now(),
    expires_at timestamp NOT NULL,
    last_used_at timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Trigger function to update last_used_at column
CREATE OR REPLACE FUNCTION update_last_used_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic last_used_at updates
CREATE TRIGGER update_admin_sessions_last_used 
BEFORE UPDATE ON admin_sessions
FOR EACH ROW EXECUTE FUNCTION update_last_used_at_column();
```

## API Implementation

### 2.5 Blueprint Documentation API

**Core endpoints for blueprint documentation:**
```typescript
// Get all documentation for a blueprint
GET /api/blueprints/{blueprint_id}/documentation
Response: {
  documentation: BlueprintDocumentation[]
}

// Get specific documentation entry
GET /api/blueprints/{blueprint_id}/documentation/{doc_id}
Response: {
  documentation: BlueprintDocumentation
}

// Create documentation for blueprint (requires API key)
POST /api/blueprints/{blueprint_id}/documentation
Body: { 
  document: string,
  document_type: 'changelog' | 'instructions'
}
Response: {
  documentation: BlueprintDocumentation
}

// Update specific documentation entry (requires API key)
PUT /api/blueprints/{blueprint_id}/documentation/{doc_id}
Body: { 
  document: string,
  document_type: 'changelog' | 'instructions'
}
Response: {
  documentation: BlueprintDocumentation
}

// Delete specific documentation entry (requires API key)
DELETE /api/blueprints/{blueprint_id}/documentation/{doc_id}
Response: { success: boolean }
```

### 2.6 Tag Documentation API

**Core endpoints for tag documentation:**
```typescript
// Get documentation for a specific tag
GET /api/tags/texture/dungeon_stone/documentation
Response: {
  documentation: TagDocumentation[]
}

// Get specific tag documentation entry
GET /api/tags/texture/dungeon_stone/documentation/{doc_id}
Response: {
  documentation: TagDocumentation
}

// Create documentation for tag (requires API key)
POST /api/tags/texture/dungeon_stone/documentation
Body: { 
  document: string,
  document_type: 'instructions'
}
Response: {
  documentation: TagDocumentation
}

// Update specific tag documentation entry (requires API key)
PUT /api/tags/texture/dungeon_stone/documentation/{doc_id}
Body: { 
  document: string,
  document_type: 'instructions'
}
Response: {
  documentation: TagDocumentation
}

// Delete specific tag documentation entry (requires API key)
DELETE /api/tags/texture/dungeon_stone/documentation/{doc_id}
Response: { success: boolean }
```

### 2.7 Image Management API

**Core endpoints for image management:**
```typescript
// Get all documentation images (requires API key)
GET /api/admin/images?type=documentation
Response: {
  images: Image[]
}

// Upload new documentation image (requires API key)
POST /api/admin/images
Body: FormData with file
Response: {
  image: Image
}

// Update image name (requires API key)
PUT /api/admin/images/{image_id}
Body: { image_name: string }
Response: {
  image: Image
}

// Delete image (requires API key)
DELETE /api/admin/images/{image_id}
Response: { success: boolean }
```

### 2.8 Session Management API

**Core endpoints for session management:**
```typescript
// Create admin session
POST /api/admin/sessions
Body: { api_key: string }
Response: {
  session_token: string,
  expires_at: string
}

// Validate session
GET /api/admin/sessions/validate
Headers: { Authorization: Bearer <session_token> }
Response: {
  valid: boolean,
  expires_at: string
}

// Delete session (logout)
DELETE /api/admin/sessions
Headers: { Authorization: Bearer <session_token> }
Response: { success: boolean }
```

### 2.9 Changelog History API

**Endpoint for retrieving changelog history:**
```typescript
// Get changelog history for blueprint (recursive successor search)
GET /api/blueprints/{blueprint_id}/changelog-history?limit=10&offset=0
Response: {
  changelogs: {
    blueprint_id: string,
    blueprint_name: string,
    changelog: string,
    created_at: string,
    version_info: {
      deprecated: boolean,
      successor_id?: string
    }
  }[],
  has_more: boolean,
  total_count: number
}
```

## Backend Implementation

### 2.10 Database Schema Migration

**Create migration script (version_09.py):**
```python
@SchemaVersionDecorator(9)
class SchemaVersion9(SchemaBase):
    def up_impl(self, curs: cursor):
        self.extend_documentation_type_enum(curs)
        self.add_image_type_support(curs)
        self.create_tags_documentation_table(curs)
        self.create_admin_sessions_table(curs)
        self.migrate_existing_images(curs)

    def down_impl(self, curs: cursor):
        self.drop_admin_sessions_table(curs)
        self.drop_tags_documentation_table(curs)
        self.remove_image_type_support(curs)
        self.remove_documentation_type_extension(curs)
```

### 2.11 SQL Functions

**Create SQL functions for documentation operations:**
```sql
-- Function to get changelog history recursively
CREATE OR REPLACE FUNCTION get_blueprint_changelog_history(
    blueprint_id uuid,
    max_depth integer DEFAULT 10
) RETURNS TABLE (
    blueprint_id uuid,
    blueprint_name text,
    changelog text,
    created_at timestamp,
    depth integer
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE changelog_chain AS (
        -- Start with the current blueprint
        SELECT 
            b.id,
            b.blueprint_name,
            b.successor_id,
            bd.document,
            bd.created_at,
            0 as depth
        FROM blueprints b
        LEFT JOIN blueprint_documentation bd ON b.id = bd.blueprint_id 
            AND bd.document_type = 'changelog'
        WHERE b.id = $1
        
        UNION ALL
        
        -- Follow successor chain
        SELECT 
            b.id,
            b.blueprint_name,
            b.successor_id,
            bd.document,
            bd.created_at,
            cc.depth + 1
        FROM blueprints b
        LEFT JOIN blueprint_documentation bd ON b.id = bd.blueprint_id 
            AND bd.document_type = 'changelog'
        INNER JOIN changelog_chain cc ON b.id = cc.successor_id
        WHERE cc.depth < $2 AND cc.successor_id IS NOT NULL
    )
    SELECT 
        cc.id, 
        cc.blueprint_name, 
        cc.document, 
        cc.created_at, 
        cc.depth 
    FROM changelog_chain cc
    ORDER BY depth ASC, created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

### 2.12 Backend Services

**Flask routing with custom tag converter:**
```python
from werkzeug.routing import BaseConverter

# Custom converter for tag arrays
class TagConverter(BaseConverter):
    def to_python(self, value):
        # Convert "texture/dungeon_stone" to ["texture", "dungeon_stone"]
        return value.split('/')
    
    def to_url(self, value):
        # Convert ["texture", "dungeon_stone"] to "texture/dungeon_stone"
        return '/'.join(value)

# Register the converter
app.url_map.converters['tag'] = TagConverter

# Route definitions
@app.route('/api/tags/<tag:tag_array>/documentation')
def get_tag_documentation(tag_array):
    # tag_array is already ["texture", "dungeon_stone"]
    pipe_delimited_tag = '|'.join(tag_array)
    return get_tag_documentation_service(pipe_delimited_tag)

@app.route('/api/tags/<tag:tag_array>/documentation/<doc_id>')
def get_tag_documentation_entry(tag_array, doc_id):
    pipe_delimited_tag = '|'.join(tag_array)
    return get_tag_documentation_entry_service(pipe_delimited_tag, doc_id)

@app.route('/api/tags/<tag:tag_array>/documentation', methods=['POST'])
def create_tag_documentation(tag_array):
    pipe_delimited_tag = '|'.join(tag_array)
    return create_tag_documentation_service(pipe_delimited_tag, request.json)

@app.route('/api/tags/<tag:tag_array>/documentation/<doc_id>', methods=['PUT'])
def update_tag_documentation(tag_array, doc_id):
    pipe_delimited_tag = '|'.join(tag_array)
    return update_tag_documentation_service(pipe_delimited_tag, doc_id, request.json)

@app.route('/api/tags/<tag:tag_array>/documentation/<doc_id>', methods=['DELETE'])
def delete_tag_documentation(tag_array, doc_id):
    pipe_delimited_tag = '|'.join(tag_array)
    return delete_tag_documentation_service(pipe_delimited_tag, doc_id)
```

**Create documentation service classes:**
```python
class DocumentationService:
    def get_blueprint_documentation(self, blueprint_id: str) -> List[Dict]:
        """Get all documentation for a blueprint."""
        
    def get_tag_documentation(self, tag_array: List[str]) -> List[Dict]:
        """Get documentation for a specific tag."""
        
    def create_blueprint_documentation(self, blueprint_id: str, data: Dict) -> Dict:
        """Create new documentation for a blueprint."""
        
    def create_tag_documentation(self, tag_array: List[str], data: Dict) -> Dict:
        """Create new documentation for a tag."""
        
    def get_changelog_history(self, blueprint_id: str, limit: int = 10, offset: int = 0) -> Dict:
        """Get recursive changelog history for a blueprint."""

class ImageService:
    def upload_documentation_image(self, file_data: bytes, filename: str) -> Dict:
        """Upload new documentation image to S3."""
        
    def get_documentation_images(self) -> List[Dict]:
        """Get all documentation images."""
        
    def update_image_name(self, image_id: str, new_name: str) -> Dict:
        """Update image name."""

class SessionService:
    def create_session(self, api_key: str) -> Dict:
        """Create new admin session."""
        
    def validate_session(self, session_token: str) -> bool:
        """Validate session token."""
        
    def delete_session(self, session_token: str) -> bool:
        """Delete session (logout)."""
```

## Frontend Implementation

### 2.13 Blueprint Detail Page Updates

**Add tabbed interface to blueprint detail page:**
```typescript
// Blueprint detail page with tabs
interface BlueprintDetailTabs {
  info: BlueprintInfoTab;        // Existing blueprint information
  documentation?: DocumentationTab; // Blueprint + tag documentation
  changelog?: ChangelogTab;      // Changelog history
}

// Documentation tab component
const DocumentationTab = ({ blueprint }: { blueprint: Blueprint }) => {
  const [blueprintDocs, setBlueprintDocs] = useState<Documentation[]>([]);
  const [tagDocs, setTagDocs] = useState<Documentation[]>([]);
  
  // Load blueprint documentation
  // Load documentation from all blueprint tags
  // Render combined documentation with markdown support
};

// Changelog tab component
const ChangelogTab = ({ blueprint }: { blueprint: Blueprint }) => {
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  
  // Load changelog history with pagination
  // Support "Load More" functionality
};
```

### 2.14 Admin Interface

**Create admin interface at `/admin`:**
```typescript
// Admin layout with session management
const AdminLayout = ({ children }: { children: ReactNode }) => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  
  // Session management
  // API key input and validation
  // Protected route wrapper
};

// Admin navigation
const AdminNavigation = () => {
  return (
    <nav>
      <Link to="/admin/blueprints">Blueprint Documentation</Link>
      <Link to="/admin/tags">Tag Documentation</Link>
      <Link to="/admin/images">Image Management</Link>
      <Link to="/admin/deprecated">Deprecated Objects</Link>
    </nav>
  );
};
```

### 2.15 Documentation Editor

**Create documentation editor component:**
```typescript
const DocumentationEditor = ({ 
  blueprintId, 
  tagArray, 
  documentType 
}: DocumentationEditorProps) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<Image[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  
  // Markdown editor with image support
  // Image picker modal
  // Save/update functionality
};

const ImagePicker = ({ onSelect }: { onSelect: (image: Image) => void }) => {
  const [images, setImages] = useState<Image[]>([]);
  const [filter, setFilter] = useState('');
  
  // Load documentation images
  // Filter by name
  // Drag and drop upload
};
```

### 2.16 Deprecated Objects Interface

**Create deprecated objects management page:**
```typescript
const DeprecatedObjectsPage = () => {
  const [deprecatedObjects, setDeprecatedObjects] = useState<DeprecatedObject[]>([]);
  
  // Load all deprecated objects with successor_id
  // Display in table format
  // Link to changelog creation
};

const ChangelogCreationPage = ({ 
  deprecatedBlueprint, 
  successorBlueprint 
}: ChangelogCreationProps) => {
  const [changelog, setChangelog] = useState('');
  
  // Show both blueprints side by side
  // Navigation through successor chain
  // Changelog creation form
};
```

## Implementation Steps

### Step 1: Database Schema Updates (Week 1)
1. Create migration script (version_09.py)
2. Extend documentation_type_enum
3. Add image_type support to images table
4. Create tags_documentation table
5. Create admin_sessions table
6. Test migration with existing data

### Step 2: Backend API Implementation (Week 1-2)
1. Implement documentation service classes
2. Create blueprint documentation API endpoints
3. Create tag documentation API endpoints
4. Create image management API endpoints
5. Create session management API endpoints
6. Implement changelog history API
7. Add API key authentication middleware

### Step 3: Frontend Admin Interface (Week 2)
1. Create admin layout with session management
2. Implement API key authentication flow
3. Create documentation editor component
4. Create image management interface
5. Create deprecated objects interface
6. Add markdown rendering with image support

### Step 4: Frontend Integration (Week 2-3)
1. Update blueprint detail page with tabbed interface
2. Implement documentation tab with blueprint + tag docs
3. Implement changelog tab with pagination
4. Add image picker to documentation editor
5. Test end-to-end functionality

### Step 5: Testing and Polish (Week 3)
1. Test all API endpoints
2. Test admin authentication flow
3. Test documentation creation and editing
4. Test image upload and management
5. Test changelog history display
6. Performance testing and optimization

## Success Criteria

### Technical Requirements
- ✅ Documentation system supports both blueprint and tag documentation
- ✅ Markdown rendering with image support works correctly
- ✅ Changelog history displays recursively through successor chain
- ✅ Admin authentication with session management functions properly
- ✅ Image upload and management works seamlessly
- ✅ API endpoints properly enforce authentication requirements

### User Experience Requirements
- ✅ Blueprint detail pages show documentation and changelog in organized tabs
- ✅ Admin interface provides intuitive documentation editing experience
- ✅ Image picker allows easy selection of documentation images
- ✅ Deprecated objects interface enables efficient changelog creation
- ✅ Session management provides secure admin access

### Integration Requirements
- ✅ Documentation system integrates with existing blueprint and tag systems
- ✅ Image system extends existing image functionality
- ✅ Fixture loader properly sets image types for new images
- ✅ API follows existing patterns and conventions
- ✅ Frontend integrates seamlessly with existing blueprint detail pages

## Risk Management

### Potential Risks
1. **Markdown Security**: XSS vulnerabilities in markdown rendering
   - **Mitigation**: Use secure markdown parser with sanitization
   
2. **Image Storage**: S3 upload failures or storage issues
   - **Mitigation**: Implement retry logic and error handling
   
3. **Session Security**: Session token vulnerabilities
   - **Mitigation**: Use secure token generation and proper expiration
   
4. **Performance**: Large changelog history causing slow page loads
   - **Mitigation**: Implement proper pagination and caching

### Rollback Plan
- Database migrations can be rolled back using existing down_impl methods
- Frontend changes can be reverted to previous version
- API endpoints can be disabled via feature flags if needed

## Future Enhancements (Phase 3+)

### Documentation Search
- Full-text search across documentation content
- Tag-based documentation filtering

### Documentation Templates
- Predefined templates for common documentation types
- Template library for consistent documentation

### Documentation Analytics
- Track documentation usage and effectiveness
- Identify gaps in documentation coverage

### Advanced Image Management
- Image optimization and resizing
- Image metadata management
- Bulk image operations

This implementation plan provides a comprehensive roadmap for Phase 2, ensuring the documentation system meets all requirements while maintaining system stability and user experience quality. 