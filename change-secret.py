#!/usr/bin/env python

import click
from time import sleep

from flask import current_app
from flask.cli import FlaskGroup

from sqlalchemy import Table, MetaData
from sqlalchemy.exc import OperationalError
from sqlalchemy.sql import select
from sqlalchemy_utils.types.encrypted.encrypted_type import FernetEngine

from redash import create_app
from redash.models import db
from redash.models.base import Column
from redash.models.types import EncryptedConfiguration
from redash.utils.configuration import ConfigurationContainer


# setup application and db.
def create(group):
    app = current_app or create_app()
    return app


def setup_db():
    db.app = current_app
    isConnected = True
    for i in range(6):
        isConnected = True
        try:
            conn = db.engine.connect()
        except OperationalError:
            isConnected = False
            if isConnected:
                conn.close()
                break
            sleep(10)
    if not(isConnected):
        raise RuntimeError('fail to connect db.')


@click.group(cls=FlaskGroup, create_app=create)
def cli():
    """This is a script to chage secret key."""


@cli.command()
@click.argument('old_secret')
@click.argument('new_secret')
@click.option('--show-sql/--no-show-sql', default=False)
def data_source(old_secret, new_secret, show_sql):
    setup_db()

    if show_sql:
        import logging
        logging.basicConfig()
        logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

    table_for_select = Table('data_sources', MetaData(),
                             Column('id', db.Integer, primary_key=True),
                             Column('encrypted_options',
                                    ConfigurationContainer.as_mutable(
                                        EncryptedConfiguration(
                                            db.Text, old_secret, FernetEngine))))
    table_for_update = Table('data_sources', MetaData(),
                             Column('id', db.Integer, primary_key=True),
                             Column('encrypted_options',
                                    ConfigurationContainer.as_mutable(
                                        EncryptedConfiguration(
                                            db.Text, new_secret, FernetEngine))))

    update = table_for_update.update()
    data_sources = db.session.execute(select([table_for_select]))
    for ds in data_sources:
        stmt = update.where(table_for_update.c.id==ds['id']).values(encrypted_options=ds['encrypted_options'])
        db.session.execute(stmt)

    data_sources.close()
    db.session.commit()


if __name__ == '__main__':
    cli()
