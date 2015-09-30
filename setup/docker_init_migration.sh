#!/bin/bash
sudo -u postgres PYTHONPATH=. bin/run python migrations/0001_allow_delete_query.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0002_fix_timestamp_fields.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0003_update_data_source_config.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0004_allow_null_in_event_user.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0005_add_updated_at.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0006_queries_last_edit_by.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0007_add_schedule_to_queries.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0008_make_ds_name_unique.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0009_add_api_key_to_user.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0010_create_alerts.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0010_allow_deleting_datasources.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0011_migrate_bigquery_to_json.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0012_add_list_users_permission.py
sudo -u postgres PYTHONPATH=. bin/run python migrations/0013_update_counter_options.py
