export const query = `
  SELECT 3 AS a, 1 AS b, 'h' AS c UNION ALL
  SELECT 1 AS a, 1 AS b, 'b' AS c UNION ALL
  SELECT 2 AS a, 1 AS b, 'e' AS c UNION ALL
  SELECT 1 AS a, 3 AS b, 'd' AS c UNION ALL
  SELECT 2 AS a, 2 AS b, 'f' AS c UNION ALL
  SELECT 1 AS a, 1 AS b, 'a' AS c UNION ALL
  SELECT 3 AS a, 2 AS b, 'i' AS c UNION ALL
  SELECT 2 AS a, 3 AS b, 'g' AS c UNION ALL
  SELECT 1 AS a, 2 AS b, 'c' AS c UNION ALL
  SELECT 3 AS a, 3 AS b, 'j' AS c
`;

export const config = {
  itemsPerPage: 25,
  columns: [
    {
      name: "a",
      displayAs: "number",
      numberFormat: "0",
    },
    {
      name: "b",
      displayAs: "number",
      numberFormat: "0",
    },
    {
      name: "c",
      displayAs: "string",
    },
  ],
};
