import json
import uuid

from psycopg import cursor, sql
from psycopg.types.json import Jsonb
from psycopg.errors import UniqueViolation
from werkzeug.exceptions import NotFound


def _blueprint_defaults(data: dict) -> dict:
    defaults = {
        "config": {},
        "file_md5": sql.NULL,
        "file_size": sql.NULL,
        "file_name": sql.NULL,
        "full_name": sql.NULL,
        "file_changed_at": sql.NULL,
        "file_modified_at": sql.NULL,
        "storage_address": sql.NULL,
    }
    defaults.update(data)
    defaults = _convert_blueprint_config(defaults)
    defaults["config"] = Jsonb(defaults["config"])
    print(defaults)
    return defaults


def _convert_blueprint_config(data: dict) -> dict:
    if "blueprint_config" in data:
        data["config"] = json.dumps(data["blueprint_config"])
        del data["blueprint_config"]
    return data


def _convert_config(data: dict) -> dict:
    if "config" in data:
        if isinstance(data["config"], str):
            data["blueprint_config"] = json.loads(data["config"])
        else:
            data["blueprint_config"] = data["config"]
        del data["config"]
    return data


def get_all_blueprints(curs: cursor) -> list[dict]:
    query = sql.SQL(
        """
SELECT id, blueprint_name, blueprint_type, config, file_md5, file_size,
       file_name, full_name, file_changed_at, file_modified_at, storage_address,
       created_at, updated_at
  FROM blueprints
"""
    )
    curs.execute(query)
    return [_convert_config(dict(row)) for row in curs.fetchall()]


def insert_blueprint(
    curs: cursor, data: dict, rescue_md5_conflict: bool = False
) -> dict:
    query_list = [
        sql.SQL(
            """
INSERT INTO blueprints (
  blueprint_name, blueprint_type, config, file_md5, file_size, file_name,
  full_name, file_changed_at, file_modified_at, storage_address
) VALUES (
  {blueprint_name}, {blueprint_type}, {config}, {file_md5}, {file_size}, {file_name},
  {full_name}, {file_changed_at}, {file_modified_at}, {storage_address}
)
"""
        ).format(**_blueprint_defaults(data))
    ]
    if rescue_md5_conflict:
        query_list.append(
            sql.SQL("ON CONFLICT ON CONSTRAINT blueprints_file_md5_key DO NOTHING")
        )
    query_list.append(sql.SQL("RETURNING id"))
    query = sql.Composed(query_list)
    curs.execute(query.join("\n"))
    row = curs.fetchone()
    if row:
        return get_blueprint_by_id(curs, row["id"])
    else:
        raise UniqueViolation("MD5 not unique")


def get_blueprint_by_id(curs: cursor, blueprint_id: uuid.UUID) -> dict:
    query = sql.SQL(
        """
SELECT id, blueprint_name, blueprint_type, config, file_md5, file_size,
       file_name, full_name, file_changed_at, file_modified_at, storage_address,
       created_at, updated_at
  FROM blueprints
  WHERE id = {blueprint_id}
"""
    ).format(blueprint_id=sql.Literal(blueprint_id))
    curs.execute(query)
    if curs.rowcount > 0:
        return _convert_config(dict(curs.fetchone()))
    else:
        raise NotFound("Blueprint not found")


def get_blueprint_by_md5(curs: cursor, md5: str) -> dict:
    query = sql.SQL(
        """
SELECT id, blueprint_name, blueprint_type, config, file_md5, file_size,
       file_name, full_name, file_changed_at, file_modified_at, storage_address,
       created_at, updated_at
  FROM blueprints
  WHERE file_md5 = %(md5)s
"""
    ).format(md5=sql.Literal(md5))
    curs.execute(query)
    if curs.rowcount > 0:
        return _convert_config(dict(curs.fetchone()))
    else:
        raise NotFound("Blueprint not found")


def update_blueprint(curs: cursor, blueprint_id: uuid.UUID, data: dict) -> dict:
    newdata = {}
    newdata.update(data)
    data = _convert_blueprint_config(newdata)
    query_list = [
        sql.SQL("UPDATE blueprints"),
        sql.SQL("  SET"),
    ]

    fields = [
        "blueprint_name",
        "blueprint_type",
        "config",
        "file_md5",
        "file_size",
        "file_name",
        "full_name",
        "file_changed_at",
        "file_modified_at",
        "storage_address",
    ]

    comma = ""
    for field in fields:
        if field in data:
            query_list.append(
                sql.SQL(f"{comma}{field} = " + "{value}").format(value=data[field])
            )
            comma = ", "

    query_list.append(
        sql.SQL("  WHERE id = {blueprint_id}").format(
            blueprint_id=sql.Literal(blueprint_id)
        )
    )
    query = sql.Composed(query_list)
    print(query.join("\n"))
    curs.execute(query.join("\n"))
    if curs.rowcount > 0:
        return get_blueprint_by_id(curs, blueprint_id)
    else:
        raise NotFound("Blueprint not found")


def delete_blueprint(curs: cursor, blueprint_id: uuid.UUID) -> dict:
    query = sql.SQL("DELETE FROM blueprints WHERE id = {blueprint_id}").format(
        blueprint_id=sql.Literal(blueprint_id)
    )
    curs.execute(query)
    return curs.rowcount


def delete_all_blueprints(curs: cursor) -> dict:
    query = sql.SQL("TRUNCATE blueprints CASCADE")
    curs.execute(query)
    return curs.rowcount
