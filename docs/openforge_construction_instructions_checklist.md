# OpenForge Construction Instructions Checklist

This checklist tracks all construction instruction files found in the OpenForge tiles directory for integration into the catalog website.

## LED Torch Instructions

- [ ] `/cut-stone/misc/full_pillar#torch/instructions.md` - LED torch for cut-stone full pillars
  - [ ] `texture|cut-stone` - Cut stone texture
  - [ ] `component|torch` - Torch component
  - [ ] `component|full_pillar` - Full pillar type
  - [ ] `component|full_pillar|torch` - Pillar with torch
  - [ ] `connection|openlock` - OpenLOCK connection system

- [ ] `/cut-stone/s2w/corner/torch#corner+s2w/instructions.md` - LED torch for cut-stone s2w corners
  - [ ] `texture|cut-stone` - Cut stone texture
  - [ ] `component|torch` - Torch component
  - [ ] `shape|corner` - Corner pieces
  - [ ] `build|s2w` - S2W build system
  - [ ] `component|torch|high` - High torch variant

- [ ] `/cut-stone/separate_wall/primary_walls/torch/instructions.md` - LED torch for cut-stone separate walls
  - [ ] `texture|cut-stone` - Cut stone texture
  - [ ] `component|torch` - Torch component
  - [ ] `build|separate wall` - Separate wall build
  - [ ] `connection|openlock` - OpenLOCK connection
  - [ ] `component|torch|low` - Low torch variant

- [ ] `/dungeon_stone/misc/full_pillar#torch/instructions.md` - LED torch for dungeon stone full pillars
  - [ ] `texture|dungeon_stone` - Dungeon stone texture
  - [ ] `component|torch` - Torch component
  - [ ] `component|full_pillar` - Full pillar type
  - [ ] `component|full_pillar|torch` - Pillar with torch
  - [ ] `connection|openlock` - OpenLOCK connection

- [ ] `/dungeon_stone/s2w/corner/torch#corner+s2w/instructions.md` - LED torch for dungeon stone s2w corners
  - [ ] `texture|dungeon_stone` - Dungeon stone texture
  - [ ] `component|torch` - Torch component
  - [ ] `shape|corner` - Corner pieces
  - [ ] `build|s2w` - S2W build system
  - [ ] `component|torch|mid` - Mid torch variant

- [ ] `/dungeon_stone/s_system/torch/instructions.md` - LED torch for dungeon stone s_system
  - [ ] `texture|dungeon_stone` - Dungeon stone texture
  - [ ] `component|torch` - Torch component
  - [ ] `build|s-system` - S-system build
  - [ ] `texture|dungeon_stone|block` - Block texture variant
  - [ ] `texture|dungeon_stone|eroded` - Eroded texture variant

- [ ] `/dungeon_stone/separate_wall/curved_walls/torch/instructions.md` - LED torch for dungeon stone curved walls
  - [ ] `texture|dungeon_stone` - Dungeon stone texture
  - [ ] `component|torch` - Torch component
  - [ ] `shape|curved` - Curved pieces
  - [ ] `build|separate wall` - Separate wall build
  - [ ] `shape|curved|concave` - Concave curved variant

- [ ] `/dungeon_stone/separate_wall/primary_walls/torch/instructions.md` - LED torch for dungeon stone separate walls
  - [ ] `texture|dungeon_stone` - Dungeon stone texture
  - [ ] `component|torch` - Torch component
  - [ ] `build|separate wall` - Separate wall build
  - [ ] `shape|wall` - Wall shape
  - [ ] `component|torch|a` - Torch variant A

## Magnetic Wall Instructions

- [ ] `/dungeon_stone/separate_wall/primary_walls/magnetic/instructions.md` - Magnetic attachment system for walls
  - [ ] `texture|dungeon_stone` - Dungeon stone texture
  - [ ] `component|magnetic` - Magnetic component
  - [ ] `build|separate wall` - Separate wall build
  - [ ] `connection|magnetic` - Magnetic connection
  - [ ] `connection|openlock` - OpenLOCK connection

- [ ] `/cut-stone/wall_on_tile/wall/magnetic/readme.md` - Cut-stone magnetic walls (includes instructions section)
  - [ ] `texture|cut-stone` - Cut stone texture
  - [ ] `component|magnetic` - Magnetic component
  - [ ] `build|wall on tile` - Wall on tile build
  - [ ] `connection|magnetic` - Magnetic connection
  - [ ] `build|s2w` - S2W build compatibility

## Special Build Instructions

- [ ] `/dungeon_stone/misc/infinite_hallway/instructions.md` - Infinity mirror hallway effect with plexiglass and LEDs
  - [ ] `texture|dungeon_stone` - Dungeon stone texture
  - [ ] `component|infinite_hallway` - Infinite hallway component
  - [ ] `component|infinite_hallway|torch` - Hallway with torch
  - [ ] `component|torch` - Torch component
  - [ ] `shape|base|hallway` - Hallway base shape

## Hybrid Files (readme.md with embedded instructions)

- [ ] `/cut-stone/wall_on_tile/wall/torch/readme.md` - Cut-stone torch walls with assembly instructions
  - [ ] `texture|cut-stone` - Cut stone texture
  - [ ] `component|torch` - Torch component
  - [ ] `build|wall on tile` - Wall on tile build
  - [ ] `component|torch|b` - Torch variant B
  - [ ] `build|s2w` - S2W build compatibility

- [ ] `/dungeon_stone/wall_on_tile/wall/torch/readme.md` - Dungeon stone torch walls with assembly instructions
  - [ ] `texture|dungeon_stone` - Dungeon stone texture
  - [ ] `component|torch` - Torch component
  - [ ] `build|wall on tile` - Wall on tile build
  - [ ] `connection|openlock` - OpenLOCK connection
  - [ ] `build|s2w` - S2W build compatibility

- [ ] `/dungeon_stone/wall_on_tile/wall/magnetic/readme.md` - Dungeon stone magnetic walls with assembly instructions
  - [ ] `texture|dungeon_stone` - Dungeon stone texture
  - [ ] `component|magnetic` - Magnetic component
  - [ ] `build|wall on tile` - Wall on tile build
  - [ ] `connection|magnetic|flex` - Flexible magnetic connection
  - [ ] `component|magnetic|reverse` - Reverse magnetic variant

## Notes

- All paths are relative to `~/Dropbox/projects/Hardware/objects/OpenForge/tiles/`
- LED torch instructions typically include: parts lists, wiring diagrams, assembly steps, and testing procedures
- Magnetic wall instructions cover: magnet sizes, placement, and compatible accessories
- The infinity hallway is a complex build requiring plexiglass work and electronics

## Tag Information

The suggested tags are based on actual tags found in the OpenForge catalog system:
- **texture|** - Material textures (dungeon_stone, cut-stone, etc.)
- **component|** - Specific components (torch, magnetic, door, etc.)
- **build|** - Build systems (s2w, separate wall, wall on tile, s-system)
- **shape|** - Physical shapes (corner, curved, wall, base)
- **connection|** - Connection types (openlock, magnetic, dragonlock)

These tags help users find related models when viewing documentation.
