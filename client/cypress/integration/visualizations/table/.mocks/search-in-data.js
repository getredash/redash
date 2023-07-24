export const query = `
  SELECT 'contains test' AS a, 'random string' AS b, 'another string' AS c UNION ALL
  SELECT 'contains test' AS a, 'also contains Test' AS b, '' AS c UNION ALL
  SELECT 'lorem ipsum' AS a, 'but TEST is here' AS b, 'none' AS c UNION ALL
  SELECT 'should not appear' AS a, 'because' AS b, '"test" is here' AS c
`;

export const config = {
  itemsPerPage: 25,
  columns: [
    {
      name: "a",
      displayAs: "string",
      allowSearch: true,
    },
    {
      name: "b",
      displayAs: "string",
      allowSearch: true,
    },
    {
      name: "c",
      allowSearch: false,
    },
  ],
};
