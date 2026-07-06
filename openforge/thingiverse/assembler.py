"""Assemble a Thingiverse thing payload from the catalog plus a manifest.

Defaults come from the catalog DB (blueprint records selected by tag
query or explicit reference) and a named template (license, category,
base tags, description boilerplate); the manifest curates on top.

The output is API-neutral: field names are finalized against the
HAR-derived contract (openforge_catalog-hnr) by the API client, not here.
"""

import hashlib
import json
import logging
from importlib import resources as impresources
from pathlib import Path
from typing import Dict, List

from psycopg import cursor
from yaml import safe_load

import openforge.db.sql.blueprints as blueprint_sql
import openforge.db.sql.tags as tag_sql

logger = logging.getLogger(__name__)

# The catalog holds ~1,400 designs; any real selector returns far fewer.
# tag_search_blueprints has no unlimited mode, so use a ceiling and fail
# fast if it's ever reached (which would mean silent truncation).
SELECT_LIMIT = 10000


class AssemblyError(Exception):
    """The manifest references files or templates that can't be resolved."""


def load_template(name: str) -> Dict:
    """Load a named metadata template bundled with the package.

    Raises:
        AssemblyError: If no template with that name ships in
            openforge/thingiverse/templates/
    """
    resource = impresources.files("openforge.thingiverse.templates").joinpath(
        f"{name}.yaml"
    )
    try:
        template = safe_load(resource.read_text())
    except FileNotFoundError as e:
        raise AssemblyError(f"unknown template: {name!r}") from e
    return template


def assemble_thing(curs: cursor, manifest: Dict) -> Dict:
    """Build the full thing payload a create/sync run needs.

    Args:
        curs: Catalog DB cursor
        manifest: A validated manifest (see manifest.load_manifest)

    Returns:
        {
          "metadata": {name, license, category, tags, description},
          "files": {
            "models": [blueprint rows w/ file_md5, file_name, ...],
            "images"/"zips"/"others": [{"path": absolute path}, ...],
          },
          "metadata_hash": sha256 of the canonical metadata JSON —
            stored as thingiverse_things.remote_metadata_hash after a
            push so metadata drift is detectable,
        }

    Raises:
        AssemblyError: On unresolvable templates, selectors matching
            nothing, missing explicit references, or missing local files
    """
    template = load_template(manifest["template"])
    metadata = _assemble_metadata(manifest, template)
    files = {
        "models": _resolve_models(curs, manifest),
        "images": _resolve_local_files(manifest, "images"),
        "zips": _resolve_local_files(manifest, "zips"),
        "others": _resolve_local_files(manifest, "others"),
    }
    return {
        "metadata": metadata,
        "files": files,
        "metadata_hash": metadata_hash(metadata),
    }


def metadata_hash(metadata: Dict) -> str:
    """Canonical hash of assembled metadata for drift detection."""
    canonical = json.dumps(metadata, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _assemble_metadata(manifest: Dict, template: Dict) -> Dict:
    description = _compose_description(
        manifest["description"], template.get("description_boilerplate", "")
    )
    return {
        "name": manifest["name"],
        "license": manifest["license"] or template.get("license"),
        "category": manifest["category"] or template.get("category"),
        "tags": _merge_tags(template.get("tags", []), manifest["tags"]),
        "description": description,
    }


def _compose_description(per_thing: str, boilerplate: str) -> str:
    """Per-thing prose first, shared boilerplate footer after.

    The boilerplate is stored once in the template so a copy change
    re-syncs every managed thing's description (the old
    tv_update_description bulk-edit workflow, automated).
    """
    parts = [p.strip() for p in (per_thing, boilerplate) if p and p.strip()]
    return "\n\n".join(parts)


def _merge_tags(template_tags: List[str], manifest_tags: List[str]) -> List[str]:
    """Union, order-preserving, case-insensitive dedupe."""
    merged = []
    seen = set()
    for tag in [*template_tags, *manifest_tags]:
        key = tag.lower()
        if key not in seen:
            seen.add(key)
            merged.append(tag)
    return merged


def _resolve_models(curs: cursor, manifest: Dict) -> List[Dict]:
    """Resolve every model entry to blueprint rows, deduped by md5."""
    resolved = []
    for entry in manifest["files"]["models"]:
        if "select" in entry:
            resolved.extend(_resolve_select(curs, entry["select"]))
        elif "md5" in entry:
            resolved.append(_resolve_md5(curs, entry["md5"]))
        else:
            resolved.append(_resolve_full_name(curs, entry["full_name"]))
    return _dedupe_models(resolved)


def _resolve_select(curs: cursor, select: Dict) -> List[Dict]:
    # tag_search_blueprints takes {"tag": ...} dicts (the blueprint-config
    # parts shape), not bare strings — bare strings silently no-op.
    rows = tag_sql.tag_search_blueprints(
        curs,
        accept=[{"tag": t} for t in select["accept"]],
        require=[{"tag": t} for t in select["require"]],
        deny=[{"tag": t} for t in select["deny"]],
        limit=SELECT_LIMIT,
        models=True,
        blueprints=False,
    )
    if not rows:
        raise AssemblyError(f"selector matched no models: {select}")
    if len(rows) >= SELECT_LIMIT:
        raise AssemblyError(
            f"selector hit the {SELECT_LIMIT}-row ceiling (silent truncation): {select}"
        )
    logger.info("selector %s matched %d models", select, len(rows))
    return rows


def _resolve_md5(curs: cursor, md5: str) -> Dict:
    rows = blueprint_sql.get_blueprints_by_md5(curs, md5)
    if not rows:
        raise AssemblyError(f"no blueprint with md5 {md5}")
    return rows[0]


def _resolve_full_name(curs: cursor, full_name: str) -> Dict:
    rows = blueprint_sql.get_blueprints_by_full_name(curs, full_name)
    if not rows:
        raise AssemblyError(f"no blueprint with full_name {full_name!r}")
    if len(rows) > 1:
        raise AssemblyError(
            f"full_name {full_name!r} is ambiguous ({len(rows)} blueprints); "
            "reference it by md5 instead"
        )
    return rows[0]


def _dedupe_models(rows: List[Dict]) -> List[Dict]:
    """Order-preserving dedupe by file_md5 (a file may match two entries)."""
    deduped = []
    seen = set()
    for row in rows:
        key = row.get("file_md5")
        if key not in seen:
            seen.add(key)
            deduped.append(row)
    return deduped


def _resolve_local_files(manifest: Dict, section: str) -> List[Dict]:
    """Resolve image/zip/other paths relative to the manifest, fail fast."""
    base = Path(manifest["manifest_dir"])
    resolved = []
    for entry in manifest["files"][section]:
        path = Path(entry["path"])
        if not path.is_absolute():
            path = base / path
        if not path.is_file():
            raise AssemblyError(f"{section} file not found: {path}")
        resolved.append({"path": str(path)})
    return resolved
