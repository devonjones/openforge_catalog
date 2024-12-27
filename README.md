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

### Node

Install pnpm:

`curl -fsSL https://get.pnpm.io/install.sh | sh -`

### Python
We use [pyenv](https://github.com/pyenv/pyenv) to manage python versions.  To install the python version specified in the `.python-version` file, run `pyenv install`.

We also use [pyenv-virtualenv](https://github.com/pyenv/pyenv-virtualenv) to manage virtual environments.  To create a virtual environment for this project, run `pyenv virtualenv 3.12.1 openforge_catalog`.

To activate the virtual environment, run `pyenv activate openforge_catalog`.

To deactivate the virtual environment, run `pyenv deactivate`.

Finally, until I come up with a better solution, you'll need to use pyenv-virtualenvwrapper to manage your virtual environments.  To install pyenv-virtualenvwrapper, run `pip install pyenv-virtualenvwrapper`.

Then, run `pyenv virtualenvwrapper` to initialize virtualenvwrapper.  Next, run `add2virtualenv .` to add the local directory to the virtualenv.

Finally, run `setup.py install` to install the dependencies.

### Postgres
To start the postgres container, run `docker compose up -d`.

To connect to the postgres container, run `psql -U openforge -W openforge -h 127.0.0.1`.

To run the db update script, run `bin/db_update`.

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
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### Blueprint Configuration

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
blueprint_id UUID NOT NULL REFERENCES blueprints(id)
configuration_name TEXT NOT NULL
config JSONB NOT NULL
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### File

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
blueprint_id UUID NOT NULL REFERENCES blueprints(id)
file_size INT NOT NULL
file_md5 TEXT NOT NULL
file_name TEXT NOT NULL
full_name TEXT NOT NULL
file_changed_at TIMESTAMP NOT NULL
file_modified_at TIMESTAMP NOT NULL
storage_address TEXT
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE INDEX file_name_idx ON md5 (md5)
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
image_url TEXT NOT NULL
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
