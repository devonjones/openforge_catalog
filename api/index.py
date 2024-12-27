from flask import Flask, request

from openforge.app import init_app
import openforge.app.routes.blueprints as blueprint_routes


app = Flask(__name__)
init_app(app)


@app.route("/api/python")
def hello_world():
    print("hello world")
    with app.db.pool.connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM blueprints")
            data = cursor.fetchall()
            print(data)
    return str(data)


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
