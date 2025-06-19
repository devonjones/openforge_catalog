# Blueprint Configuration Specification

## Overview

The `config` section of a blueprint defines how that blueprint should be assembled from component parts. It uses a sophisticated tag-based constraint system to guide part selection and ensure compatibility between components.

## Schema Structure

```yaml
config:
  parts:
    - name: string              # Human-readable part identifier
      tags:                     # Constraint system for part selection
        accept: []              # Optional: Hierarchical tag matching
        require: []             # Required: Exact tag matching  
        deny: []                # Prohibited: Tags that disqualify parts
        constrain: []           # Dynamic: Inherit from parent/siblings
      fulfills: []              # Optional: Requirements this part satisfies
```

## Parts Array

The `parts` array defines all components needed to build this blueprint. Each part represents either:
- A **model** (concrete STL file) that satisfies the constraints
- A **blueprint** (composition) that itself contains parts

### Part Name
```yaml
name: "base"
```
- Human-readable identifier for the part
- Used in UI for part selection steps
- Referenced by `fulfills` declarations in other parts
- Must be unique within the blueprint's parts array

## Tag Constraint System

The tag constraint system controls which blueprints/models can be selected for each part. Constraints are evaluated **real-time** as parts are selected, progressively narrowing options for remaining parts.

### Require Constraints
```yaml
require:
  - tag: "shape|base"
  - tag: "size|width|2"
```
- **Exact matching**: Selected part must have these exact tags
- Uses array equality: `['shape', 'base']` matches only `['shape', 'base']`
- Multiple require entries create AND relationship (must have ALL)

### Accept Constraints  
```yaml
accept:
  - tag: "shape|wall"
```
- **Hierarchical matching**: Selected part must have these tag elements in these positions
- Allows additional elements: `['shape', 'wall']` matches `['shape', 'wall', 'corner']`
- Useful for matching tag families (any type of wall, regardless of specificity)
- Multiple accept entries create AND relationship

### Deny Constraints
```yaml
deny:
  - tag: "shape|wall"
  - tag: "build|s2w"
```
- **Exclusion matching**: Selected part must NOT have these exact tags
- Uses array equality for exclusion
- Multiple deny entries create OR relationship (exclude if ANY match)

### Constrain System
```yaml
constrain:
  - tag: "texture"
  - tag: "connection"
    siblings: ["wall", "floor"]
    parent: false
  - filter: "connection|side"
  - filter: "connection|openforge"
```

The constrain system enables **dynamic inheritance** of tag requirements from:
1. **Parent blueprint**: The blueprint that contains this part
2. **Sibling parts**: Other parts in the same blueprint that have already been selected

#### Constrain Mechanics
- **Tag prefix matching**: `tag: "texture"` inherits all tags starting with `texture|`
- **Real-time evaluation**: Constraints update as sibling parts are selected
- **Progressive filtering**: Available options narrow with each selection
- **Single-level scope**: Only looks at immediate parent and siblings, not deeper hierarchy
- **Unique tag prefixes**: Each tag prefix can only appear once in the constrain array

#### Source Control
Tag inheritance sources can be controlled with optional properties:

```yaml
constrain:
  - tag: "texture"
    siblings: ["wall", "base"]  # Only inherit from these specific siblings
    parent: false               # Don't inherit from parent blueprint
```

**Siblings Control**:
- **Default behavior**: If unset, considers all sibling parts
- **Specific siblings**: `siblings: ["wall", "floor"]` only inherits from named siblings
- **No siblings**: `siblings: []` inherits from no siblings
- **Validation**: Invalid sibling names cause errors

**Parent Control**:
- **Default behavior**: `parent: true` (inherits from parent blueprint)
- **Disable parent**: `parent: false` excludes parent tags from inheritance
- **Combine with siblings**: Can be used together for precise source control

#### Filter Mechanism
- **Selective removal**: `filter: "connection|side"` removes tags starting with `connection|side|`
- **Prevents contamination**: Stops unwanted tag inheritance between different systems
- **Mixed with constrain**: Filter entries are embedded within the constrain array
- **Applied after inheritance**: First inherit matching tags, then remove filtered prefixes
- **No source control**: Filter entries cannot have `siblings` or `parent` properties

