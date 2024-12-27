from openforge.app import init_app
from flask import Flask

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
