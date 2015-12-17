from flask import Flask, request, make_response
from flask_login import login_required
from flask.ext.login import current_user
import json
from bson import json_util
from redash.wsgi import app
from redash import models
from redash.devspark.custom_models import favourites

# Add or delete a dashboard from favourites. True = Add . False = Remove
@app.route('/api/favourites/<dashboard_id>', methods=['POST'])
def post_favourite(dashboard_id):
    try:
        models.db.connect_db()
        app.logger.error(request.json)
        data = request.json
        fav = favourites.Favourite()
        fav.user = current_user.id
        fav.dashboard = dashboard_id
        if data['flag'] and not exist_favourite(fav.dashboard):
            fav.save()
        elif not data['flag'] and exist_favourite(fav.dashboard):
            q = fav.delete().where((favourites.Favourite.user == fav.user)
                                   & (favourites.Favourite.dashboard == dashboard_id))
            q.execute();
        return '{"status": "ok"}', 200
    except ValueError:
        return '{"status": "failed" - Cannot find a valid flag.}', 501
    except:
        return '{"status": "failed"}', 500

# Retrieve if an specific dashboard is marked as favourite
@app.route('/api/favourites/<dashboard_id>', methods=['GET'])
def get_favourite(dashboard_id):
    try:
        fav_obj = favourites.Favourite.select().dicts().where((favourites.Favourite.dashboard == dashboard_id)
                                                              & (favourites.Favourite.user == current_user.id)).get()
        return '{"status": "ok","flag": true}', 200
    except:
        return '{"status": "ok","flag": false, "Details": "Dashboard not marked as favourite."}', 200

# Retrieve if all favourites dashboards of an specific user
@app.route('/api/favourites/', methods=['GET'])
def get_favourites():
    fav_objs = [x for x in
                favourites.Favourite.select().dicts().where(favourites.Favourite.user == current_user.id)]
    return json.dumps(fav_objs, default=json_util.default)

# Retrieve TRUE if an specific dashboard is marked as favourite
def exist_favourite(dashboard_id):
    try:
        fav_obj = favourites.Favourite.select().dicts().where((favourites.Favourite.dashboard == dashboard_id)
                                                              & (favourites.Favourite.user == current_user.id)).get()
        return True
    except:
        return False
