import os
import sys

from yaml import safe_load

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
            o["tags"].add(tuple(tag.split("|")))
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
                o["tags"].add(tuple(tag.split("|")))
        if "remove" in edit["tags"]:
            for tag in edit["tags"]["remove"]:
                try:
                    o["tags"].remove(tuple(tag.split("|")))
                except KeyError as ke:
                    print(o["tags"])
                    raise ke
        del edit["tags"]
    assert len(edit) == 0, edit


def has_tag(o, tag):
    return tag in o["tags"]


def has_tags(o, tags):
    for tag in tags:
        if not has_tag(o, tag):
            return False
    return True


def apply_default_metadata(o):
    apply_openforge_wall(o)


def is_openforge_wall(o):
    tags = [("shape", "wall"), ("connection", "openforge")]
    neg_tags = [("build", "s2w")]
    if has_tags(o, tags) and not has_tags(o, neg_tags):
        return True
    return False


def apply_openforge_wall(o):
    if not is_openforge_wall(o):
        return
    config = o.setdefault("config", {})
    parts = o.setdefault("parts", [])
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