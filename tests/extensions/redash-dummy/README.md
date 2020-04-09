# How to update the dummy extension?

If you'd like to extend the dummy extension, please update the ``setup.py``
file and the ``redash_dummy.py`` module.

Please make sure to regenerate the *.egg-info directory. See below.

# How to generate the redash_dummy.egg-info directory?

The `egg-info` directory is what is usually created in the
site-packages directory when running `pip install <packagename>` and
contains the metadata derived from the `setup.py` file.

In other words, it's auto-generated and you'll need to follow the following
steps to update it (e.g. when extending the extension tests). From the
host computer (assuming the Docker development environment) run:

- `make bash` -- to create container running with Bash and entering it
- `cd tests/extensions/redash-dummy/` -- change the directory to the directory with the dummy extension
- `python setup.py egg_info` -- to create/update the egg-info directory

The egg-info directory is *not* cleaned up by pip, just the link in the `~/.local` site-packages directory.
