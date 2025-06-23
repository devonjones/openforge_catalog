# OpenForge Catalog Implementation Plan

## Overview

This document outlines the implementation strategy for the major enhancements to the OpenForge Catalog system, prioritized for sequential development to minimize risk and maintain system stability.

## Phase 1: Database Migration and Versioning Infrastructure

### Priority: CRITICAL
### Timeline: 2-3 weeks
### Dependencies: None

#### 1.1 Database Schema Updates

**Add new fields to blueprints table:**
```sql
ALTER TABLE blueprints ADD COLUMN consolidated_paths text[];
ALTER TABLE blueprints ADD COLUMN deprecated boolean DEFAULT false;
ALTER TABLE blueprints ADD COLUMN successor_id uuid;
ALTER TABLE blueprints ADD COLUMN predecessor_id uuid;
ALTER TABLE blueprints ADD COLUMN openscad_source text;
ALTER TABLE blueprints ADD COLUMN changelog text;

-- Indexes for performance
CREATE INDEX idx_blueprints_deprecated ON blueprints(deprecated);
CREATE INDEX idx_blueprints_successor ON blueprints(successor_id);
CREATE INDEX idx_blueprints_predecessor ON blueprints(predecessor_id);
CREATE INDEX idx_blueprints_md5 ON blueprints(file_md5);
```

**Create tag priorities table:**
```sql
CREATE TABLE tag_priorities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_category text NOT NULL,
    tag_value text NOT NULL,
    priority_score integer NOT NULL DEFAULT 0,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE INDEX idx_tag_priorities_category ON tag_priorities(tag_category);
CREATE INDEX idx_tag_priorities_score ON tag_priorities(priority_score DESC);
```

#### 1.2 Incremental Scanner Updates

**Modify dropbox_scanner to output comparison data:**
- Generate filename+MD5 pairs for comparison
- Track file paths for consolidation detection
- Export structured data for loader consumption

**Enhance fixtures loader:**
- Fetch existing blueprint filename+MD5 pairs from database
- Implement comparison logic:
  - Same filename+MD5: metadata-only updates
  - New MD5, existing filename: deprecation + new version creation
  - Missing filename, existing MD5: path consolidation
  - Missing MD5: mark as deprecated
  - New filename+MD5: flag for manual review

#### 1.3 CLI Administrative Tools

**Build review interface:**
- List files without successors vs new files
- Implement scoring algorithm:
  - Levenshtein distance for filenames
  - Path element overlap scoring
  - Tag similarity comparison
- Interactive CLI for confirming predecessor/successor relationships

**Duplicate detection tool:**
- Search for same filename, different MD5
- Generate reports for manual review
- CLI interface for batch operations

#### 1.4 Migration Strategy

**Phase 1a: Add fields without changing workflow**
- Deploy schema changes
- Populate consolidated_paths for existing files
- Test new fields with existing data

**Phase 1b: Switch to incremental loading**
- Deploy new scanner and loader logic
- Run first incremental load with careful monitoring
- Validate no data loss occurred

**Success Criteria:**
- Zero data loss during migration
- Incremental loads complete successfully
- Historical file relationships properly established
- CLI tools functional for edge case management

## Phase 2: Documentation System Implementation

### Priority: HIGH  
### Timeline: 2 weeks
### Dependencies: Phase 1 complete

#### 2.1 Database Schema for Documentation

