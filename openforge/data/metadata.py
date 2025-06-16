import os
import sys

from yaml import safe_load
from openforge.db.sql.tag_utils import tag_to_array

def get_metadata_file(path):
    metadata_file = os.path.join(path, "metadata.yaml")
    if os.path.exists(metadata_file):
        try:
            with open(metadata_file, "r") as f:
                return safe_load(f)
        except Exception as e:
            sys.stderr.write(f"Error reading metadata file: {e}\n")
    return None


def metadata_ignore(metadata):
    if metadata is None:
        return False
    if "ignore" in metadata:
        return metadata["ignore"]
    return False


def metadata_auto(metadata):
    if metadata is None:
        return True
    if "auto" in metadata:
        return metadata["auto"]
    return True


def apply_metadata(metadata, o):
    if metadata is None:
        return
    if "ignore" in metadata:
        del metadata["ignore"]
    if "auto" in metadata:
        del metadata["auto"]
    if "tags" in metadata:
        for tag in metadata["tags"]:
            add_tag(o, tag)
        del metadata["tags"]
    if "config" in metadata:
        o["config"] = metadata["config"]
        del metadata["config"]
    if "edit" in metadata:
        apply_metadata_edit(metadata["edit"], o)
        del metadata["edit"]
    assert len(metadata) == 0, metadata


def apply_metadata_edit(edit, o):
    if "tags" in edit:
        if "add" in edit["tags"]:
            for tag in edit["tags"]["add"]:
                add_tag(o, tag)
        if "remove" in edit["tags"]:
            for tag in edit["tags"]["remove"]:
                remove_tag(o, tag)
        del edit["tags"]
    assert len(edit) == 0, edit


def has_tag(o, tag):
    return tag in o["tags"]


def has_tags(o, tags):
    for tag in tags:
        if not has_tag(o, tag):
            return False
    return True


def has_no_tags(o, tags):
    for tag in tags:
        if has_tag(o, tag):
            return False
    return True


def apply_default_metadata(o):
    apply_openforge_wall(o)
    apply_openforge_floor(o)
    apply_thick_wall(o)


def is_openforge_wall(o):
    tags = [("shape", "wall"), ("connection", "openforge")]
    neg_tags = [("build", "s2w"), ("shape", "floor"), ("shape", "base")]
    if has_tags(o, tags) and has_no_tags(o, neg_tags):
        return True
    tags = [("shape", "wall", "low"), ("connection", "openforge"), ("build", "thick wall")]
    if has_tags(o, tags) and has_no_tags(o, neg_tags):
        return True
    return False


def is_openforge_floor(o):
    tags = [("shape", "floor"), ("connection", "openforge")]
    neg_tags = [("build", "s2w"), ("shape", "wall"), ("shape", "base")]
    if has_tags(o, tags) and has_no_tags(o, neg_tags):
        return True


def is_thick_wall(o):
    tags = [("build", "thick wall"), ("connection", "openforge"), ("component", "wall")]
    neg_tags = [("build", "s2w"), ("shape", "base")]
    if has_tags(o, tags) and has_no_tags(o, neg_tags):
        return True


def apply_openforge_wall(o):
    if not is_openforge_wall(o):
        return
    config = o.setdefault("config", {})
    parts = config.setdefault("parts", [])
    parts.append(
        {
            "name": "base",
            "tags": {
                "require": [
                    {"tag": "shape|base"},
                ],
                "constrain": [
                    {"tag": "shape"},
                    {"tag": "size|width"},
                    {"tag": "texture"},
                ]
                
            },
            "optional": True,
        }
    )
    config["parts"] = parts
    o["config"] = config


def apply_openforge_floor(o):
    if not is_openforge_floor(o):
        return
    config = o.setdefault("config", {})
    parts = config.setdefault("parts", [])
    parts.append(
        {
            "name": "base",
            "tags": {
                "require": [
                    {"tag": "shape|base"},
                ],
                "deny": [
                    {"tag": "build|s2w"},
                ],
                "constrain": [
                    {"tag": "shape"},
                    {"tag": "size|width"},
                    {"tag": "size|depth"},
                    {"filter": "shape|floor"},
                    {"filter": "shape|wall"},
                ]
                
            },
            "optional": True,
        }
    )
    config["parts"] = parts
    o["config"] = config

def apply_thick_wall(o):
    if not is_thick_wall(o):
        return
    config = o.setdefault("config", {})
    parts = config.setdefault("parts", [])
    parts.append(
        {
            "name": "base",
            "tags": {
                "require": [
                    {"tag": "shape|base"},
                ],
                "deny": [
                    {"tag": "build|s2w"},
                ],
                "constrain": [
                    {"tag": "shape"},
                    {"tag": "size|width"},
                    {"tag": "size|depth"},
                ],
            },
            "optional": True,
        }
    )
    config["parts"] = parts
    o["config"] = config

def add_tag(o: dict, tag: str):
    if "tags" not in o:
        o["tags"] = set()
    o["tags"].add(tuple(tag_to_array(tag)))

def remove_tag(o: dict, tag: str):
    if "tags" in o:
        o["tags"].remove(tuple(tag_to_array(tag)))
