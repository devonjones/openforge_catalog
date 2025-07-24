# Claude Code Assistant Instructions

This file contains important information for Claude Code when working on the OpenForge Catalog project.

## Test Commands

### Python Tests
Always run these after making changes to Python code:
```bash
pytest tests/                  # Run unit tests
pytest integration_tests/      # Run integration tests
```

### JavaScript/TypeScript Tests
Always run these after making changes to frontend code:
```bash
npm test                      # Run Jest tests
npm run lint:all             # Run ESLint and TypeScript type checking
```

## Project Overview

OpenForge Catalog is a content management system for the OpenForge project - a comprehensive system of 3D printable modular dungeon terrain created by Devon Jones. The catalog manages:
- **12,000+ STL files** (~1,400 unique designs)
- **Modular terrain system** compatible with Dwarven Forge and other systems
- **Multiple connection systems**: OpenForge, OpenLOCK, Dragonlock, magnetic, etc.
- **Various textures**: dungeon_stone, cave, cut_stone, tudor, towne, etc.
- **Patreon-supported project** providing free STLs to the community

### OpenForge Domain Concepts
- **Blueprints**: Either individual STL models or compositions of multiple parts
- **Tiles**: Basic dungeon floor/wall pieces (1x1 to 4x4 sizes)
- **Connection Systems**: How tiles physically connect (magnets, clips, topless, etc.)
- **Textures**: Visual themes for tiles (stone types, wood, sewer, etc.)
- **Build Types**: Construction variants (topless, magnetic, LED-compatible)
- **Tag Hierarchy**: Systematic categorization (shape|wall|corner, size|width|2)

The system uses:
- Backend: Python/Flask with PostgreSQL
- Frontend: Next.js with TypeScript (compiled to static React)
- Storage: Cloudflare R2 for file storage

## Current Development Status

### Phase 2 (Documentation System) - Nearly Complete
- ✅ Database schema with documentation tables
- ✅ Backend API endpoints for documentation
- ✅ Frontend documentation viewing and editing
- ✅ Session-based authentication
- ⚠️ Deprecated objects manager needs API endpoint

## Important Guidelines

1. **Always run tests** after making code changes
2. **Check linting** before committing: `npm run lint:all`
3. **Database migrations** are in `openforge/db/schema/version_*.py`
4. **API authentication** uses either API keys or session cookies
5. **Frontend uses Next.js 13** with app directory structure

## Common Tasks

### Running the Development Environment
```bash
npm run dev              # Starts both Next.js and Flask
npm run flask-dev       # Flask only
npm run next-dev        # Next.js only
```

### Database Operations
```bash
bin/db_update up        # Run migrations
bin/fixtures            # Load fixtures
```

### Adding New Features
1. Create database migration if needed
2. Implement backend API endpoints
3. Add frontend components
4. Write tests for both backend and frontend
5. Run all tests and linting

## Key File Locations
- API routes: `openforge/app/index.py`
- Database models: `openforge/db/sql/`
- Frontend components: `src/components/`
- Admin interface: `src/components/admin/`
- Tests: `tests/` and `integration_tests/`

## Developer Preferences

### Python Code Style
1. **Follow PEP 8** - All Python code must adhere to PEP 8 style guidelines
   - Use 4 spaces for indentation (never tabs)
   - Maximum line length of 79 characters for code, 72 for docstrings/comments
   - Use snake_case for functions and variables
   - Use UPPER_CASE for constants
   - Use CamelCase for classes
   - Two blank lines between top-level definitions
   - One blank line between method definitions

2. **Functional-style procedural programming**
   - Prefer procedural functions over classes/OOP
   - Use private functions (`_function_name`) extensively to break down logic
   - Keep functions small with single responsibilities
   - Minimize side effects - functions should be as pure as practical
   - Be skeptical of functions that do multiple things ("and"/"or" in descriptions)
   - Pragmatically allow larger functions when it's genuinely simpler
   - Design for testability - small, focused functions are easier to test