**Update documentation table with types:**
```sql
ALTER TABLE documentation ADD COLUMN documentation_type text NOT NULL DEFAULT 'instruction';
ALTER TABLE documentation ADD COLUMN created_by uuid; -- user who created it
ALTER TABLE documentation ADD COLUMN updated_by uuid; -- user who last updated it

-- New table for tag-based documentation
CREATE TABLE tag_documentation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tag text[] NOT NULL,
    documentation_id uuid NOT NULL REFERENCES documentation(id),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Image namespace system for documentation
CREATE TABLE documentation_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    namespace text NOT NULL, -- e.g., 'blueprints', 'tags', 'changelogs'
    image_name text NOT NULL,
    image_id uuid NOT NULL REFERENCES images(id),
    created_at timestamp DEFAULT now(),
    UNIQUE(namespace, image_name)
);

CREATE INDEX idx_tag_documentation_tag ON tag_documentation USING gin(tag);
CREATE INDEX idx_documentation_type ON documentation(documentation_type);
CREATE INDEX idx_documentation_images_namespace ON documentation_images(namespace);
```

#### 2.2 Documentation Types and Structure

**Documentation types:**
- `instruction` - Blueprint assembly instructions
- `changelog` - File version change descriptions  
- `tag_guide` - Tag usage explanations
- `tutorial` - Feature tutorials and guides

**Markdown with image references:**
- Support standard markdown image syntax: `![alt text](image_name.jpg)`
- Image resolution via namespace lookup
- Automatic image availability validation

#### 2.3 Documentation API Implementation

**Core endpoints:**
```typescript
// CRUD for documentation
GET/POST/PUT/DELETE /api/documentation/{doc_id}

// Blueprint documentation (combined view)
GET /api/blueprints/{blueprint_id}/documentation
Response: {
  blueprint_docs: Documentation[],
  tag_docs: { [tag: string]: Documentation[] },
  rendered_html: string // server-side markdown rendering
}

// Tag documentation  
GET/POST /api/tags/{tag}/documentation
PUT/DELETE /api/tags/{tag}/documentation/{doc_id}

// Image namespace management
GET/POST /api/documentation/images/{namespace}
DELETE /api/documentation/images/{namespace}/{image_name}
```

#### 2.4 Frontend Documentation Interface

**Blueprint documentation display:**
- Combined view showing blueprint + tag documentation
- Markdown rendering with image support
- Collapsible sections for each tag's documentation
- Edit mode for authenticated admin users

**Admin documentation editor:**
- Markdown editor with live preview
- Image upload and namespace management
- Documentation type selection
- Tag association interface

#### 2.5 Initial Content Migration

**Test with blueprint documentation:**
- Create instruction documentation for ~20 existing blueprints
- Establish documentation patterns and templates
- Test image referencing system
- Validate combined rendering logic

**Success Criteria:**
- Documentation system handles markdown + images correctly
- Blueprint + tag documentation combines properly
- Admin interface allows efficient content creation
- System ready for changelog integration in later phases

## Phase 3: Tag Priority System and Default Population

### Priority: HIGH
### Timeline: 1-2 weeks  
### Dependencies: Phase 2 complete

#### 3.1 Priority System Implementation

**Populate tag_priorities table:**
```sql
-- Example priority data
INSERT INTO tag_priorities (tag_category, tag_value, priority_score) VALUES
('texture', 'dungeon_stone', 100),
('connection', 'openforge', 90),
('build', 'topless', 80),
('connection', 'magnetic', 70),
('connection', 'flex', 60);
```

#### 3.2 Default Population Logic

**Backend implementation:**
- Create service to resolve blueprint defaults based on priorities
- Implement constraint satisfaction with priority weighting
- Ensure all blueprint constraints are met by default selections

**API endpoint:**
```typescript
GET /api/blueprints/{id}/defaults
Response: {
  parts: {
    [partName]: {
      blueprint_id: string,
      tags: string[],
      confidence: number
    }
  }
}
```

#### 3.3 Frontend Integration

**Update blueprint composition UI:**
- Pre-populate part selections on blueprint load
- Maintain existing constraint validation
- Add visual indicators for default vs custom selections

**Success Criteria:**
- Blueprints load with working defaults 90%+ of the time
- Default selection respects all blueprint constraints
- User can still override defaults normally
- Performance impact minimal

## Phase 4: Component Swapping System

