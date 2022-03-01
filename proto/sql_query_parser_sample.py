import sqlparse


def get_query_columns(sql):
    stmt = sqlparse.parse(sql)[0]
    columns = []
    column_identifiers = []

    # get column_identifieres
    in_select = False
    for token in stmt.tokens:
        if isinstance(token, sqlparse.sql.Comment):
            continue
        if str(token).lower() == 'select':
            in_select = True
        elif in_select and token.ttype is None:
            for identifier in token.get_identifiers():
                column_identifiers.append(identifier)
            break

    # get column names
    for column_identifier in column_identifiers:
        columns.append(column_identifier.get_name())

    return columns


def run_1():
    sql = '''
SELECT "userId" FROM
(SELECT "userId",
          timezone('Asia/Kolkata', "createdAt") AS "signup_datetime",
"source"
   FROM user_deep_link_params udp
   WHERE "createdAt" >= '{{date.start}}'::TIMESTAMP - interval '5 hours 30 minutes'
     AND "createdAt" < '{{date.end}}'::TIMESTAMP - interval '5 hours 30 minutes'
   UNION ALL
   SELECT u.id AS "userId",
                    timezone('Asia/Kolkata', "createdAt") AS "signup_datetime",
                    'Organic'AS "channel"
   FROM users u
   WHERE "createdAt" >= '{{date.start}}'::TIMESTAMP - interval '5 hours 30 minutes'
     AND "createdAt" < '{{date.end}}'::TIMESTAMP - interval '5 hours 30 minutes'
     AND "acquisitionSource" = 'API' ) t
     WHERE "userId" IN ('57c153e3-e72b-49a1-a38f-e65291a415f7',
'e59cb395-e98b-4763-a35b-6390ee664dc1',
'dad1cc85-db5c-4b58-bf49-25bf52fdb402',
'362e976e-9b1a-4a66-a1ed-8772ffa3a45b',
'05821fcb-19bb-4a99-8356-adf2835a436a',
'aee5a0fa-dee9-4e2c-bf18-c54fdeafa46e',
'4042cd49-edca-47df-8524-b5858c5eaac4',
'300b16b1-ee3b-40e9-a38d-d12b9d825902',
'b075a978-6575-490f-b67b-8663f674d1c5',
'8f5e1608-99ee-446c-a9ae-5553bff8ffd9',
'2ed4b0fa-521f-42ab-b6cb-7da0c26f4b28',
'dd9dab52-33ea-431b-ac8c-23ca72546613',
'1d607ba9-f5f2-4cc4-8a55-4c3a2b5bcf11',
'9bb349fb-e0a2-4e91-9ea3-eff904c85837',
'ce2ce5bf-4f47-487d-ac83-163d45b821d8',
'e9e24d02-4d26-4457-8399-9148ea8083e3',
'c3c0d63a-58ec-4f66-8bad-c006fa90d4f9',
'cb0e6f9b-cb68-4b0a-a930-71b9d2a78037',
'c4af5ba1-d60b-48de-a744-3d001b5f311f',
'11a50444-cf34-4d66-9589-14f88a2ed57c',
'a39a8183-f87b-411f-99b5-703b6551df5d',
'04350202-cc60-4567-8b1e-05ad2eb87961',
'13452f0c-96a0-4a96-af83-7a2b529f42b4',
'5284d6de-3baf-43d5-9085-61f042f80d12',
'30ab87a6-2365-4fc2-a7de-0d846245bd4f',
'4b848fe4-9f65-407f-9ad7-b9cfb8538ed2',
'9647b0d4-5210-4e52-846f-d8241476d2ea',
'139faf2f-f808-4cc3-b358-848664547734',
'1d75d475-1e33-486c-b945-605fde5eb683',
'a19828c3-6f2b-4945-aa9f-a9e9c2f682a7',
'3ad4a3b4-9ac4-4691-bd78-3b5a46a1d2cb',
'91133f71-c434-46f1-8865-3b7baa6a9bd3',
'e880afe0-a567-4640-86b3-f80b763e73ea',
'f0a87d40-5acf-4695-a177-edbc917efefb',
'a4481154-e046-4b74-ba0a-977e9428243a',
'df0df992-2536-4bf3-8cf8-217325a247bf',
'dccdfa26-f280-4c85-9d4e-f6614a23e9e4',
'417373df-7ccd-4fc6-8bca-e01b59110784',
'c66a2c82-9f22-4b90-9d3e-9943acbabe4e',
'249e4bf2-246c-4962-9e91-abea952a3c8d',
'fced0604-9a25-45d5-8506-ecf62ed0bc5a',
'3bbd765b-b072-48cf-9186-97121341f3cd',
'9f259df4-50b5-4316-b345-9f96603fc700',
'e22ec069-153e-4d40-9234-4486a7ee9e58',
'80e915ec-5764-47e1-969d-7996872c9f95'
)
GROUP BY 1
'''
    print(get_query_columns(sql))


if __name__ == "__main__":
    run_1()