3. **Unit Testing Philosophy**
   - **Critical for agentic coding success** - comprehensive tests enable confident refactoring
   - Test the PURPOSE/CONTRACT of code, not implementation details
   - Focus on: "What should this function accomplish?" not "How does it do it?"
   - Tests should survive refactoring if the function's purpose remains the same
   - Use descriptive test names that explain the scenario being tested
   - Prefer testing public interfaces over private functions
   - Mock external dependencies but test the actual business logic

4. **PostgreSQL & Database Access**
   - **Use psycopg3 tools**: Always use `sql.SQL()`, `sql.Literal()`, `sql.Identifier()` instead of string formatting
   - **ORM is the devil**: Direct SQL gives control and performance
   - **Embrace complex SQL**: Window functions, CTEs, and advanced queries are good
   - **Performance matters**: Write efficient queries that the database can optimize
   - **Don't hide from SQL**: The database is powerful, use it fully

5. **Error Handling & Logging Philosophy**
   - **Fail fast**: Raise exceptions immediately - don't paper over errors
   - **No silent failures**: Especially in CLI tools processing large datasets
   - **Exceptions to console**: Let errors bubble up to where they can be seen
   - **Rationale**: Hidden errors in large batch operations lead to data corruption
   - **Pattern**: Use `werkzeug.exceptions.NotFound` in SQL → catch in routes → proper HTTP status

6. **Security Patterns**
   - **Content sanitization**: All user input sanitized before storage
   - **Whitelist approach**: Only allow known-safe HTML tags/attributes
   - **CSRF protection**: Applied to all state-changing operations
   - **Constant-time comparison**: Use `secrets.compare_digest()` for tokens
   - **Length limits**: Prevent DoS via massive inputs

7. **Data Transformation Architecture**
   - **Clear layer separation**: API format ↔ database format
   - **Transformation functions**: `_munge_blueprint()`, `_convert_config()`
   - **Naming convention**: `blueprint_config` (API) vs `config` (DB)
   - **Private functions**: Handle all data munging/transformation

8. **Testing Infrastructure**
   - **Test helpers**: Factory functions like `create_test_blueprint()`
   - **Assertion helpers**: `assert_blueprint_matches()` for consistency
   - **Separation**: Unit tests in `tests/`, integration tests in `integration_tests/`
   - **Fixtures**: YAML/JSON test data files with consistent structure
   - **Transaction rollback**: Tests don't pollute database

## Background Context

### Technical Experience
- **SendGrid Email Infrastructure Architect (2016-2022)**
  - Scaled from 1 billion to 8 billion emails/day
  - Managed infrastructure requiring 600GB peak transit to Google
  - Deep understanding of distributed systems at scale
  
