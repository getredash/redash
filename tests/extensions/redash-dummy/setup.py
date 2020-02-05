from setuptools import setup


setup(
    name="redash-dummy",
    version="0.1",
    description="Redash extensions for testing",
    author="Redash authors",
    license="MIT",
    entry_points={
        "redash.extensions": [
            "working_extension = redash_dummy:extension",
            "non_callable_extension = redash_dummy:module_attribute",
            "not_findable_extension = redash_dummy:missing_attribute",
            "not_importable_extension = missing_extension_module:extension",
            "assertive_extension = redash_dummy:assertive_extension",
        ],
        "redash.periodic_tasks": ["dummy_periodic_task = redash_dummy:periodic_task"],
    },
    py_modules=["redash_dummy"],
)
