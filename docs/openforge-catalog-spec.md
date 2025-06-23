# OpenForge Catalog: Comprehensive Technical Specification (Updated)

## Project Overview

The OpenForge Catalog is a sophisticated content management and discovery system for Devon Jones' OpenForge project - a popular Patreon-funded collection of 3D printable dungeon tiles for tabletop RPGs. The catalog manages over 12,000 STL files with complex tag-based relationships and enables users to discover, compose, and download compatible tile sets.

## Current System Status

### Production State
- **Version**: 0.4.1 currently deployed
- **Content Scope**: Multiple textures (dungeon_stone, cave, towne, sewer, metal, wood, etc.) - well beyond initial "Dungeon Stone only" MVP
- **Database Strategy**: Full replacement on each deploy (no persistent data across deployments yet) - **PLANNED FOR REPLACEMENT**
- **User System**: Read-only public access; no authentication implemented - **PLANNED FOR IMPLEMENTATION**
- **API Security**: Admin endpoints protected by deploy-time secret API key

### Architecture Foundation

#### Core Data Model
The system uses a unified **"blueprint"** entity that handles both individual models (STL files) and compositions (collections of parts):

- **Models**: Blueprints with `blueprint_type: 'model'` that include a concrete STL file
- **Blueprints**: Blueprints with `blueprint_type: 'blueprint'` that define composition patterns

**Key Design Decision**: Originally envisioned separate Models and Blueprints tables, but discovered ~100% overlap in functionality. Models are essentially blueprints that ship with concrete STL implementations.

#### Database Schema (PostgreSQL) - **UPDATED**
```sql
-- Core entity (handles both models and blueprint compositions)
blueprints: id, blueprint_name, blueprint_type, config (jsonb), file_md5, file_size, 
           file_name, storage_address, search_text, created_at, updated_at,
           -- NEW FIELDS:
           consolidated_paths (text[]),     -- All filesystem locations for this file
           deprecated (boolean),            -- Whether this version is deprecated
           successor_id (uuid),             -- Points to newer version if deprecated
           predecessor_id (uuid),           -- Points to older version if this is an update
           openscad_source (text),          -- OpenSCAD file for customizable blueprints
           created_by (uuid),               -- User who created this blueprint
           updated_by (uuid)                -- User who last updated this blueprint

-- Tag system (pipe-delimited hierarchical tags)
tags: id, blueprint_id, tag (text[]), created_by, updated_by, created_at, updated_at
tag_descriptions: id, tag (text[]), description, created_by, updated_by, created_at, updated_at

-- Media associations
images: id, image_name, image_url, created_by, updated_by, created_at, updated_at
blueprint_images: blueprint_id, image_id (many-to-many)

-- Documentation (tag-based composition with types and namespaced images)
documentation: id, documentation_name, document, documentation_type, created_by, updated_by, created_at, updated_at
blueprint_documentation: blueprint_id, documentation_id (many-to-many)
tag_documentation: id, tag (text[]), documentation_id, created_by, updated_by, created_at, updated_at
documentation_images: id, namespace, image_name, image_id, created_by, updated_by, created_at

-- NEW: User management and authentication
users: id, email, role, patreon_tier, created_at, updated_at
user_identities: provider, provider_id, user_id, created_at, updated_at

-- NEW: Default preferences for blueprint composition
tag_priorities: id, tag_category, tag_value, priority_score, created_by, updated_by, created_at, updated_at
```

#### Tag System Architecture
Tags use pipe-delimited hierarchical structure: `category|subcategory|detail`

**Examples**:
- `texture|dungeon_stone`
- `shape|wall`
- `size|width|2`
- `connection|openforge`
- `component|door|arched`

**Tag Categories**:
- **Build**: Underlying system (separate_wall, wall_on_tile, s2w, thick_wall)
- **Component**: Functional elements (arrow_slit, door, window, torch)
- **Connection**: Mechanical systems (dragonlock, openlock, openforge, magnetic, side, pegs)
- **Decoration**: Visual themes (air, earth, fire, water, demon, celtic_knot)
- **Interface**: Multi-part relationships
- **Part**: Component definitions
- **Scatter**: Non-tile objects (barrels, statues)
- **Shape**: Physical geometry (wall, base, floor, corner, square)
- **Size**: Dimensions (width|2, depth|4, openlock|A)
- **Texture**: Surface appearance (dungeon_stone, cave, towne, sewer)