### Why This Matters
- **Architecture decisions** come from real scale experience
- **Simplicity focus** - knows what complexity costs at scale
- **Performance awareness** - understands when optimization matters (and when it doesn't)
- **Cost consciousness** - has managed massive infrastructure budgets
- **Pragmatic choices** - battle-tested understanding of what actually breaks

## Development Workflow

### Code Review Process
1. **Initial development**: Written in Cursor
2. **PR creation**: Push to GitHub
3. **Gemini review**: Automated code review
4. **Review iteration**: Fix issues between Cursor and Gemini
5. **Claude integration**: When passed to Claude for review fixes:
   - **Be skeptical of Gemini's suggestions** - Claude has much more context
   - **Consider project philosophy** - Gemini may suggest "best practices" that don't fit
   - **Respect existing patterns** - Don't break conventions for minor improvements
   - **Pragmatic approach** - Not every suggestion needs implementation

### Unix Philosophy & Tooling
1. **Embrace Unix principles** - Small, focused tools that do one thing well
   - Command-line tools go in `bin/` directory
   - Tools should be pipeable and composable
   - Use standard Unix conventions (exit codes, stderr for errors, etc.)
   - Cron jobs, pipe chains, and traditional Unix approaches are preferred
   
### HTTP/REST API Design
1. **Follow HTTP RFCs strictly**
   - Return 404 for empty collections (not 200 with empty array)
   - It's acceptable to return `{"items": []}` with 404 status
   - Use proper HTTP status codes semantically
   - Follow REST principles for resource design

### Architecture & Infrastructure Constraints
1. **Cost-conscious serverless architecture** (Patreon-funded with small budget)
   - Frontend: React app compiled statically (no Next.js SSR), served from S3
   - Backend: Single AWS Lambda function running Flask
   - Database: PostgreSQL on serverless (connection pooling critical)
   - File storage: Cloudflare R2 (S3-compatible) for free egress
   
2. **Design implications**:
   - Minimize Lambda cold starts (keep package size small)
   - Be mindful of database connections (serverless Postgres has limits)
   - Avoid features that require persistent state or long-running processes
   - Static frontend means no server-side rendering or API routes in Next.js
   - Optimize for cost: batch operations, efficient queries, minimal Lambda invocations
   - Use Cloudflare R2 for all file storage (never S3 directly)

### JavaScript/TypeScript/CSS Preferences
1. **Shield from complexity**:
   - **CSS**: Handle styling details - Devon finds CSS anti-human
   - **TypeScript**: Manage type annotations and interfaces
   - **Goal**: Let Devon focus on functionality, not type gymnastics or style tweaking
   - **Practical approach**: Keep frontend code simple and maintainable

2. **Frontend philosophy**:
   - JavaScript is a necessary tool, not a beloved language
   - Prefer simple, working solutions over "clever" JavaScript
   - Minimize frontend complexity where possible
   - Backend (Python) is where the real logic should live

3. **React & State Management**:
   - **React is good**: Component abstraction makes sense (similar to server-side templating)
   - **Redux was fine**: The unidirectional data flow is logical
   - **Using Zustand**: Adopted because it's current best practice, not preference
   - **Background**: Rails/ColdFusion experience - prefer clear MVC-style patterns
   - **Keep it simple**: Use state management like server-side sessions - straightforward and predictable

4. **Frontend Testing & API Patterns**:
   - **Testing**: No religious preferences - pragmatic approach
   - **API calls**: Session management handled automatically by backend
   - **No explicit session checks**: Backend returns 401 if session invalid
   - **Simple fetch patterns**: No need for complex API abstraction layers

5. **Frontend Development Approach**:
   - **Error handling**: Just console.log for now (beta phase) - tighten for 1.0
   - **Loading states**: Keep it simple until users complain
   - **Progressive enhancement**: Start minimal, add polish based on feedback
   - **Data fetching**: No overengineering - just fetch() is fine
   - **Caching philosophy**: "There are 2 hard things in programming: naming things, caching, and off by one errors" - avoid caching complexity where possible

### OpenForge-Specific Considerations
1. **File Management & Creator Workflow**:
   - **Creator-first design**: System must handle Devon's natural Blender workflow
   - **Zero manual data entry**: Automated metadata extraction from filenames/paths
   - **Resilient to changes**: Files move, get renamed, and edited during design
   - **Dropbox as source of truth**: Folders serve both patrons and the catalog
   - **MD5-based tracking**: Content addressing handles file moves gracefully
   - **Incremental updates**: Scanner detects changes without manual intervention
   - **Semantic filenames**: Encode metadata to avoid manual tagging overhead

2. **Why This Architecture**:
   - Manual data entry (like Thingiverse) was killing the project
   - System adapts to creator workflow, not vice versa
   - Automated scanning/tagging enables focus on 3D design
   - File moves and edits are natural part of the creative process

3. **User Expectations**:
   - Community expects free access to basic content
   - Power users need sophisticated filtering and composition tools
   - Backward compatibility is important (existing links shouldn't break)
   - Clear documentation helps users choose from overwhelming options