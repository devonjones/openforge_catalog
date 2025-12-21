import logging

from psycopg_pool import ConnectionPool

logger = logging.getLogger(__name__)


class PgDB:
    def __init__(self, vars):
        self.database_url = db_url(vars)
        self.pool = ConnectionPool(self.database_url)

    def __del__(self):
        self.pool.close()


def db_url(vars):
    args = {
        "user": "openforge",
        "database": "openforge",
        "password": "openforge",
        "host": "localhost",
        "port": 5432,
    }
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

    return f'postgresql://{args["user"]}:{args["password"]}@{args["host"]}:{args["port"]}/{args["database"]}'