**NEW: Tag Priority System**
Default selections for blueprint composition are determined by a configurable priority system:
- `texture|dungeon_stone` - Highest priority (flagship texture)
- `connection|openforge` + `build|topless` + `connection|magnetic` + `connection|flex` - Recommended base configuration
- Priority scores allow for easy reordering and new defaults

### Blueprint Composition System

Blueprints define sophisticated assembly patterns using a tag-based constraint system. The `config` section of each blueprint specifies required parts and their selection criteria through:

- **Part Definitions**: Named components with tag-based requirements
- **Constraint Types**: require, accept, deny, and constrain mechanisms for part selection
- **Dynamic Inheritance**: Parts inherit properties from parent blueprints and sibling selections
- **Fulfillment System**: Parts can satisfy multiple requirements to handle integrated components
- **Real-time Resolution**: Constraints update progressively as users make selections

**NEW: Default Population and Component Swapping**
- Blueprints now auto-populate with default selections based on tag priorities
- Component swap functionality allows users to change tag values (e.g., texture|dungeon_stone → texture|cut_stone) across all applicable parts
- New API endpoint provides available alternatives that maintain blueprint constraint satisfaction

The system handles complex real-world scenarios like doorways that need both wall and floor textures, connection system isolation, and parts that provide multiple functions. Blueprint composition can be recursive, with blueprints referencing other blueprints as parts.

**For detailed blueprint configuration syntax and constraint resolution mechanics, see [config-spec.md](config-spec.md).**

### File Management Pipeline - **SIGNIFICANTLY UPDATED**

#### New Incremental Workflow
1. **File Creation**: STLs created in Dropbox with semantic naming
2. **Scanning**: `dropbox_scanner` tool processes file tree, generates filename+MD5 pairs
3. **Incremental Loading**: `fixtures` tool compares scan results with database:
   - **Same filename+MD5**: Update metadata only (tags, images, instructions)
   - **New MD5 for existing filename**: Deprecate old version, create new with predecessor link
   - **Filename moved, same MD5**: Update location, add to consolidated_paths
   - **MD5 no longer exists**: Mark as deprecated
   - **New filename+MD5**: Create new record or link to deprecated predecessor
4. **Manual Review Interface**: CLI tool for connecting new files to deprecated predecessors using:
   - Levenshtein distance on filenames
   - Path element matching
   - Tag similarity scoring
5. **Tag Inference**: Filenames automatically generate tags for standard tiles
6. **Manual Override**: `metadata.yaml` files provide complex configurations
7. **Thumbnail Generation**: Automated STL rendering (single angle, quality issues)
8. **Storage**: Files uploaded to Cloudflare R2 storage by MD5 hash
9. **Database Update**: Incremental changes only

#### File Versioning Strategy - **ENHANCED**
- **MD5 as Content Identifier**: Files identified by content hash
- **Deprecation with Succession**: Old versions marked deprecated with successor links
- **Path Consolidation**: Multiple file locations tracked in consolidated_paths array
- **Historical Preservation**: All versions preserved in storage and accessible via history interface
- **Changelog System**: Manual documentation of changes per model
- **Path Tombstoning**: Detection of file moves and deletions across scans

#### NEW: Documentation and Knowledge System
- **Markdown-based Documentation**: Rich text instructions with image support
- **Documentation Types**: Instructions, changelogs, tag guides, tutorials
- **Tag-based Documentation**: Automatic composition of blueprint + tag documentation
- **Namespaced Images**: Reusable images across documentation with markdown reference
- **Version Changelogs**: Detailed change documentation using full documentation system
- **Combined Rendering**: Blueprint instructions enhanced with relevant tag documentation

### Authentication and Authorization System - **NEW**

