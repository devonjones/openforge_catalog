from flask import Flask, request

from openforge.app import init_app
import openforge.app.routes.blueprints as blueprint_routes
import openforge.app.routes.tags as tag_routes
from openforge.openapi import validate_schema


app = Flask(__name__)
init_app(app)


@app.route("/api/blueprints", methods=["GET", "POST"])
def blueprints():
    if request.method == "GET":
        return blueprint_routes.get_blueprints()
    elif request.method == "POST":
        return blueprint_routes.create_blueprint()


@app.route("/api/blueprints/<blueprint_id>", methods=["GET", "PATCH", "DELETE"])
def blueprint(blueprint_id):
    if request.method == "GET":
        return blueprint_routes.get_blueprint_by_id(blueprint_id)
    elif request.method == "PATCH":
        return blueprint_routes.update_blueprint(blueprint_id)
    elif request.method == "DELETE":
        return blueprint_routes.delete_blueprint(blueprint_id)


@app.route("/api/blueprints/tags", methods=["POST"])
def tags():
    return tag_routes.query_tags()


@app.route("/api/blueprints/tags/<tag>", methods=["GET"])
def blueprints_by_tag(tag):
    return tag_routes.get_blueprint_ids_by_tag(tag)


@app.route("/api/blueprints/<blueprint_id>/tags", methods=["GET", "POST", "DELETE"])
def blueprint_tags(blueprint_id):
    if request.method == "GET":
        return tag_routes.get_blueprint_tags(blueprint_id)
    elif request.method == "POST":
        validate_schema("tags.yaml", request.json)
        tag_routes.replace_blueprint_tags(blueprint_id, request.json)
        return blueprint_routes.get_blueprint_by_id(blueprint_id)
    elif request.method == "DELETE":
        return tag_routes.delete_blueprint_tags(blueprint_id)


@app.route("/api/blueprints/<blueprint_id>/tags/<tag>", methods=["POST", "DELETE"])
def blueprint_tag(blueprint_id, tag):
    if request.method == "POST":
        return tag_routes.create_blueprint_tags(blueprint_id, [tag])
    elif request.method == "DELETE":
        return tag_routes.delete_blueprint_tag(blueprint_id, tag)
