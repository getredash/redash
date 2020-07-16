from setuptools import setup, find_packages


setup(
    name="redash-dummy",
    version="0.2",
    description="Redash extensions for testing",
    author="Redash authors",
    license="MIT",
    packages=find_packages(),
    include_package_data=True,
    entry_points={
        "redash.extensions": [
            "working_extension = redash_dummy.extension:extension",
            "non_callable_extension = redash_dummy.extension:module_attribute",
            "not_findable_extension = redash_dummy.extension:missing_attribute",
            "not_importable_extension = missing_extension_module:extension",
            "assertive_extension = redash_dummy.extension:assertive_extension",
        ],
        "redash.periodic_jobs": ["dummy_periodic_job = redash_dummy.jobs:periodic_job"],
        "redash.bundles": [
            "wide_footer = redash_dummy",
        ],
    },
)