#### OAuth-Only Authentication
- **Patreon OAuth**: Primary integration with automatic tier detection
- **Google OAuth**: Secondary option for non-Patreon users
- **Multiple Provider Support**: Users can link multiple OAuth accounts to single profile
- **No Traditional Registration**: Eliminates need for custom user management

#### Role-Based Access Control
**Initial Implementation**:
- **Admin**: Full system access, can manage all content and users
- **Patron**: Access level based on Patreon tier, potential early access features
- **User**: Basic read access, standard feature set

**Future Expansion**:
- **Content Creator**: Can submit and manage their own blueprints
- **Reviewer**: Can review and approve community submissions
- **Moderator**: Can manage community interactions and content quality

#### Patreon Integration
- Automatic account creation from Patreon supporter list
- Tier-based feature access
- Webhook integration for real-time tier updates
- **Comprehensive Audit Trails**: All content creation and modification tracked by user
- **Multi-provider Identity**: Single user profile can link multiple OAuth accounts

### Performance Characteristics

#### Database Performance
Excellent performance despite complex tag queries using sophisticated SQL with multiple JOINs. **NEW**: Deprecation filtering adds minimal overhead with proper indexing on deprecated flag.

#### Bottlenecks
- **File Processing**: `dropbox_scanner` performance with 12,000+ files - **IMPROVED** with incremental processing
- **Thumbnail Quality**: Single-angle automated generation produces poor results for complex models

### User Interface - **ENHANCED**

#### Current Features
- **Part Search**: Tag-based filtering with hierarchical categories
- **Blueprint Assembly**: Step-by-step part selection with constraint-based filtering
- **Visual Feedback**: 3D thumbnail previews throughout interface
- **Download System**: Individual file downloads with deep linking support
- **Tag Documentation**: Tooltip help system with tag descriptions

#### NEW Features
- **Default Population**: Blueprints auto-populate with recommended parts
- **Component Swapping**: Buttons to swap tag categories across all parts
- **File History**: Interface to view version history and changelogs
- **Customization Integration**: Direct links to OpenSCAD customizer for parametric models
- **Authentication Flow**: OAuth login with role-based feature access

#### User Experience Flow - **IMPROVED**
1. **Optional Login**: OAuth authentication for enhanced features
2. Browse blueprints or search by tags (deprecated versions hidden)
3. Select blueprint for assembly - **now pre-populated with defaults**
4. **NEW**: Use component swap buttons for quick texture/style changes
5. Fine-tune parts step-by-step with guided filtering
6. **NEW**: Access customization for parametric models
7. Review final part list with thumbnails
8. Download individual STL files or **NEW**: view file history

### Advanced Features

#### Base Generator (WebAssembly OpenSCAD) - **ENHANCED**
- **Parametric Customization**: Web-based tile base generation
- **Real-time Preview**: 3D rendering before STL export
- **NEW: Deep Linking**: Direct integration from catalog with tag pre-population
- **NEW: Blueprint Integration**: openscad_source field links blueprints to customizable versions
- **Limitations**: Boolean reliability issues with textured surfaces
- **Future**: Blender + Geometry Nodes for complex textured parametric generation

#### API Design - **EXPANDED**
RESTful API with comprehensive CRUD operations:
- `/api/blueprints` - Blueprint management
- `/api/blueprints/{blueprint_id}/tags` - Tag management
- `/api/blueprints/tags` - Advanced tag querying with pagination
- **NEW**: `/api/blueprints/component-alternatives` - Component swapping alternatives
- `/api/images` - Image management
- `/api/tag-descriptions` - Tag documentation
- **NEW**: `/api/auth` - OAuth authentication endpoints
- **NEW**: `/api/blueprints/{blueprint_id}/history` - File version history
- **NEW**: `/api/admin/duplicates` - Administrative duplicate detection

## Roadmap and Development Priorities - **UPDATED**

### Immediate Implementation (Current Cycle)
1. **Incremental Database Updates** - Replace full refresh with versioning system
2. **CLI Administrative Tools** - Manual review interface and duplicate detection
3. **Documentation System** - Markdown instructions with tag-based composition and image support
4. **Default Population System** - Tag priorities and auto-population
5. **Component Swapping API** - Backend support for alternative tag suggestions

