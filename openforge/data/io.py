"""
I/O utilities for OpenForge file processing.

This module provides shared functionality for S3 operations, file uploads,
and thumbnail creation used by both scanner.py and incremental.py.
"""

import os
import sys
from typing import Dict, Optional, Set

import boto3
import sh
from botocore.client import Config
from botocore.exceptions import ClientError


def get_s3_client(config: Dict) -> boto3.client:
    """Create S3 client for Cloudflare R2.

    Args:
        config: Configuration dictionary with AWS credentials and endpoint

    Returns:
        Configured boto3 S3 client

    Raises:
        KeyError: If required credentials are missing from both config and environment
    """
    # Get credentials from config or environment variables
    endpoint_url = config.get("CLOUDFLARE_ENDPOINT") or os.environ.get(
        "CLOUDFLARE_ENDPOINT"
    )
    access_key_id = config.get("AWS_ACCESS_KEY_ID") or os.environ.get(
        "AWS_ACCESS_KEY_ID"
    )
    secret_access_key = config.get("AWS_SECRET_ACCESS_KEY") or os.environ.get(
        "AWS_SECRET_ACCESS_KEY"
    )

    # Validate required credentials
    if not endpoint_url:
        raise KeyError(
            "CLOUDFLARE_ENDPOINT not found in config or environment variables"
        )
    if not access_key_id:
        raise KeyError("AWS_ACCESS_KEY_ID not found in config or environment variables")
    if not secret_access_key:
        raise KeyError(
            "AWS_SECRET_ACCESS_KEY not found in config or environment variables"
        )

    s3_client = boto3.client(
        service_name="s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    return s3_client


def create_image(name: str, url: str) -> Dict:
    """Create image object for fixture.

    Args:
        name: Image name
        url: Image URL

    Returns:
        Image object dictionary
    """
    return {"image_name": name, "image_url": url}


def get_s3_key_cache(
    s3_client: boto3.client, config: Dict, verbose: bool = False
) -> Set[str]:
    """Pre-fetch all S3 object keys for efficient upload checking.

    Performance testing showed this approach is significantly faster than
    individual head_object calls for each file, especially for buckets with
    many objects. This prevents excessive back-and-forth API calls.

    Args:
        s3_client: Configured S3 client
        config: Configuration dictionary containing S3_BUCKET_NAME
        verbose: Whether to print debug statements

    Returns:
        Set of existing S3 object keys
    """
    bucket = config.get("S3_BUCKET_NAME", "openforge-models")
    if verbose:
        sys.stderr.write(f"DEBUG: Pre-fetching S3 keys from bucket: {bucket}\n")

    s3_key_cache = set()

    paginator = s3_client.get_paginator("list_objects_v2")
    page_count = 0
    for page in paginator.paginate(Bucket=bucket):
        page_count += 1
        for obj in page.get("Contents", []):
            s3_key_cache.add(obj["Key"])

    return s3_key_cache


def upload_file(
    file_metadata: Dict,
    file_path: str,
    s3_client: boto3.client,
    object_path: str,
    s3_key_cache: Optional[Set[str]] = None,
    config: Optional[Dict] = None,
    verbose: bool = False,
) -> str:
    """Upload file to S3 storage.

    Args:
        file_metadata: File metadata dictionary
        file_path: Path to file to upload
        s3_client: Configured S3 client
        object_path: S3 object path prefix
        s3_key_cache: Optional cache of existing S3 keys
            (use get_s3_key_cache for best performance)
        config: Configuration dictionary containing S3_BUCKET_NAME
        verbose: Whether to print debug statements

    Returns:
        S3 object name
    """
    bucket = (
        config.get("S3_BUCKET_NAME", "openforge-models")
        if config
        else "openforge-models"
    )
    _, fn = os.path.split(file_path)
    parts = fn.split(".")
    extension = parts.pop()
    object_name = (
        f"{object_path}/{file_metadata['md5'][:6]}/{file_metadata['md5']}.{extension}"
    )

    # Check cache first
    if s3_key_cache is not None and object_name in s3_key_cache:
        return object_name

    try:
        s3_client.head_object(Bucket=bucket, Key=object_name)
    except ClientError as ce:
        if ce.response["Error"]["Code"] == "404":
            sys.stderr.write(f"Uploading: {file_path}\n")
            with open(file_path, "rb") as file_handle:
                s3_client.upload_fileobj(file_handle, bucket, object_name)
        else:
            raise ce

    return object_name


def create_thumbnail(file_path: str) -> str:
    """Create thumbnail for STL file.

    Args:
        file_path: Path to STL file

    Returns:
        Path to created thumbnail
    """
    path, fn = os.path.split(file_path)
    parts = fn.split(".")
    _ = parts.pop()
    base = ".".join(parts)
    thumb_path = os.path.join(path, f"{base}-thumb.png")
    sh.stl_thumb(file_path, thumb_path)
    return thumb_path
