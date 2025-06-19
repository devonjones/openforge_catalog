# OpenForge Catalog: Comprehensive Technical Specification

## Project Overview

The OpenForge Catalog is a sophisticated content management and discovery system for Devon Jones' OpenForge project - a popular Patreon-funded collection of 3D printable dungeon tiles for tabletop RPGs. The catalog manages over 12,000 STL files with complex tag-based relationships and enables users to discover, compose, and download compatible tile sets.

## Current System Status

### Production State
- **Version**: 0.4.1 currently deployed
- **Content Scope**: Multiple textures (dungeon_stone, cave, towne, sewer, metal, wood, etc.) - well beyond initial "Dungeon Stone only" MVP
- **Database Strategy**: Full replacement on each deploy (no persistent data across deployments yet)
- **User System**: Read-only public access; no authentication implemented
- **API Security**: Admin endpoints protected by deploy-time secret API key

### Architecture Foundation

#### Core Data Model
The system uses a unified **"blueprint"** entity that handles both individual models (STL files) and compositions (collections of parts):

- **Models**: Blueprints with `blueprint_type: 'model'` that include a concrete STL file
- **Blueprints**: Blueprints with `blueprint_type: 'blueprint'` that define composition patterns

**Key Design Decision**: Originally envisioned separate Models and Blueprints tables, but discovered ~100% overlap in functionality. Models are essentially blueprints that ship with concrete STL implementations.

