#!/usr/bin/env python

from pathlib import Path
from setuptools import setup

# This is where you add any fancy path resolution to the local lib:
local_path: str = (Path(__file__).parent / "openforge").as_uri()

with open("requirements.txt") as f:
    required = f.read().splitlines()

required.append(f"package-name @ {local_path}")
setup(
    install_requires=required,
    packages=["openforge"],
    scripts=["bin/db_update", "bin/dropbox_scanner"],
)