### Priority: HIGH
### Timeline: 2 weeks
### Dependencies: Phase 3 complete

#### 4.1 Backend API Development

**Component alternatives endpoint:**
```typescript
POST /api/blueprints/component-alternatives
Body: {
  blueprint_id: string,
  current_parts: { [partName]: string }, // blueprint IDs
  swap_tag: string // e.g., "texture|dungeon_stone"
}
Response: {
  alternatives: {
    [tagValue]: {
      available: boolean,
      affected_parts: string[], // part names that would change
      preview_parts: { [partName]: string } // new blueprint IDs
    }
  }
}
```

**Implementation details:**
- Query all parts with the target tag category
- Test constraint satisfaction for each alternative
- Return only valid swaps that maintain blueprint integrity

#### 4.2 Frontend Swap Interface

**UI Components:**
- Swap buttons next to major tag categories (texture, connection, etc.)
- Dropdown/modal showing available alternatives
- Preview of affected parts before confirming swap
- Batch update of all affected parts

**UX Flow:**
1. User clicks "Swap Texture" button
2. Modal shows available textures with part counts
3. User selects new texture
4. Preview shows which parts will change
5. User confirms, all applicable parts update

**Success Criteria:**
- Swap operations complete in <2 seconds
- All blueprint constraints maintained after swap
- Clear visual feedback about what will change
- Intuitive UI that doesn't overwhelm users

## Phase 5: Authentication System

### Priority: MEDIUM-HIGH
### Timeline: 2-3 weeks
### Dependencies: Phase 4 complete

#### 5.1 Database Schema for Users

```sql
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    role text NOT NULL DEFAULT 'user',
    patreon_tier text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE user_identities (
    provider text NOT NULL, -- 'patreon' or 'google'
    provider_id text NOT NULL, -- OAuth provider's user ID
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    PRIMARY KEY (provider, provider_id)
);

CREATE INDEX idx_user_identities_user_id ON user_identities(user_id);

#### 5.2 OAuth Integration

**Patreon OAuth:**
- Register application with Patreon
- Implement OAuth flow with tier detection
- Sync supporter list and tier levels
- Set up webhook for tier changes

**Google OAuth:**
- Configure Google OAuth application
- Implement standard OAuth 2.0 flow
- Handle account linking scenarios

#### 5.3 Session Management

**JWT-based sessions:**
- Implement secure token generation
- Store minimal user data in tokens
- Set appropriate expiration and refresh logic

#### 5.4 Role-Based Access Control

**Initial roles:**
- Admin: Full access to all features
- Patron: Enhanced features based on tier
- User: Standard read access

**Frontend integration:**
- Conditional feature rendering based on role
- Graceful degradation for unauthenticated users
- Clear messaging about patron benefits

**Success Criteria:**
- OAuth flows work reliably for both providers
- Patreon tier detection accurate and automatic
- Role-based features properly gated
- No degradation of anonymous user experience

## Phase 6: File History and Changelog Interface

### Priority: MEDIUM
### Timeline: 1-2 weeks  
### Dependencies: Phase 2 complete (documentation system)

#### 6.1 Changelog Integration with Documentation System

**Changelog as documentation type:**
- Use `documentation_type: 'changelog'` 
- Link changelogs to blueprint versions via blueprint_documentation
- Support markdown formatting with image references
- Namespace changelog images separately from instructions

**Enhanced blueprint schema:**
```sql
-- Remove simple changelog text field from Phase 1
ALTER TABLE blueprints DROP COLUMN IF EXISTS changelog;

-- Changelogs handled via existing documentation relationships
-- with documentation_type = 'changelog'
```

#### 6.2 Backend API Extensions

**History endpoints with documentation:**
```typescript
GET /api/blueprints/{blueprint_id}/history
Response: {
  versions: {
    id: string,
    created_at: string,
    changelog_docs: Documentation[], // type='changelog'
    file_size: number,
    deprecated: boolean,
    successor_id?: string,
    predecessor_id?: string
  }[]
}

