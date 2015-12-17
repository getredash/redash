from redash.models import db
from redash.devspark.custom_models.favourites import Favourite

if __name__ == '__main__':
    with db.database.transaction():
       Favourite.create_table()

    db.close_db(None)
