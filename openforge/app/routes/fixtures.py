"""Admin routes for fixture loading via API."""

import json
import sys
from typing import Any, Dict, List

from flask import current_app, jsonify, request
from psycopg.rows import dict_row
from yaml import YAMLError, safe_load

from openforge.db.fixtures import (
    _is_blueprint_fixture,
    _is_tag_description_fixture,
    _is_tag_documentation_fixture,
    load_tag_description_fixture,
    load_tag_documentation_fixture,
    print_comparison_results,
)
from openforge.db.fixtures.incremental import IncrementalFixturesLoader


class OutputCapture:
    """Capture stderr and stdout for API response.

    Note: This class modifies global sys.stdout and sys.stderr, which is not
    thread-safe. However, this is acceptable for our use case since:
    1. We run on AWS Lambda (single-threaded per request)
    2. The redirection is scoped to a single endpoint execution via context manager
    3. Output mixing would only occur with concurrent requests to this endpoint

    In a traditional multi-threaded WSGI server, consider using thread-local
    storage or passing an output collector to functions instead.
    """

    def __init__(self):
        self.output: List[str] = []
        self._original_stderr = sys.stderr
        self._original_stdout = sys.stdout

    def __enter__(self):
        sys.stderr = self
        sys.stdout = self
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stderr = self._original_stderr
        sys.stdout = self._original_stdout

    def write(self, message: str):
        """Capture write calls from print/stderr.write."""
        if message and message != "\n":
            self.output.append(message.rstrip())

    def flush(self):
        """No-op for compatibility."""
        pass


def load_fixture():
    """
    Load a fixture file via API upload.

    Expects:
        - Request body: Raw fixture file content (JSON or YAML)
        - Query params:
            - dry_run: boolean (optional)
            - verbose: boolean (optional)
        - Authorization header with API token

    Returns:
        JSON response with comparison results and output logs
    """
    try:
        # Get query parameters
        dry_run = request.args.get("dry_run", "false").lower() == "true"
        verbose = request.args.get("verbose", "false").lower() == "true"

        # Get raw request data
        raw_data = request.get_data(as_text=True)
        if not raw_data:
            return jsonify({"success": False, "error": "No fixture data provided"}), 400

        # Capture all output
        output_capture = OutputCapture()

        with output_capture:
            # Parse the data - try JSON first, then YAML
            # We use the parsed data structure to determine fixture type,
            # not the text format
            try:
                content_type = request.content_type or ""
                if "yaml" in content_type or "yml" in content_type:
                    # Content-Type suggests YAML, try that first
                    data = safe_load(raw_data)
                else:
                    # Default to JSON, with YAML fallback
                    try:
                        data = json.loads(raw_data)
                    except json.JSONDecodeError:
                        data = safe_load(raw_data)
            except (json.JSONDecodeError, YAMLError) as e:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"Failed to parse fixture data: {str(e)}",
                            "output": output_capture.output,
                        }
                    ),
                    400,
                )

            # Detect fixture type
            fixture_type = _get_fixture_type_from_data(data)

            if verbose:
                sys.stderr.write(f"Processing fixture type: {fixture_type}\n")

            # Process the fixture
            try:
                # Use connection() method which handles both pool and non-pool modes
                with current_app.db.connection() as conn:
                    with conn.transaction():
                        with conn.cursor(row_factory=dict_row) as curs:
                            if fixture_type == "blueprint":
                                result = _process_blueprint_fixture(
                                    data, curs, dry_run, verbose
                                )
                            elif fixture_type == "tag_description":
                                result = _process_tag_description_fixture(
                                    data, curs, dry_run, verbose
                                )
                            elif fixture_type == "tag_documentation":
                                result = _process_tag_documentation_fixture(
                                    data, curs, dry_run, verbose
                                )
                            else:
                                raise ValueError(
                                    f"Unknown fixture type: {fixture_type}"
                                )

                            # Add output to result
                            result["output"] = output_capture.output
                            result["success"] = True

                            return jsonify(result), 200

            except Exception as e:
                current_app.logger.exception("Error processing fixture")
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": str(e),
                            "output": output_capture.output,
                        }
                    ),
                    500,
                )

    except Exception as e:
        current_app.logger.exception("Unexpected error in load_fixture")
        # Include output field for consistency with other error responses
        return jsonify({"success": False, "error": str(e), "output": []}), 500