#### Database Schema (PostgreSQL)
```sql
-- Core entity (handles both models and blueprint compositions)
blueprints: id, blueprint_name, blueprint_type, config (jsonb), file_md5, file_size, 
           file_name, storage_address, search_text, created_at, updated_at

-- Tag system (pipe-delimited hierarchical tags)
tags: id, blueprint_id, tag (text[]), created_at, updated_at
tag_descriptions: id, tag (text[]), description, created_at, updated_at

-- Media associations
images: id, image_name, image_url, created_at, updated_at
blueprint_images: blueprint_id, image_id (many-to-many)

-- Documentation (planned for tag-based composition)
documentation: id, documentation_name, document, created_at, updated_at
blueprint_documentation: blueprint_id, documentation_id (many-to-many)
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

### Blueprint Composition System

Blueprints define sophisticated assembly patterns using a tag-based constraint system. The `config` section of each blueprint specifies required parts and their selection criteria through:

- **Part Definitions**: Named components with tag-based requirements
- **Constraint Types**: require, accept, deny, and constrain mechanisms for part selection
- **Dynamic Inheritance**: Parts inherit properties from parent blueprints and sibling selections
- **Fulfillment System**: Parts can satisfy multiple requirements to handle integrated components
- **Real-time Resolution**: Constraints update progressively as users make selections

The system handles complex real-world scenarios like doorways that need both wall and floor textures, connection system isolation, and parts that provide multiple functions. Blueprint composition can be recursive, with blueprints referencing other blueprints as parts.

**For detailed blueprint configuration syntax and constraint resolution mechanics, see [config-spec.md](config-spec.md).**

### File Management Pipeline

#### Current Workflow
1. **File Creation**: STLs created in Dropbox with semantic naming
2. **Scanning**: `dropbox_scanner` tool processes file tree
3. **Tag Inference**: Filenames automatically generate tags for standard tiles
4. **Manual Override**: `metadata.yaml` files provide complex configurations
5. **Thumbnail Generation**: Automated STL rendering (single angle, quality issues)
6. **Storage**: Files uploaded to Cloudflare R2 storage by MD5 hash
7. **Database Load**: `fixtures` tool loads generated JSON into database
8. **Deployment**: Full database replacement

#### File Versioning Strategy
- **MD5 as Primary Key**: Files identified by content hash
- **Move Detection**: Scanner can track files moved to new locations
- **Historical Preservation**: All versions preserved in storage and git history
- **Deprecation Support**: Infrastructure exists for deprecated-but-accessible files with successor linking

### Performance Characteristics

#### Database Performance
Excellent performance despite complex tag queries using sophisticated SQL with multiple JOINs:

```sql
SELECT DISTINCT bp.id FROM blueprints AS bp, (
  SELECT bp2.id FROM blueprints bp2
  JOIN tags AS "tags_0" ON bp2.id = "tags_0".blueprint_id
  JOIN tags AS "tags_1" ON bp2.id = "tags_1".blueprint_id
  WHERE "tags_0".tag = '{build,s2w}'
    AND "tags_1".tag = '{shape,corner,left}'
    AND bp2.blueprint_type = 'model'
    AND bp2.id NOT IN (
      SELECT DISTINCT bp_neg.id FROM blueprints AS bp_neg
      JOIN tags AS "tags_0_neg" ON bp_neg.id = "tags_0_neg".blueprint_id
      WHERE "tags_0_neg".tag = '{shape,column,low}'
    )
) as bp_name WHERE bp_name.id = bp.id
```

#### Bottlenecks
- **File Processing**: `dropbox_scanner` performance with 12,000+ files
- **Thumbnail Quality**: Single-angle automated generation produces poor results for complex models

### User Interface

#### Current Features
- **Part Search**: Tag-based filtering with hierarchical categories
- **Blueprint Assembly**: Step-by-step part selection with constraint-based filtering
- **Visual Feedback**: 3D thumbnail previews throughout interface
- **Download System**: Individual file downloads with deep linking support
- **Tag Documentation**: Tooltip help system with tag descriptions

#### User Experience Flow
1. Browse blueprints or search by tags
2. Select blueprint for assembly
3. Choose parts step-by-step with guided filtering
4. Review final part list with thumbnails
5. Download individual STL files

### Advanced Features

#### Base Generator (WebAssembly OpenSCAD)
- **Parametric Customization**: Web-based tile base generation
- **Real-time Preview**: 3D rendering before STL export
- **Limitations**: Boolean reliability issues with textured surfaces
- **Future**: Blender + Geometry Nodes for complex textured parametric generation

#### API Design
RESTful API with comprehensive CRUD operations:
- `/api/blueprints` - Blueprint management
- `/api/blueprints/{id}/tags` - Tag management
- `/api/blueprints/tags` - Advanced tag querying with pagination
- `/api/images` - Image management
- `/api/tag-descriptions` - Tag documentation

## Roadmap and Development Priorities

### Missing MVP Components
1. **User Authentication System** - Complete absence of login/user management
2. **Persistent Database Strategy** - Transition from deploy-time replacement
3. **Editing Interfaces** - CRUD operations for blueprints, tags, documentation
4. **Documentation System** - Tag-based markdown composition
5. **Image Quality Improvements** - Better thumbnail generation and user feedback

### Beta Features
- **User Management**: Registration, roles, Patreon integration
- **Advanced Downloads**: Zip file packaging
- **SSO Integration**: Google, Patreon webhooks
- **Administrative Tools**: Hybrid inline editing interface
- **Enhanced Media**: Multiple thumbnail angles, user-submitted photos

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

### Inherent Complexity Management
The tag constraint system handles real-world complexity where objects have multiple independent properties. Example challenges:

- **Multi-texture Objects**: Doorways have both wall and floor textures
- **Connection System Isolation**: Wall-to-column vs base-to-floor connections
- **Tag Hierarchy Conflicts**: General vs specific texture requirements

**Solution Approach**: Evolve constraint language with mechanisms like `filter` to handle edge cases as discovered, rather than oversimplifying the model.

### File Management at Scale
Managing 12,000+ files with complex metadata requires:

- **Automated Processing**: Robust filename-to-tag inference
- **Manual Override Capability**: YAML metadata for complex cases
- **Version Control Integration**: Git-based historical tracking
- **Performance Optimization**: Efficient scanning and database loading

### Community Scaling Challenges
- **Quality Control**: Review processes for user-generated blueprints
- **Permission Tiers**: Different capabilities for different user types
- **Training Requirements**: Blueprint creation complexity requires user education

## Architecture Decisions and Rationale

### Unified Blueprint Entity
**Decision**: Single table for models and blueprints with type discriminator
**Rationale**: Near-100% overlap in functionality; models sometimes need blueprint capabilities (e.g., doorway guiding door selection)

### Tag-Based Architecture
**Decision**: Hierarchical pipe-delimited tags with constraint-based composition
**Rationale**: Flexible enough to handle complex real-world relationships; extensible for future requirements

### File-First Workflow
**Decision**: File system as source of truth with automated metadata extraction
**Rationale**: Enables creator-focused workflow without manual data entry; supports existing creative process

### MD5-Based Versioning
**Decision**: Content-hash primary keys for file versions
**Rationale**: Enables file moves, preserves history, supports permanent deep linking

## Implementation Notes for Developers

### Database Considerations
- PostgreSQL with JSONB for flexible configuration storage
- GIN indexes on tag arrays for performance
- Full-text search on generated search_text fields
- UUID primary keys with MD5 unique constraints for files

### API Design Patterns
- RESTful with nested resources for relationships
- Pagination support for large result sets
- Complex tag querying via POST with JSON body
- Signed URLs for direct file access

### Frontend Architecture
- React-based with real-time 3D rendering
- Tag-based state management for complex filtering
- Modal-based part selection workflow
- Desktop-focused design (mobile responsiveness not yet implemented)

### Performance Optimization
- Database query optimization for complex tag joins
- Efficient thumbnail generation and caching
- CDN integration for file delivery
- Lazy loading for large datasets

### Security Model
- API key protection for administrative operations
- Planned role-based access control
- Secure file storage with signed URLs
- CORS configuration for web assembly integration

## Success Metrics and Goals

### User Experience Goals
- **Discovery**: Users can find appropriate parts quickly
- **Assembly**: Blueprint composition feels intuitive and reliable
- **Education**: Complex builds have clear, accessible instructions
- **Performance**: Search and filtering respond quickly despite data scale

### Technical Goals
- **Maintainability**: System can evolve with new requirements
- **Scalability**: Architecture supports community growth
- **Reliability**: Robust handling of edge cases and data complexity
- **Flexibility**: Support for future features like parametric generation

### Community Goals
- **Creator Support**: Enable easy content contribution
- **Quality Assurance**: Maintain high standards while scaling
- **Accessibility**: Lower barriers to OpenForge adoption
- **Innovation**: Platform for community-driven development

This specification represents a sophisticated system that has evolved beyond its original scope while maintaining architectural integrity. The tag-based composition system provides the flexibility needed for the inherent complexity of the domain, while the technical infrastructure supports both current needs and future growth.