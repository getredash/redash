import os
import sys
import itertools
from collections import namedtuple

dirpath = os.path.join(os.path.dirname(__file__), 'lib')
if dirpath not in sys.path:
    sys.path.append(dirpath)

import sqlparse

from sqlparse.sql import IdentifierList, Identifier, Function
from sqlparse.tokens import Keyword, DML


class Reference(namedtuple('Reference', ['schema', 'name', 'alias', 'is_function'])):
    __slots__ = ()

    def has_alias(self):
        return self.alias is not None

    @property
    def is_query_alias(self):
        return self.name is None and self.alias is not None

    @property
    def is_table_alias(self):
        return self.name is not None and self.alias is not None and not self.is_function

    @property
    def full_name(self):
        if self.schema is None:
            return self.name
        else:
            return self.schema + '.' + self.name


def _is_subselect(parsed):
    if not parsed.is_group:
        return False
    for item in parsed.tokens:
        if item.ttype is DML and item.value.upper() in ('SELECT', 'INSERT',
                                                        'UPDATE', 'CREATE', 'DELETE'):
            return True
    return False


def _identifier_is_function(identifier):
    return any(isinstance(t, Function) for t in identifier.tokens)


def _extract_from_part(parsed):
    tbl_prefix_seen = False
    for item in parsed.tokens:
        if item.is_group:
            for x in _extract_from_part(item):
                yield x
        if tbl_prefix_seen:
            if _is_subselect(item):
                for x in _extract_from_part(item):
                    yield x
            # An incomplete nested select won't be recognized correctly as a
            # sub-select. eg: 'SELECT * FROM (SELECT id FROM user'. This causes
            # the second FROM to trigger this elif condition resulting in a
            # StopIteration. So we need to ignore the keyword if the keyword
            # FROM.
            # Also 'SELECT * FROM abc JOIN def' will trigger this elif
            # condition. So we need to ignore the keyword JOIN and its variants
            # INNER JOIN, FULL OUTER JOIN, etc.
            elif item.ttype is Keyword and (
                    not item.value.upper() == 'FROM') and (
                    not item.value.upper().endswith('JOIN')):
                tbl_prefix_seen = False
            else:
                yield item
        elif item.ttype is Keyword or item.ttype is Keyword.DML:
            item_val = item.value.upper()
            if (item_val in ('COPY', 'FROM', 'INTO', 'UPDATE', 'TABLE') or
                    item_val.endswith('JOIN')):
                tbl_prefix_seen = True
        # 'SELECT a, FROM abc' will detect FROM as part of the column list.
        # So this check here is necessary.
        elif isinstance(item, IdentifierList):
            for identifier in item.get_identifiers():
                if (identifier.ttype is Keyword and
                        identifier.value.upper() == 'FROM'):
                    tbl_prefix_seen = True
                    break


def _extract_table_identifiers(token_stream):
    for item in token_stream:
        if isinstance(item, IdentifierList):
            for ident in item.get_identifiers():
                try:
                    alias = ident.get_alias()
                    schema_name = ident.get_parent_name()
                    real_name = ident.get_real_name()
                except AttributeError:
                    continue
                if real_name:
                    yield Reference(schema_name, real_name,
                                    alias, _identifier_is_function(ident))
        elif isinstance(item, Identifier):
            yield Reference(item.get_parent_name(), item.get_real_name(),
                            item.get_alias(), _identifier_is_function(item))
        elif isinstance(item, Function):
            yield Reference(item.get_parent_name(), item.get_real_name(),
                            item.get_alias(), _identifier_is_function(item))


def extractTables(sql):
    # let's handle multiple statements in one sql string
    extracted_tables = []
    statements = list(sqlparse.parse(sql))
    for statement in statements:
        stream = _extract_from_part(statement)
        extracted_tables.append(list(_extract_table_identifiers(stream)))
    return list(itertools.chain(*extracted_tables))

if __name__ == "__main__":
    q = '''
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
    print(extractTables(q))