### Constraint Resolution Example
```yaml
# Parent blueprint has: texture|dungeon_stone, connection|openforge
# Sibling "wall" selected with: texture|dungeon_stone, connection|openforge|female
# Sibling "floor" selected with: texture|dungeon_stone|block

parts:
  - name: "base"
    tags:
      require:
        - tag: "shape|base"
      constrain:
        - tag: "texture"        # Inherits from all: texture|dungeon_stone, texture|dungeon_stone|block
          siblings: ["wall"]    # Restrict to wall only: texture|dungeon_stone
        - tag: "connection"     # Inherits from parent + siblings: connection|openforge, connection|openforge|female
          parent: false         # Exclude parent: connection|openforge|female
        - filter: "connection|openforge"  # Remove: connection|openforge|female
        
# Final constraints: shape|base + texture|dungeon_stone + (empty connection tags)
```

### Constraint Conflicts
When multiple siblings provide conflicting constraints (e.g., `texture|stone` vs `texture|wood`), both constraints are applied, potentially resulting in no valid options. This indicates an incompatible part combination.

## Fulfills System

The fulfills system allows parts to declare that they already satisfy requirements that would normally need separate parts.

### Part-Level Fulfills
```yaml
parts:
  - name: "right wall"
    tags:
      require:
        - tag: "shape|wall"
    fulfills:
      - part: "base"
```

- **Scope**: Only affects child parts of the fulfilling part
- **No sibling impact**: Does not affect sibling parts with the same name
- **Use case**: When a part inherently includes functionality (e.g., walls that include their own base)

## Resolution Process

### Part Selection Flow
1. **Initial filtering**: Apply require, accept, and deny constraints
2. **Constraint inheritance**: Apply constrain rules based on parent and selected siblings  
3. **Filter application**: Remove filtered tag prefixes
4. **Option presentation**: Show filtered list to user
5. **Selection impact**: Update constraints for remaining parts
6. **Recursive resolution**: If selected part is a blueprint, resolve its internal parts independently

### Hierarchical Resolution
- **Single-level constraints**: Each blueprint level resolves independently
- **No constraint tunneling**: Parent constraints don't affect grandchild selections
- **Independent fulfillment**: Each blueprint level handles its own fulfills declarations

## Common Patterns

### Basic Part Requirements
```yaml
parts:
  - name: "base"
    tags:
      require:
        - tag: "shape|base"
        - tag: "size|width|2"
      deny:
        - tag: "build|s2w"  # Exclude specific build systems
```

### Texture Coordination
```yaml
parts:
  - name: "wall"
    tags:
      require:
        - tag: "shape|wall"
  - name: "base" 
    tags:
      require:
        - tag: "shape|base"
      constrain:
        - tag: "texture"  # Match wall's texture
```

### Connection System Isolation
```yaml
parts:
  - name: "floor"
    tags:
      constrain:
        - tag: "connection"
        - filter: "connection|side"  # Don't inherit wall-specific connections
```

### Self-Contained Parts
```yaml
parts:
  - name: "integrated_wall"
    tags:
      require:
        - tag: "shape|wall"
        - tag: "component|integrated"
    fulfills:
      - part: "base"  # This wall includes its own base
```

## Design Principles

### Flexibility vs Complexity
The constraint system handles **inherent complexity** of the domain where physical objects have multiple independent properties that interact in nuanced ways. The system provides mechanisms to handle edge cases through filters and fulfills rather than oversimplifying the model.

### Progressive Disclosure
Real-time constraint evaluation guides users through complex decisions by eliminating invalid options at each step, making the assembly process feel intuitive despite underlying complexity.

### Hierarchical Independence  
Each blueprint level resolves its constraints independently, preventing constraint complexity from spiraling out of control while still enabling sophisticated compositions.

### Extensibility
The tag-based approach allows new constraint types and mechanisms to be added as new edge cases are discovered, without breaking existing blueprints.