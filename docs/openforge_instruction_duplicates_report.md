# OpenForge Instruction File Duplicates Report

## Summary

Out of 14 instruction files analyzed:
- **7 files** are exact duplicates of each other (torch instructions)
- **4 files** are unique
- **3 readme files** with instructions are all unique

## Duplicate Groups

### Group 1: Standard Torch Instructions (7 identical files)
These files all have MD5 hash: `cd68bf3a096c1eeed681d050c4209dc3`

1. `/cut-stone/misc/full_pillar#torch/instructions.md`
2. `/cut-stone/separate_wall/primary_walls/torch/instructions.md`
3. `/dungeon_stone/misc/full_pillar#torch/instructions.md`
4. `/dungeon_stone/s2w/corner/torch#corner+s2w/instructions.md`
5. `/dungeon_stone/s_system/torch/instructions.md`
6. `/dungeon_stone/separate_wall/curved_walls/torch/instructions.md`
7. `/dungeon_stone/separate_wall/primary_walls/torch/instructions.md`

All these files contain the exact same torch LED installation instructions.

## Unique Files

### Unique Torch Variant
1. `/cut-stone/s2w/corner/torch#corner+s2w/instructions.md` (MD5: `599c71e0b4decca4bbf365118f550b63`)
   - Appears to be a slightly different version of torch instructions

### Magnetic Wall Instructions
2. `/dungeon_stone/separate_wall/primary_walls/magnetic/instructions.md` (MD5: `162336ee0513602efb1487150e8c1c04`)
   - Instructions for magnetic attachment system

### Infinity Hallway Instructions
3. `/dungeon_stone/misc/infinite_hallway/instructions.md` (MD5: `59b0f1a5fd283bedfb477649eb8f04c0`)
   - Complex build including plexiglass work and LED integration

### Readme Files with Instructions (all unique)
4. `/cut-stone/wall_on_tile/wall/magnetic/readme.md` (MD5: `260e07a0df4cd2f3c2d1bb245e099b4c`)
5. `/cut-stone/wall_on_tile/wall/torch/readme.md` (MD5: `8238f07cedb932bca6d414e72631e3ac`)
6. `/dungeon_stone/wall_on_tile/wall/torch/readme.md` (MD5: `3b1edbc00fb61ee3ffb18c6e13a8dea9`)
7. `/dungeon_stone/wall_on_tile/wall/magnetic/readme.md` (MD5: `ebe2b636982b99cec16ed5b58af5e62a`)

## Recommendations

1. **Consolidate duplicate torch instructions**: Since 7 files contain identical content, consider:
   - Creating a single master torch instruction file
   - Using symlinks or references to avoid duplication
   - Or keeping duplicates if they serve different organizational purposes

2. **Tag assignment strategy**:
   - Duplicate files can share the same base instruction content
   - Apply context-specific tags based on the file location (texture, build system, etc.)
   - This allows the same instructions to appear in different contexts

3. **Content management**:
   - When updating torch instructions, remember to update all 7 locations or implement a central reference system
   - Consider if the slight variation in the cut-stone s2w corner torch file is intentional
