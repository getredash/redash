from neo4j import GraphDatabase

driver = GraphDatabase.driver("neo4j://localhost:7687")


def print_friends(tx, name):
    for record in tx.run("MATCH (n) return n"):
        print(record)

with driver.session() as session:
    session.read_transaction(print_friends, "Arthur")

driver.close()