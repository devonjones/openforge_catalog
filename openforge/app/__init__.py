import os

from flask import Flask

from openforge.db import PgDB


def init_app(app: Flask):
    db = PgDB(app.config)
    app.config["API_TOKEN"] = os.environ.get("API_TOKEN", "1234567890")
    app.db = db
