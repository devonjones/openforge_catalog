from flask import Flask, g
from openforge.db import PgDB


def init_app(app: Flask):
    db = PgDB(app.config)
    app.db = db
