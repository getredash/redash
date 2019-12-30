const loremIpsum =
  "Lorem ipsum dolor sit amet consectetur adipiscing elit" +
  "sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function randomString(index) {
  const n = pseudoRandom(index);
  const offset = Math.floor(n * loremIpsum.length);
  const length = Math.floor(n * 15) + 1;
  return loremIpsum.substr(offset, length).trim();
}

export const query = new Array(400)
  .fill(null) // we actually don't need these values, but `.map()` ignores undefined elements
  .map((unused, index) => `SELECT ${index} AS a, '${randomString(index)}' as b`)
  .join(" UNION ALL\n");

export const config = {
  itemsPerPage: 10,
  columns: [
    {
      name: "a",
      displayAs: "number",
      numberFormat: "0",
    },
    {
      name: "b",
      displayAs: "string",
    },
  ],
};
