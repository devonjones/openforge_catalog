import logging
from flask import current_app
from psycopg_pool import ConnectionPool

LOGGER = logging.getLogger(__name__)


class PgDB:
    def __init__(self, vars, ext_logger=None):
        self.database_url = db_url(vars, ext_logger)
        self.pool = ConnectionPool(self.database_url)

    def __del__(self):
        self.pool.close()


def db_url(vars, ext_logger=None):
    args = {
        "user": "openforge",
        "database": "openforge",
        "password": "openforge",
        "host": "localhost",
        "port": 5432,
    }
    LOGGER = ext_logger if ext_logger else logging.getLogger(__name__)
    if "PGUSER" in vars:
        args["user"] = vars["PGUSER"]
    if "PGPASSWORD" in vars:
        args["password"] = vars["PGPASSWORD"]
    if "PGHOST" in vars:
        args["host"] = vars["PGHOST"]
    if "PGPORT" in vars:
        args["port"] = vars["PGPORT"]
    if "PGDATABASE" in vars:
        args["database"] = vars["PGDATABASE"]
    if "LOG_LEVEL" in vars:
        LOGGER.setLevel(vars["LOG_LEVEL"])

    return f'postgresql://{args["user"]}:{args["password"]}@{args["host"]}:{args["port"]}/{args["database"]}'


def get_logger():
    if current_app:
        return current_app.logger
    return LOGGER
