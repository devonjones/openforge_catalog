# Documentation System Integration Tests

This directory contains pytest-based integration tests for the OpenForge Catalog Documentation System API.

## Overview

The integration tests validate the complete documentation system including:
- Blueprint documentation endpoints
- Tag documentation endpoints  
- Authentication and error handling
- Test data setup and cleanup

## Prerequisites

1. **Flask Server Running**: Make sure the Flask server is running on localhost:5328
   ```bash
   python -m flask run --host=0.0.0.0 --port=5328
   ```

2. **Database Access**: Ensure the database is accessible and the documentation tables exist

3. **Python Dependencies**: Install pytest and requests
   ```bash
   pip install pytest requests
   ```

## Running the Tests

### Basic Test Execution

**Run all tests:**
```bash
pytest integration_tests/
```

**Run with verbose output:**
```bash
pytest integration_tests/ -v
```

**Run with detailed output:**
```bash
pytest integration_tests/ -v -s
```

### Running Specific Test Categories

**Blueprint Documentation Tests:**
```bash
pytest integration_tests/test_blueprint_documentation.py -v
```

**Tag Documentation Tests:**
```bash
pytest integration_tests/test_tag_documentation.py -v
```

**Authentication Tests:**
```bash
pytest integration_tests/test_authentication.py -v
```

### Environment Configuration

You can configure test settings via environment variables:

```bash
export TEST_BASE_URL="http://localhost:5328"
export TEST_API_KEY="your-api-key"
pytest integration_tests/
```

Or set them inline:
```bash
TEST_BASE_URL="http://localhost:5328" TEST_API_KEY="your-api-key" pytest integration_tests/
```

## Test Structure

### Fixtures (conftest.py)

- **base_url**: API server base URL (configurable via TEST_BASE_URL)
- **api_key**: Authentication API key (configurable via TEST_API_KEY)
- **db**: Database connection for test data management
- **test_blueprint_id**: Gets a real blueprint ID from the API for testing
- **test_tag_documentation**: Creates test tag documentation for the session
- **cleanup_test_data**: Cleans up test data before/after each test
- **api_client**: Authenticated API client for making requests
- **api_client_no_auth**: API client without authentication

### Test Categories

#### Blueprint Documentation Tests (test_blueprint_documentation.py)
- CRUD operations on blueprint documentation
- Changelog history retrieval
- All documentation aggregation
- Authentication requirements
- Error handling for invalid inputs

#### Tag Documentation Tests (test_tag_documentation.py)
- CRUD operations on tag documentation
- Multiple documentation entries per tag
- Document type validation
- Ordering and pagination
- Authentication requirements

#### Authentication & Error Handling Tests (test_authentication.py)
- Authentication requirement validation
- Invalid input handling
- SQL injection prevention
- XSS attempt handling
- Large payload handling

## Test Data Management

### Automatic Setup
- Test tag documentation is created at the start of the test session
- Test blueprint documentation is created as needed during tests
- All test data is automatically cleaned up after tests

### Test Data Isolation
- Each test function gets a clean database state
- Test data is isolated between tests
- No interference between test runs

## Expected Results

When all tests pass, you should see:
```
============================= test session starts ==============================
platform linux -- Python 3.x.x, pytest-x.x.x, pluggy-x.x.x
rootdir: /path/to/openforge_catalog
plugins: ...
collected XX items

integration_tests/test_authentication.py ........                        [ 40%]
integration_tests/test_blueprint_documentation.py ................        [ 80%]
integration_tests/test_tag_documentation.py ........                    [100%]

============================== XX passed in X.XXs ==============================
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Make sure Flask server is running
   ```bash
   python -m flask run --host=0.0.0.0 --port=5328
   ```

2. **Database Connection Failed**: Check environment variables and database status
   ```bash
   # Check if database is accessible
   python -c "from openforge.db import PgDB; PgDB(os.environ)"
   ```

3. **Authentication Errors**: Verify API key is correct
   ```bash
   export TEST_API_KEY="your-actual-api-key"
   ```

4. **Import Errors**: Ensure you're running from the project root
   ```bash
   cd /path/to/openforge_catalog
   pytest integration_tests/
   ```

### Debug Mode

**Run with maximum verbosity:**
```bash
pytest integration_tests/ -v -s --tb=long
```

**Run a single test:**
```bash
pytest integration_tests/test_blueprint_documentation.py::TestBlueprintDocumentation::test_get_blueprint_documentation -v -s
```

**Run with print statements visible:**
```bash
pytest integration_tests/ -v -s --capture=no
```

### Test Reports

**Generate HTML test report:**
```bash
pytest integration_tests/ --html=test_report.html --self-contained-html
```

**Generate JUnit XML report:**
```bash
pytest integration_tests/ --junitxml=test_results.xml
```

## File Structure

```
integration_tests/
├── __init__.py                           # Python package marker
├── README.md                             # This file
├── conftest.py                           # Pytest configuration and fixtures
├── test_blueprint_documentation.py       # Blueprint documentation tests
├── test_tag_documentation.py             # Tag documentation tests
├── test_authentication.py                # Authentication and error handling tests
├── run_tests.py                          # Legacy test runner (deprecated)
└── legacy_validation.py                  # Old validation script (for reference)
```

## Continuous Integration

These tests are designed to work in CI environments. Set the following environment variables:

```yaml
# Example GitHub Actions configuration
env:
  TEST_BASE_URL: http://localhost:5328
  TEST_API_KEY: ${{ secrets.TEST_API_KEY }}
  # Add your database environment variables here
```

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Use the provided fixtures for database access and API clients
3. Ensure tests are isolated and don't interfere with each other
4. Add appropriate error handling and edge case testing
5. Update this README if adding new test categories or configuration options 