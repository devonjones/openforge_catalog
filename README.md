# Openforge Catalog

This project is intended to be a catalog for [OpenForge Tiles](https://www.patreon.com/masterworktools).

## Requirements
You can find the requirements doc [here](https://docs.google.com/document/d/1AsAbTz99Y2m1czJOqDRBioZbbSjlf0wSlSYKCgjgMDo/edit?tab=t.0#heading=h.9nuedarlncyy).

## Boilerplate
This project was created using nextjs-flask.  Information about the boilerplate and basics of how to use it can be found in [BOILERPLATE.md](BOILERPLATE.md)

## License

### Python
All python code in this project is licensed under the PSFL.  The license text can be found under [api/LICENSE.txt](api/LICENSE.txt).

### Node
All node code in this project is licensed under the MIT license.  The licene text can be found under [app/LICENSE.txt](app/LICENSE.txt)

## Setup

### API Token
There is a default API token set when in development mode.  That token is "1234567890".  You can change it by setting the `API_TOKEN` environment variable.

To call any write endpoint, you need to pass the API token in the `Authorization` header with the value `Bearer <API_TOKEN>`.

### Node

Install pnpm:

`curl -fsSL https://get.pnpm.io/install.sh | sh -`

### Python
We use [pyenv](https://github.com/pyenv/pyenv) to manage python versions.

We also use [pyenv-virtualenv](https://github.com/pyenv/pyenv-virtualenv) to manage virtual environments.  First, install the version of python we use: 3.11.2.  You can install it with `pyenv install 3.11.2`.  To create a virtual environment for this project, run `pyenv virtualenv 3.11.2 openforge_catalog`. 

To activate the virtual environment, run `pyenv activate openforge_catalog`.

To deactivate the virtual environment, run `pyenv deactivate`.

Dont exit the virtual environment, you'll need it for the next step.

Now we will do virtualenvwrapper.  First install it `pip install virtualenvwrapper`.  Until I come up with a better solution, you'll need to use pyenv-virtualenvwrapper to manage your virtual environments.  You can find more information about it [here](https://github.com/pyenv/pyenv-virtualenvwrapper).  Easiest way to install it is to run `git clone https://github.com/pyenv/pyenv-virtualenvwrapper.git $(pyenv root)/plugins/pyenv-virtualenvwrapper`. If you're using mac try to use `brew install pyenv-virtualenvwrapper` instead.

Then, run `pyenv virtualenvwrapper` to initialize virtualenvwrapper.  Next, run `add2virtualenv .` to add the local directory to the virtualenv.

Now you can install the dependencies with `pip install -r requirements.txt` and install setuptools with `pip install setuptools`.

Finally, run `./setup.py install` to install the dependencies.

### Postgres
You need to have postgres installed on your machine.  You can find more information about it [here](https://www.postgresql.org/download/).

For Debian/Ubuntu users: `sudo apt install libpq-dev libyaml-dev postgresql-client`

For Mac users: `brew install libpq` & `brew install postgresql` & `brew install openssl`

After that, recompile psycopg with `pip install --upgrade --force-reinstall psycopg==3.2.3` and `pip install "psycopg[binary]==3.2.3"`.

To start the postgres container, run `docker compose up -d`.

To connect to the postgres container, run `psql -U openforge -W openforge -h 127.0.0.1`.

To run the db update script, run `bin/db_update`.

If you want to load the fixtures, run `bin/db_fixtures`.

Now you can run `yarn flask-dev` to start the flask server.

## Schema
### Blueprint type

```sql
CREATE TYPE blueprint_type
AS ENUM ('model', 'blueprint')
```

### Blueprint

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
blueprint_name TEXT NOT NULL
blueprint_type blueprint_type NOT NULL
config JSONB NOT NULL
file_size INT
file_md5 TEXT
file_name TEXT
full_name TEXT
file_changed_at TIMESTAMP
file_modified_at TIMESTAMP
storage_address TEXT
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE NULLS NOT DISTINCT (file_md5)
```

### Tag

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
blueprint_id UUID NOT NULL REFERENCES blueprints(id)
tag TEXT ARRAY NOT NULL
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### Image

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
image_name TEXT NOT NULL
image_url TEXT NOT NULL UNIQUE
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### Blueprint Image

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
blueprint_id UUID NOT NULL REFERENCES blueprints(id)
image_id UUID NOT NULL REFERENCES images(id)
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE NULLS NOT DISTINCT (blueprint_id, image_id)
```

### Documentation

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
documentation_name TEXT NOT NULL
document TEXT NOT NULL
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### Blueprint Documentation

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
blueprint_id UUID NOT NULL REFERENCES blueprints(id)
documentation_id UUID NOT NULL REFERENCES documentation(id)
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```
