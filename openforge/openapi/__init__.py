from importlib import resources as impresources

from yaml import safe_load
import jsonschema


def load_schema(fn: str) -> dict:
    from . import schemas

    inp_file = impresources.files(schemas) / fn
    with inp_file.open("r") as f:
        return safe_load(f)


def validate_schema(schema_name: str, data: dict, required: bool = True):
    schema = load_schema(schema_name)
    if not required:
        schema["required"] = []
    jsonschema.validate(data, schema)
