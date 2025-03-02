import os

from flask import Flask
from dotenv import load_dotenv

from openforge.db import PgDB


def init_app(app: Flask):
    load_dotenv()
    db = PgDB(os.environ)
    app.config["API_TOKEN"] = os.environ.get("API_TOKEN", "1234567890")
    app.config["CLOUDFLARE_ENDPOINT"] = os.environ.get("CLOUDFLARE_ENDPOINT")
    app.config["CLOUDFLARE_ACCESS_KEY_ID"] = os.environ.get("CLOUDFLARE_ACCESS_KEY_ID")
    app.config["CLOUDFLARE_SECRET_ACCESS_KEY"] = os.environ.get(
        "CLOUDFLARE_SECRET_ACCESS_KEY"
    )
    app.db = db