// Create changelog for specific version
POST /api/blueprints/{blueprint_id}/changelog
Body: { 
  document: string, // markdown content
  documentation_name: string 
}
```

#### 6.3 Frontend History Interface

**Version history modal:**
- Timeline view of file versions
- Changelog entries for each version
- Download links for specific versions
- Visual diff indicators where possible

**Admin changelog interface:**
- List of files needing changelog entries
- Inline editing for changelog text
- Bulk operations for similar changes

#### 6.4 Search Filtering Updates

**Hide deprecated versions:**
- Update all search queries to filter deprecated=false by default
- Add admin option to include deprecated versions
- Maintain deep links to specific versions

**Success Criteria:**
- Users can easily access and understand file history
- Deprecated versions properly hidden from normal searches
- Admin workflow for changelog management efficient
- Historical data preserved and accessible

## Phase 7: OpenSCAD Customizer Integration

### Priority: MEDIUM
### Timeline: 1 week
### Dependencies: Phase 5 complete (for parameter passing)

#### 7.1 Blueprint Metadata Updates

**Populate openscad_source field:**
- Identify blueprints with customizable versions
- Map to corresponding OpenSCAD files
- Update blueprint records with source file paths

#### 7.2 Deep Linking Implementation

**Tag-to-parameter mapping:**
- Design flexible system for tag interpretation
- Implement per-customizer transformation logic
- Handle missing or invalid tag combinations

**URL generation:**
```typescript
GET /api/blueprints/{blueprint_id}/customize-url
Response: {
  customizer_url: string,
  parameters: { [key: string]: any }
}
```

#### 7.3 Frontend Integration

**Customize button:**
- Show only for blueprints with openscad_source
- Generate deep link with current tag configuration
- Open in new tab/window to customizer

**Success Criteria:**
- Customize buttons appear for appropriate blueprints
- Deep links successfully pre-populate customizer
- Tag-to-parameter mapping works for common cases
- Integration feels seamless to users

## Risk Management and Rollback Plans

### Phase 1 Risks
**Risk**: Data loss during migration
**Mitigation**: Full database backups, staged rollout, extensive testing
**Rollback**: Restore from backup, revert to old loading process

### Phase 2-3 Risks
**Risk**: Performance degradation from complex queries
**Mitigation**: Database indexing, query optimization, caching
**Rollback**: Feature flags to disable new functionality

### Phase 4-5 Risks
**Risk**: OAuth integration failures
**Mitigation**: Thorough testing with multiple accounts, error handling
**Rollback**: Graceful fallback to anonymous access

### Phase 6-7 Risks
**Risk**: UI complexity overwhelming users
**Mitigation**: Progressive disclosure, user testing, clear documentation
**Rollback**: Feature flags to hide new interfaces

## Testing Strategy

### Automated Testing
- Unit tests for all new backend logic
- Integration tests for OAuth flows
- Database migration tests with real data subsets
- API endpoint testing for new functionality

### Manual Testing
- Full workflow testing for each phase
- Cross-browser testing for frontend changes
- Performance testing with production data volumes
- User acceptance testing for major UX changes

### Monitoring and Observability
- Database performance monitoring during migration
- Error tracking for new API endpoints
- User behavior analytics for new features
- System health monitoring throughout rollout

## Success Metrics

### Technical Metrics
- Zero data loss during migration
- <10% performance degradation in worst case
- >95% uptime during transition periods
- OAuth success rate >98%

### User Experience Metrics
- Default population works for >90% of blueprints
- Component swapping completes in <2 seconds
- User authentication friction minimal
- Historical data access intuitive and fast

### Business Metrics
- Increased user engagement with new features
- Patron conversion improvements
- Reduced support requests
- Positive community feedback

This implementation plan provides a structured approach to delivering significant enhancements while maintaining system stability and user experience quality.