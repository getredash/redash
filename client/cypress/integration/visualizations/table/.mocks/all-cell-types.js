export const query = `
  SELECT
    314159.265359 AS num,
    'test' AS str,
    'hello, <b>world</b>' AS html,
    'hello, <b>world</b>' AS html2,
    'Link: http://example.com' AS html3,
    '1995-09-03T07:45' AS "date",
    true AS bool,
    '[{"a": 3.14, "b": "test", "c": [], "d": {}}, false, [null, 123], "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."]' AS json,
    'ukr' AS img,
    'redash' AS link
`;

export const config = {
  itemsPerPage: 25,
  columns: [
    {
      name: "num",
      displayAs: "number",
      numberFormat: "0.000",
    },
    {
      name: "str",
      displayAs: "string",
      allowHTML: true,
      highlightLinks: false,
    },
    {
      name: "html",
      displayAs: "string",
      allowHTML: true,
      highlightLinks: false,
    },
    {
      name: "html2",
      displayAs: "string",
      allowHTML: false,
      highlightLinks: false,
    },
    {
      name: "html3",
      displayAs: "string",
      allowHTML: true,
      highlightLinks: true,
    },
    {
      name: "date",
      displayAs: "datetime",
      dateTimeFormat: "D MMMM YYYY, h:mm A",
    },
    {
      name: "bool",
      displayAs: "boolean",
      booleanValues: ["No", "Yes"],
    },
    {
      name: "json",
      displayAs: "json",
    },
    {
      name: "img",
      displayAs: "image",
      imageUrlTemplate: "https://raw.githubusercontent.com/linssen/country-flag-icons/master/images/png/{{ @ }}.png",
      imageTitleTemplate: "ISO: {{ @ }}",
      imageWidth: "30",
      imageHeight: "",
    },
    {
      name: "link",
      displayAs: "link",
      linkUrlTemplate: "https://www.google.com.ua/search?q={{ @ }}",
      linkTextTemplate: "Search for '{{ @ }}'",
      linkTitleTemplate: "Search for '{{ @ }}'",
      linkOpenInNewTab: true,
    },
  ],
};
