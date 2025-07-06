from importlib import resources as impresources
from pathlib import Path

from yaml import safe_load
import jsonschema
from jsonschema.validators import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012


def load_schema(fn: str) -> dict:
    from . import schemas

    inp_file = impresources.files(schemas) / fn
    with inp_file.open("r") as f:
        return safe_load(f)


def create_registry():
    """Create a registry that can load referenced schemas from the schemas directory."""
    from . import schemas
    
    def retrieve_schema(uri: str):
        """Retrieve a schema from the schemas directory."""
        try:
            # Load the referenced schema
            referenced_schema = load_schema(uri)
            return Resource.from_contents(referenced_schema)
        except Exception:
            from referencing.exceptions import NoSuchResource
            raise NoSuchResource(ref=uri)
    
    # Create a registry with our custom retrieval function
    registry = Registry(retrieve=retrieve_schema)
    return registry


def validate_schema(schema_name: str, data: dict, required: bool = True):
    schema = load_schema(schema_name)
    if not required:
        schema["required"] = []
    
    # Create a validator with our custom registry
    registry = create_registry()
    validator = Draft202012Validator(schema, registry=registry)
    validator.validate(data)