def _get_fixture_type_from_data(data: Any) -> str:
    """Determine fixture type from data structure.

    Args:
        data: Parsed fixture data

    Returns:
        'blueprint', 'tag_description', or 'tag_documentation'

    Raises:
        ValueError: If the fixture type cannot be determined.
    """
    if isinstance(data, list):
        # Blueprints are lists of blueprint objects.
        return "blueprint"

    if isinstance(data, dict):
        # Dictionaries can be tag_description or tag_documentation.
        # We can distinguish them by checking the type of their values.
        first_value = next(iter(data.values()), None)
        if isinstance(first_value, list):
            # Tag documentation values are lists of documents.
            return "tag_documentation"
        else:
            # Tag description values are strings. This also handles empty dicts.
            return "tag_description"

    raise ValueError(
        f"Cannot determine fixture type for data of type {type(data).__name__}"
    )


def _process_blueprint_fixture(
    data: List[Dict], curs, dry_run: bool, verbose: bool
) -> Dict:
    """Process a blueprint fixture.

    Args:
        data: List of blueprint fixture objects
        curs: Database cursor
        dry_run: If True, don't apply changes
        verbose: If True, output debug information

    Returns:
        Dictionary with comparison results
    """
    # Validate blueprint fixture
    _is_blueprint_fixture(data)

    # Use incremental loader
    loader = IncrementalFixturesLoader(curs.connection, verbose=verbose)
    changes = loader.compare_fixture_data(data, curs=curs)

    if dry_run:
        sys.stderr.write("DRY RUN: Changes would be:\n")
        print_comparison_results(changes)
        return {
            "added": [_format_item(item) for item in changes.added],
            "modified": [_format_item(item) for item in changes.modified],
            "deprecated": [_format_item(item) for item in changes.deprecated],
            "consolidated": [_format_item(item) for item in changes.consolidated],
            "errors": changes.errors,
        }
    else:
        loader.apply_incremental_changes(changes, curs=curs)
        return {
            "added": [_format_item(item) for item in changes.added],
            "modified": [_format_item(item) for item in changes.modified],
            "deprecated": [_format_item(item) for item in changes.deprecated],
            "consolidated": [_format_item(item) for item in changes.consolidated],
            "errors": changes.errors,
        }


def _process_tag_description_fixture(
    data: Dict, curs, dry_run: bool, verbose: bool
) -> Dict:
    """Process a tag description fixture.

    Args:
        data: Dict of tag->description mappings
        curs: Database cursor
        dry_run: If True, don't apply changes
        verbose: If True, output debug information

    Returns:
        Dictionary with results
    """
    # Validate tag description fixture
    _is_tag_description_fixture(data)

    if dry_run:
        sys.stderr.write(f"DRY RUN: Would load {len(data)} tag descriptions\n")
        return {
            "added": [],
            "modified": [{"name": key} for key in data.keys()],
            "deprecated": [],
            "consolidated": [],
            "errors": [],
        }
    else:
        count = load_tag_description_fixture(curs, data)
        sys.stderr.write(f"Applied {count} tag descriptions\n")
        return {
            "added": [],
            "modified": [{"name": key} for key in data.keys()],
            "deprecated": [],
            "consolidated": [],
            "errors": [],
        }


def _process_tag_documentation_fixture(
    data: Dict, curs, dry_run: bool, verbose: bool
) -> Dict:
    """Process a tag documentation fixture.

    Args:
        data: Dict of tag->documentation entries mappings
        curs: Database cursor
        dry_run: If True, don't apply changes
        verbose: If True, output debug information

    Returns:
        Dictionary with results
    """
    # Validate tag documentation fixture
    _is_tag_documentation_fixture(data)

    if dry_run:
        total_docs = sum(len(docs) for docs in data.values())
        sys.stderr.write(
            f"DRY RUN: Would load {total_docs} tag documentation entries\n"
        )
        return {
            "added": [],
            "modified": [{"name": key} for key in data.keys()],
            "deprecated": [],
            "consolidated": [],
            "errors": [],
        }
    else:
        count = load_tag_documentation_fixture(curs, data)
        sys.stderr.write(f"Applied {count} tag documentation entries\n")
        return {
            "added": [],
            "modified": [{"name": key} for key in data.keys()],
            "deprecated": [],
            "consolidated": [],
            "errors": [],
        }


def _format_item(item: Dict) -> Dict:
    """Format an item for API response.

    Args:
        item: Item from comparison results

    Returns:
        Formatted item with relevant fields
    """
    if "file_metadata" in item:
        return {
            "full_name": item["file_metadata"]["full_name"],
            "md5": item["file_metadata"]["md5"],
            "size": item["file_metadata"]["size"],
        }
    elif "full_name" in item:
        return {
            "full_name": item.get("full_name"),
            "md5": item.get("file_md5"),
            "size": item.get("file_size"),
        }
    else:
        return {"name": item.get("name", "unknown")}