### Next Phase
1. **OAuth Authentication System** - Patreon and Google integration
2. **File History Interface** - User-facing version history with rich changelog documentation
3. **Component Swapping UI** - Frontend implementation of swap buttons
4. **OpenSCAD Deep Linking** - Integration with parametric customizer

### Beta Features
- **Advanced Downloads**: Zip file packaging
- **Enhanced Media**: Multiple thumbnail angles, user-submitted photos
- **Administrative Web Interface**: Move from CLI to web-based admin tools
- **Advanced Role Management**: Content creator and reviewer workflows

### Version 1.0+ Features
- **Community Contributions**: User-uploaded models with review process
- **External Integration**: Thingiverse, Printables, MakerWorld linking
- **Advanced Customization**: Blender-based parametric generation
- **3D Visualization**: Real-time blueprint assembly preview

### Long-term Vision
- **Dungeon Planning Tools**: Drag-and-drop dungeon builders with part calculation
- **Inventory Management**: Track printed parts for efficient build planning
- **Advanced Community Features**: Comments, bug tracking, collaborative blueprints

## Technical Challenges and Solutions

### Database Migration Strategy
**Challenge**: Moving from full refresh to incremental updates without data loss
**Solution**: Comprehensive comparison system with manual review fallbacks for edge cases

### File Relationship Management
**Challenge**: Tracking file evolution, moves, and duplicates across complex directory structure
**Solution**: MD5-based identity with path consolidation and predecessor/successor linking

### OAuth-Only Authentication
**Challenge**: Users without preferred OAuth providers
**Solution**: Clear messaging about supported providers, focus on primary user base (tabletop gamers)

### Component Swapping Complexity
**Challenge**: Determining valid alternatives that satisfy all blueprint constraints
**Solution**: New API endpoint that validates constraint satisfaction across all affected parts

## Architecture Decisions and Rationale

### Incremental Database Strategy
**Decision**: Implement comprehensive versioning with deprecation rather than selective updates
**Rationale**: Preserves all historical data, supports rollback scenarios, maintains audit trail

### OAuth-Only Authentication
**Decision**: Skip traditional username/password registration entirely
**Rationale**: Reduces maintenance burden, aligns with modern security practices, leverages existing user accounts

### CLI-First Admin Tools
**Decision**: Build command-line tools before web interfaces for administrative functions
**Rationale**: Faster implementation, more powerful for complex operations, can evolve to web later

### Tag Priority System
**Decision**: Configurable priority scoring rather than hardcoded defaults
**Rationale**: Allows evolution of recommendations, supports A/B testing, enables user customization

## Implementation Notes for Developers

### Database Migrations
- Add new fields with default values for backward compatibility
- Index deprecated flag and successor/predecessor relationships
- Consider partitioning strategy for large historical datasets

### File Processing Pipeline
- Implement robust comparison logic for filename+MD5 pairs
- Handle edge cases in path consolidation (symbolic links, case sensitivity)
- Build comprehensive scoring system for predecessor/successor matching

### API Versioning
- Maintain backward compatibility for existing endpoints
- Version new endpoints for component swapping and authentication
- Plan for deprecation of admin API key in favor of OAuth

### Frontend State Management
- Handle default population without breaking existing user workflows
- Implement optimistic updates for component swapping
- Design authentication flow with minimal user friction

## Success Metrics and Goals - **EXPANDED**

### Technical Success Metrics
- **Zero Data Loss**: Migration to incremental updates without losing historical data
- **Performance Maintenance**: No degradation in search/filtering performance with versioning
- **Authentication Adoption**: High OAuth adoption rate, minimal user friction
- **Administrative Efficiency**: CLI tools reduce manual overhead for content management

### User Experience Goals
- **Faster Workflow**: Default population reduces time to working blueprint
- **Intuitive Swapping**: Component swap buttons feel natural and predictable
- **Historical Access**: Users can easily access and understand file evolution
- **Seamless Customization**: Direct parametric customization feels integrated

This updated specification reflects a significant maturation of the OpenForge Catalog system, moving from a read-only prototype to a full-featured content management platform with user authentication, comprehensive versioning, and enhanced user experience features.