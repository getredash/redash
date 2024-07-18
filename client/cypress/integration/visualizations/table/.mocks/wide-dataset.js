const loremIpsum =
"Lorem ipsum dolor sit amet consectetur adipiscing elit" +
"sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";

export const query = `
    SELECT '${loremIpsum}' AS a, '${loremIpsum}' AS b, '${loremIpsum}' AS c, '${loremIpsum}' AS d, '${loremIpsum}' as e
`;

export const config = {
    itemsPerPage: 10,
    columns: [
        {
            name: "a",
            displayAs: "string",
          },
          {
            name: "b",
            displayAs: "string",
          },
          {
            name: "c",
            displayAs: "string",
          },
          {
            name: "d",
            displayAs: "string",
          },
          {
            name: "e",
            displayAs: "string",
          }
    ]
}