# Multi-Angle Thumbnail Sprite Sheet Project - Progress Report

**Last Updated:** 2025-12-22
**Status:** 58% Complete (7/12 tasks)
**Epic:** openforge_catalog-bll - Multi-Angle Thumbnail Viewing System

## Overview

Implementing a multi-angle thumbnail viewing system for OpenForge STL models. Instead of a single thumbnail, we generate sprite sheets with 10 isometric camera angles (8 horizontal at 45° increments + 2 vertical) combined into a single PNG file.

## ✅ Completed Tasks (7/12)

### 1. Database Schema (openforge_catalog-jnl) ✓
- **File:** `openforge/db/schema/version_16.py`
- Added `sprite_metadata JSONB` column to `images` table
- Created GIN index `idx_images_sprite_metadata` for efficient querying
- Column is nullable for backward compatibility with legacy single thumbnails
- Stores: grid layout (rows/cols), tile size, camera angles, default angle

### 2. R2 Storage Design (openforge_catalog-szh) ✓
- **File:** `docs/sprite-sheet-storage-design.md`
- Storage path: `sprites/{md5[:6]}/{md5}.png` (separate from `thumbnails/`)
- Grid layout: 2 rows × 5 columns (2560×1024 pixels total)
- Tile size: 512×512 pixels per angle
- 10 camera angles with 45° spacing for optimal coverage

### 3. stl-thumb Integration (openforge_catalog-ubp) ✓
- **Files:** `openforge/data/io.py`, `requirements.txt`, `../stl-thumb/src/config.rs`
- Fixed stl-thumb to support negative camera positions (added `allow_hyphen_values(true)`)
- Created `create_sprite_sheet()` function
- Uses subprocess instead of sh.py for better argument handling
- PIL/Pillow integration for sprite combining
- Added Pillow==11.1.0 to requirements.txt
- Camera angles defined in `SPRITE_ANGLES` constant

### 4. CLI Tool (openforge_catalog-4ji) ✓
- **File:** `bin/generate_sprite`
- Standalone script for testing sprite generation on individual STL files
- Flags: `--upload`, `--output-json`, `--dry-run`, `--verbose`, `--tile-size`
- Supports fixture integration via `--output-json`
- Cleans up local files after upload

### 5. Backend API: Get Thumbnail Variants (openforge_catalog-5tg) ✓
- **Files:** `openforge/app/routes/blueprints.py`, `openforge/app/index.py`
- Endpoint: `GET /api/blueprints/<blueprint_id>/thumbnail-variants`
- Returns sprite sheet URL, grid layout, angle metadata, default angle
- Gracefully handles legacy single thumbnails (returns `type: "single"`)
- Response includes: `sprite_url`, `grid_rows`, `grid_cols`, `tile_size`, `angles`, `default_angle`

### 6. Backend API: Admin Set Default Angle (openforge_catalog-hqe) ✓
- **Files:** `openforge/app/routes/blueprints.py`, `openforge/app/index.py`
- Endpoint: `PATCH /api/blueprints/<blueprint_id>/thumbnail-variants/default-angle`
- Admin-only with authentication & CSRF protection
- Validates angle index (0-9)
- Updates `sprite_metadata.default_angle` in database
- Returns error for legacy single thumbnails

### 7. Scanner Integration (openforge_catalog-dd4) ✓
- **Files:** `openforge/data/scanner.py`, `openforge/data/incremental.py`, `openforge/data/io.py`
- Created `create_and_upload_thumbnail()` helper function
- Feature flag: `ENABLE_SPRITE_THUMBNAILS` (default: False)
- Handles both sprite sheets and legacy thumbnails
- Graceful failure handling - doesn't block scans if thumbnail generation fails
- Cleans up local files after upload
- Updated both full scanner and incremental scanner

## 📋 Remaining Tasks (5/12)

### Frontend Tasks (3)
- **openforge_catalog-3cx:** Interactive thumbnail viewer component [P2]
  - Display sprite sheets with interactive angle selection
  - Drag to rotate, keyboard navigation
  - CSS sprite extraction

- **openforge_catalog-5gb:** Admin camera position controls UI [P2]
  - Admin interface to set default angle per model
  - Calls PATCH endpoint

- **openforge_catalog-hr4:** Admin UI to manually trigger sprite generation [P3]
  - Button/interface to regenerate sprites for individual models
  - Lower priority

### Testing & Rollout Tasks (2)
- **openforge_catalog-5na:** Phased rollout with test subset [P2]
  - Enable sprites for small subset first
  - Validate before bulk backfill

- **openforge_catalog-qjn:** Testing and documentation [P3]
  - Comprehensive testing
  - User documentation

## Technical Details

### Camera Angles (10 total)
Arranged at 45° increments for even coverage without redundancy:

