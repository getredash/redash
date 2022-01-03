# test db connection using sqlalchemy

from sqlalchemy import create_engine
engine = create_engine('postgresql://redash@127.0.0.1:5432/redash')

con = engine.connect()
rs = con.execute('SELECT * FROM events')
for row in rs:
    print(row)
con.close()