| Index | Name | Camera Position | Description |
|-------|------|-----------------|-------------|
| 0 | front | [0, -4, 2] | Front view (default) |
| 1 | front-right | [3, -3, 2] | 45° from front |
| 2 | right | [4, 0, 2] | Right side |
| 3 | back-right | [3, 3, 2] | 135° |
| 4 | back | [0, 4, 2] | Back view |
| 5 | back-left | [-3, 3, 2] | 225° |
| 6 | left | [-4, 0, 2] | Left side |
| 7 | front-left | [-3, -3, 2] | 315° |
| 8 | top | [0, -2, 5] | Top-down |
| 9 | bottom | [0, -2, -3] | Bottom-up |

### Sprite Metadata Structure (JSONB)
```json
{
  "grid_rows": 2,
  "grid_cols": 5,
  "tile_size": 512,
  "angles": [
    {"index": 0, "name": "front", "camera_pos": [0, -4, 2]},
    ...
  ],
  "default_angle": 0
}
```

### Key Functions

#### `openforge/data/io.py`
- `create_sprite_sheet(file_path, tile_size=512)` - Main sprite generation
- `create_and_upload_thumbnail(file_metadata, stl_path, s3_client, s3_key_cache, config, verbose, use_sprites)` - Unified helper for scanner
- `create_image(name, url, sprite_metadata=None)` - Creates fixture entry
- `_generate_angle_tile()` - Calls stl-thumb for single angle
- `_combine_tiles_to_sprite()` - Uses PIL to combine into grid

#### Configuration
- Feature flag: `config.get("ENABLE_SPRITE_THUMBNAILS", False)`
- Set to `True` to enable sprite generation in scanner
- Default is `False` for backward compatibility

### API Endpoints

#### GET /api/blueprints/{id}/thumbnail-variants
**Response (sprite):**
```json
{
  "type": "sprite",
  "sprite_url": "https://...",
  "grid_rows": 2,
  "grid_cols": 5,
  "tile_size": 512,
  "angles": [...],
  "default_angle": 0
}
```

**Response (legacy):**
```json
{
  "type": "single",
  "thumbnail_url": "https://..."
}
```

#### PATCH /api/blueprints/{id}/thumbnail-variants/default-angle
**Request:**
```json
{
  "default_angle": 3
}
```

**Response:**
```json
{
  "message": "Default angle updated successfully",
  "default_angle": 3,
  "sprite_metadata": {...}
}
```

## Important Decisions Made

1. **Camera Angles:** Changed from 6 primary + 4 corners (which had redundancy) to 8 horizontal at 45° increments + 2 vertical for better coverage
2. **Grid Layout:** 2×5 (wider) chosen over 5×2 for better horizontal display
3. **Tile Size:** 512×512 (square) instead of default 1024×768
4. **Separate Storage:** `sprites/` directory instead of mixing with `thumbnails/`
5. **Feature Flag:** Default off for safe gradual rollout
6. **Graceful Failures:** Scanner continues even if thumbnail generation fails
7. **File Cleanup:** Always delete local sprite/thumbnail files after R2 upload

## Testing Status

- All 319 tests passing ✅
- Flask running on http://127.0.0.1:5328
- Next.js running on http://localhost:3000
- Database: PostgreSQL via docker-compose
- stl-thumb: Fixed and installed with negative value support

## Visual Verification

Generated test sprite for:
```
~/Dropbox/projects/hardware/objects/OpenForge/tiles/dungeon_stone/
  separate_wall/angled_walls/door+arched/openforge/
  dungeon_stone%eroded#door+arched+narrow.PA.openforge.stl
```

User confirmed: "much better" after adjusting camera angles

## Next Steps

When ready to continue:
1. Frontend components (3cx, 5gb, hr4)
2. Phased rollout testing (5na)
3. Documentation (qjn)

## Files Modified

### Python Backend
- `openforge/db/schema/version_16.py` (created)
- `openforge/data/io.py` (major additions)
- `openforge/data/scanner.py` (updated imports, thumbnail generation)
- `openforge/data/incremental.py` (updated imports, thumbnail generation)
- `openforge/app/routes/blueprints.py` (2 new endpoints)
- `openforge/app/index.py` (route registrations)
- `bin/generate_sprite` (created)
- `requirements.txt` (added Pillow==11.1.0)

### Documentation
- `docs/sprite-sheet-storage-design.md` (created)

### External
- `../stl-thumb/src/config.rs` (added allow_hyphen_values)

## Test Coverage

All existing tests continue to pass. No new tests added yet (would be good for remaining work).

## Beads Status

```
bd epic status
○ openforge_catalog-bll Multi-Angle Thumbnail Viewing System
   Progress: 7/12 children closed (58%)
```
