/**
 * Example queries and visualizations used to visually test every visualization type.
 *
 * Each entry in `EXAMPLES` is a query (SQLite SQL against the Chinook sample database) and a list of
 * visualizations built on top of its results. Every visualization is added to the dashboard of its type
 * (see `DASHBOARDS`), so a single dashboard shows all the setting variants of one visualization type
 * side by side, and every visualization gets its own screenshot.
 *
 * Widget sizes are in dashboard grid units (12 columns, 50px rows).
 */

export type VisualizationType =
  | "CHART"
  | "TABLE"
  | "COUNTER"
  | "PIVOT"
  | "COHORT"
  | "FUNNEL"
  | "MAP"
  | "CHOROPLETH"
  | "SANKEY"
  | "SUNBURST_SEQUENCE"
  | "WORD_CLOUD"
  | "DETAILS"
  | "BOXPLOT";

export interface VisualizationExample {
  type: VisualizationType;
  name: string;
  options: Record<string, unknown>;
  size?: [number, number];
}

export interface QueryExample {
  name: string;
  description: string;
  query: string;
  visualizations: VisualizationExample[];
}

export const DASHBOARDS: Record<VisualizationType, string> = {
  CHART: "Chart",
  TABLE: "Table",
  COUNTER: "Counter",
  PIVOT: "Pivot Table",
  COHORT: "Cohort",
  FUNNEL: "Funnel",
  MAP: "Map (Markers)",
  CHOROPLETH: "Map (Choropleth)",
  SANKEY: "Sankey",
  SUNBURST_SEQUENCE: "Sunburst Sequence",
  WORD_CLOUD: "Word Cloud",
  DETAILS: "Details View",
  BOXPLOT: "Boxplot (Deprecated)",
};

export const DEFAULT_WIDGET_SIZE: Record<VisualizationType, [number, number]> = {
  CHART: [6, 9],
  TABLE: [12, 12],
  COUNTER: [3, 5],
  PIVOT: [12, 12],
  COHORT: [12, 12],
  FUNNEL: [6, 10],
  MAP: [6, 11],
  CHOROPLETH: [6, 11],
  SANKEY: [6, 11],
  SUNBURST_SEQUENCE: [6, 12],
  WORD_CLOUD: [6, 10],
  DETAILS: [4, 12],
  BOXPLOT: [6, 10],
};

const GENRE_BUCKET = `
    CASE
        WHEN g.Name IN ('Rock', 'Latin', 'Metal', 'Alternative & Punk', 'Jazz') THEN g.Name
        ELSE 'Other'
    END
`;

const region = (country: string) => `
    CASE
        WHEN ${country} IN ('USA', 'Canada') THEN 'North America'
        WHEN ${country} IN ('Brazil', 'Argentina', 'Chile') THEN 'South America'
        WHEN ${country} IN ('India', 'Australia') THEN 'Asia Pacific'
        ELSE 'Europe'
    END
`;

const SALES = `
    FROM invoice_items ii
    JOIN invoices i ON i.InvoiceId = ii.InvoiceId
    JOIN tracks t ON t.TrackId = ii.TrackId
    JOIN genres g ON g.GenreId = t.GenreId
`;

// Chinook has no coordinates, so they are added inline for the marker map examples.
const CITY_COORDINATES = `
    coordinates(city, lat, lon) AS (
        VALUES
            ('Amsterdam', 52.37, 4.90), ('Bangalore', 12.97, 77.59), ('Berlin', 52.52, 13.40),
            ('Bordeaux', 44.84, -0.58), ('Boston', 42.36, -71.06), ('Brasília', -15.79, -47.88),
            ('Brussels', 50.85, 4.35), ('Budapest', 47.50, 19.04), ('Buenos Aires', -34.60, -58.38),
            ('Chicago', 41.88, -87.63), ('Copenhagen', 55.68, 12.57), ('Cupertino', 37.32, -122.03),
            ('Delhi', 28.61, 77.21), ('Dijon', 47.32, 5.04), ('Dublin', 53.35, -6.26),
            ('Edinburgh', 55.95, -3.19), ('Edmonton', 53.55, -113.49), ('Fort Worth', 32.76, -97.33),
            ('Frankfurt', 50.11, 8.68), ('Halifax', 44.65, -63.57), ('Helsinki', 60.17, 24.94),
            ('Lisbon', 38.72, -9.14), ('London', 51.51, -0.13), ('Lyon', 45.76, 4.84),
            ('Madison', 43.07, -89.40), ('Madrid', 40.42, -3.70), ('Montréal', 45.50, -73.57),
            ('Mountain View', 37.39, -122.08), ('New York', 40.71, -74.01), ('Orlando', 28.54, -81.38),
            ('Oslo', 59.91, 10.75), ('Ottawa', 45.42, -75.70), ('Paris', 48.86, 2.35),
            ('Porto', 41.15, -8.61), ('Prague', 50.08, 14.44), ('Redmond', 47.67, -122.12),
            ('Reno', 39.53, -119.81), ('Rio de Janeiro', -22.91, -43.17), ('Rome', 41.90, 12.50),
            ('Salt Lake City', 40.76, -111.89), ('Santiago', -33.45, -70.67), ('Sidney', -33.87, 151.21),
            ('Stockholm', 59.33, 18.07), ('Stuttgart', 48.78, 9.18), ('São José dos Campos', -23.18, -45.89),
            ('São Paulo', -23.55, -46.63), ('Toronto', 43.65, -79.38), ('Tucson', 32.22, -110.97),
            ('Vancouver', 49.28, -123.12), ('Vienne', 48.21, 16.37), ('Warsaw', 52.23, 21.01),
            ('Winnipeg', 49.90, -97.14), ('Yellowknife', 62.45, -114.37)
    )
`;

function chart(name: string, options: Record<string, unknown>): VisualizationExample {
  return { type: "CHART", name, options };
}

function column(name: string, options: Record<string, unknown> = {}) {
  return { name, visible: true, ...options };
}

export const EXAMPLES: QueryExample[] = [
  // ----------------------------------------------------------------------------------------------
  // Charts
  // ----------------------------------------------------------------------------------------------
  {
    name: "Monthly revenue by genre",
    description: "Time series with multiple series (top genres + Other). Some months miss some genres.",
    query: `
SELECT
    strftime('%Y-%m-01', i.InvoiceDate) AS month,
    ${GENRE_BUCKET} AS genre,
    ROUND(SUM(ii.UnitPrice * ii.Quantity), 2) AS revenue
${SALES}
WHERE i.InvoiceDate >= '2012-01-01'
GROUP BY 1, 2
ORDER BY 1, 2
`,
    visualizations: [
      chart("Line", {
        globalSeriesType: "line",
        columnMapping: { month: "x", genre: "series", revenue: "y" },
      }),
      chart("Line: spline, missing values kept, legend below", {
        globalSeriesType: "line",
        lineShape: "spline",
        missingValuesAsZero: false,
        legend: { enabled: true, placement: "below" },
        columnMapping: { month: "x", genre: "series", revenue: "y" },
      }),
      chart("Line: step (hv), datetime axis, custom date format", {
        globalSeriesType: "line",
        lineShape: "hv",
        xAxis: { type: "datetime", labels: { enabled: true } },
        dateTimeFormat: "MMM YYYY",
        columnMapping: { month: "x", genre: "series", revenue: "y" },
      }),
      chart("Area: stacked", {
        globalSeriesType: "area",
        series: { stacking: "stack" },
        columnMapping: { month: "x", genre: "series", revenue: "y" },
      }),
      chart("Area: stacked 100%", {
        globalSeriesType: "area",
        series: { stacking: "stack", percentValues: true },
        columnMapping: { month: "x", genre: "series", revenue: "y" },
      }),
      chart("Column: stacked, Tableau 10 palette", {
        globalSeriesType: "column",
        series: { stacking: "stack" },
        color_scheme: "Tableau 10",
        columnMapping: { month: "x", genre: "series", revenue: "y" },
      }),
      chart("Column: grouped, reversed legend, Viridis palette", {
        globalSeriesType: "column",
        color_scheme: "Viridis",
        legend: { enabled: true, placement: "auto", traceorder: "reversed" },
        columnMapping: { month: "x", genre: "series", revenue: "y" },
      }),
      chart("Column: stacked 100%, no legend, no X labels", {
        globalSeriesType: "column",
        series: { stacking: "stack", percentValues: true },
        legend: { enabled: false },
        xAxis: { type: "-", labels: { enabled: false } },
        columnMapping: { month: "x", genre: "series", revenue: "y" },
      }),
    ],
  },
  {
    name: "Monthly invoice stats",
    description: "Single row per month with several numeric columns.",
    query: `
SELECT
    strftime('%Y-%m-01', InvoiceDate) AS month,
    ROUND(SUM(Total), 2) AS revenue,
    COUNT(*) AS invoices,
    ROUND(AVG(Total), 2) AS avg_invoice,
    ROUND((MAX(Total) - MIN(Total)) / 2, 2) AS invoice_spread
FROM invoices
GROUP BY 1
ORDER BY 1
`,
    visualizations: [
      chart("Dual Y axes: revenue columns + invoices line", {
        globalSeriesType: "column",
        columnMapping: { month: "x", revenue: "y", invoices: "y" },
        seriesOptions: {
          revenue: { type: "column", yAxis: 0, zIndex: 0, index: 0 },
          invoices: { type: "line", yAxis: 1, zIndex: 1, index: 0, color: "#E92828" },
        },
        yAxis: [
          { type: "linear", title: { text: "Revenue ($)" } },
          { type: "linear", opposite: true, title: { text: "Invoices" } },
        ],
        alignYAxesAtZero: true,
      }),
      chart("Error bars: average invoice ± spread", {
        globalSeriesType: "line",
        columnMapping: { month: "x", avg_invoice: "y", invoice_spread: "yError" },
        seriesOptions: { avg_invoice: { name: "Average invoice", color: "#356AFF" } },
      }),
      chart("Line: custom Y range, tick format, hover number format", {
        globalSeriesType: "line",
        columnMapping: { month: "x", avg_invoice: "y" },
        yAxis: [
          { type: "linear", rangeMin: 4, rangeMax: 8, tickFormat: "$0.00" },
          { type: "linear", opposite: true },
        ],
        numberFormat: "$0,0.00",
      }),
      chart("Column: logarithmic Y axis, data labels", {
        globalSeriesType: "column",
        columnMapping: { month: "x", revenue: "y", invoices: "y" },
        yAxis: [{ type: "logarithmic" }, { type: "linear", opposite: true }],
        showDataLabels: true,
        numberFormat: "0",
      }),
      chart("Line + area mix, sorted descending (reverse X)", {
        globalSeriesType: "line",
        reverseX: true,
        columnMapping: { month: "x", revenue: "y", avg_invoice: "y" },
        seriesOptions: {
          revenue: { type: "area", yAxis: 0, zIndex: 0, index: 0 },
          avg_invoice: { type: "line", yAxis: 1, zIndex: 1, index: 0 },
        },
      }),
      chart("Custom chart (Plotly code)", {
        globalSeriesType: "custom",
        columnMapping: { month: "x", revenue: "y", invoices: "y" },
        customCode: `// Revenue per invoice, drawn as a filled scatter
var ratio = ys.revenue.map(function (value, i) { return value / ys.invoices[i]; });
Plotly.newPlot(element, [
  { x: x, y: ratio, type: "scatter", mode: "lines+markers", fill: "tozeroy", name: "Revenue / invoice" }
], { margin: { t: 20, r: 20, b: 40, l: 40 } });
`,
      }),
    ],
  },
  {
    name: "Revenue by country",
    description: "One row per billing country with a few aggregates.",
    query: `
SELECT
    i.BillingCountry AS country,
    COUNT(DISTINCT i.CustomerId) AS customers,
    COUNT(*) AS invoices,
    ROUND(SUM(i.Total), 2) AS revenue,
    ROUND(AVG(i.Total), 2) AS avg_invoice
FROM invoices i
GROUP BY 1
ORDER BY revenue DESC
`,
    visualizations: [
      chart("Column: data labels", {
        globalSeriesType: "column",
        showDataLabels: true,
        sortX: false,
        columnMapping: { country: "x", revenue: "y" },
      }),
      chart("Bar (horizontal): swapped axes, category axis", {
        globalSeriesType: "column",
        swappedAxes: true,
        sortX: false,
        xAxis: { type: "category", labels: { enabled: true } },
        columnMapping: { country: "x", customers: "y", invoices: "y" },
      }),
      chart("Pie", {
        globalSeriesType: "pie",
        columnMapping: { country: "x", revenue: "y" },
      }),
      chart("Pie: clockwise, unsorted, custom colors and label format", {
        globalSeriesType: "pie",
        direction: { type: "clockwise" },
        piesort: false,
        textFormat: "{{ @@x }}: {{ @@yPercent }}",
        legend: { enabled: false },
        valuesOptions: {
          USA: { color: "#002FA7" },
          Canada: { color: "#E92828" },
          France: { color: "#3BD973" },
        },
        columnMapping: { country: "x", revenue: "y" },
      }),
      chart("Scatter: customers vs revenue", {
        globalSeriesType: "scatter",
        columnMapping: { customers: "x", revenue: "y", country: "series" },
      }),
      chart("Column: with click-through links", {
        globalSeriesType: "column",
        sortX: false,
        enableLink: true,
        linkOpenNewTab: true,
        linkFormat: "https://en.wikipedia.org/wiki/{{ @@x }}",
        columnMapping: { country: "x", avg_invoice: "y" },
      }),
    ],
  },
  {
    name: "Genre stats",
    description: "One row per genre: catalog size, average track length and sales.",
    query: `
SELECT
    g.Name AS genre,
    COUNT(DISTINCT t.TrackId) AS tracks,
    ROUND(AVG(t.Milliseconds) / 60000.0, 2) AS avg_minutes,
    COALESCE(SUM(s.units), 0) AS units_sold,
    ROUND(COALESCE(SUM(s.revenue), 0), 2) AS revenue
FROM genres g
JOIN tracks t ON t.GenreId = g.GenreId
LEFT JOIN (
    SELECT TrackId, SUM(Quantity) AS units, SUM(UnitPrice * Quantity) AS revenue
    FROM invoice_items
    GROUP BY TrackId
) s ON s.TrackId = t.TrackId
GROUP BY 1
ORDER BY revenue DESC
`,
    visualizations: [
      chart("Bubble: tracks vs avg length, size = revenue", {
        globalSeriesType: "bubble",
        columnMapping: { tracks: "x", avg_minutes: "y", revenue: "size", genre: "series" },
        sizemode: "area",
        coefficient: 0.3,
        xAxis: { type: "logarithmic", labels: { enabled: true } },
      }),
      chart("Bubble: diameter size mode", {
        globalSeriesType: "bubble",
        columnMapping: { tracks: "x", avg_minutes: "y", units_sold: "size" },
        sizemode: "diameter",
        coefficient: 0.2,
      }),
    ],
  },
  {
    name: "Track lengths",
    description: "A sample of individual tracks from five genres.",
    query: `
SELECT
    t.Name AS track,
    g.Name AS genre,
    ROUND(t.Milliseconds / 60000.0, 2) AS minutes,
    ROUND(t.Bytes / 1048576.0, 2) AS megabytes
FROM tracks t
JOIN genres g ON g.GenreId = t.GenreId
WHERE g.Name IN ('Rock', 'Jazz', 'Metal', 'Latin', 'Blues')
  AND t.MediaTypeId <> 3
  AND t.TrackId % 4 = 0
ORDER BY g.Name, t.TrackId
`,
    visualizations: [
      chart("Scatter: length vs size by genre", {
        globalSeriesType: "scatter",
        columnMapping: { minutes: "x", megabytes: "y", genre: "series" },
      }),
      chart("Box: track length by genre", {
        globalSeriesType: "box",
        columnMapping: { genre: "x", minutes: "y" },
      }),
      chart("Box: horizontal with points", {
        globalSeriesType: "box",
        swappedAxes: true,
        showpoints: true,
        columnMapping: { genre: "x", minutes: "y" },
      }),
    ],
  },
  {
    name: "Revenue by genre and year",
    description: "Genre x year grid, used for heatmaps and pivot tables.",
    query: `
SELECT
    strftime('%Y', i.InvoiceDate) AS year,
    g.Name AS genre,
    ROUND(SUM(ii.UnitPrice * ii.Quantity), 2) AS revenue
${SALES}
WHERE g.Name IN ('Rock', 'Latin', 'Metal', 'Alternative & Punk', 'Jazz', 'Blues', 'TV Shows', 'Drama', 'Classical')
GROUP BY 1, 2
ORDER BY 1, 2
`,
    visualizations: [
      chart("Heatmap", {
        globalSeriesType: "heatmap",
        // Y values are genre names: heatmaps need a category Y axis (the default scale is linear)
        yAxis: [{ type: "category" }, { type: "linear", opposite: true }],
        columnMapping: { year: "x", genre: "y", revenue: "zVal" },
      }),
      chart("Heatmap: Viridis, data labels", {
        globalSeriesType: "heatmap",
        colorScheme: "Viridis",
        showDataLabels: true,
        numberFormat: "$0,0",
        // Y values are genre names: heatmaps need a category Y axis (the default scale is linear)
        yAxis: [{ type: "category" }, { type: "linear", opposite: true }],
        columnMapping: { year: "x", genre: "y", revenue: "zVal" },
      }),
      chart("Heatmap: custom colors, sorted/reversed Y", {
        globalSeriesType: "heatmap",
        colorScheme: "Custom...",
        heatMinColor: "#FFF4E0",
        heatMaxColor: "#B8001C",
        reverseY: true,
        // Y values are genre names: heatmaps need a category Y axis (the default scale is linear)
        yAxis: [{ type: "category" }, { type: "linear", opposite: true }],
        columnMapping: { year: "x", genre: "y", revenue: "zVal" },
      }),
    ],
  },
  {
    name: "Yearly revenue by genre (country filter)",
    description: "Uses a `::filter` column: the results can be filtered by country.",
    query: `
SELECT
    i.BillingCountry AS "country::filter",
    strftime('%Y', i.InvoiceDate) AS year,
    ${GENRE_BUCKET} AS genre,
    ROUND(SUM(ii.UnitPrice * ii.Quantity), 2) AS revenue
${SALES}
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3
`,
    visualizations: [
      chart("Column: stacked, with query filter", {
        globalSeriesType: "column",
        series: { stacking: "stack" },
        xAxis: { type: "category", labels: { enabled: true } },
        columnMapping: { year: "x", genre: "series", revenue: "y" },
      }),
    ],
  },
  // ----------------------------------------------------------------------------------------------
  // Tables and details
  // ----------------------------------------------------------------------------------------------
  {
    name: "Invoices",
    description: "One row per invoice with columns of every display type.",
    query: `
SELECT
    i.InvoiceId AS invoice_id,
    i.InvoiceDate AS invoice_date,
    c.FirstName || ' ' || c.LastName AS customer,
    c.Email AS email,
    i.BillingCountry AS country,
    ${region("i.BillingCountry")} AS region,
    (SELECT COUNT(*) FROM invoice_items ii WHERE ii.InvoiceId = i.InvoiceId) AS items,
    i.Total AS total,
    i.Total >= 10 AS is_large,
    'https://www.google.com/search?q=' || REPLACE(i.BillingCity, ' ', '+') AS city_search,
    'data:image/svg+xml;utf8,<svg xmlns=''http://www.w3.org/2000/svg'' width=''16'' height=''16''>'
        || '<circle cx=''8'' cy=''8'' r=''7'' fill=''' || CASE WHEN i.Total >= 10 THEN 'crimson' ELSE 'teal' END
        || '''/></svg>' AS badge,
    json_object('city', i.BillingCity, 'postal_code', i.BillingPostalCode) AS billing,
    '<b>' || i.BillingCity || '</b> <i>' || COALESCE(i.BillingState, '') || '</i>' AS html
FROM invoices i
JOIN customers c ON c.CustomerId = i.CustomerId
ORDER BY i.InvoiceId
`,
    visualizations: [
      { type: "TABLE", name: "Table: defaults", options: {} },
      {
        type: "TABLE",
        name: "Table: column formatting, search, 10 per page",
        options: {
          itemsPerPage: 10,
          columns: [
            column("invoice_id", { title: "#", displayAs: "number", numberFormat: "0", allowSearch: true }),
            column("invoice_date", {
              title: "Date",
              displayAs: "datetime",
              dateTimeFormat: "MMM D, YYYY",
              description: "When the invoice was issued",
            }),
            column("customer", { title: "Customer", allowSearch: true }),
            column("email", {
              title: "Email",
              displayAs: "link",
              linkUrlTemplate: "mailto:{{ @ }}",
              linkTextTemplate: "{{ @ }}",
            }),
            column("country", { title: "Country", allowSearch: true }),
            column("region", { visible: false }),
            column("items", { title: "Items", displayAs: "number", numberFormat: "0", alignContent: "center" }),
            column("total", { title: "Total", displayAs: "number", numberFormat: "$0,0.00" }),
            column("is_large", { title: "Large?", displayAs: "boolean", booleanValues: ["no", "yes"] }),
            column("city_search", {
              title: "City",
              displayAs: "link",
              linkTextTemplate: "Search",
              linkTitleTemplate: "{{ @ }}",
            }),
            column("badge", { title: "Badge", displayAs: "image", imageWidth: "16", imageHeight: "16" }),
            column("billing", { title: "Billing (JSON)", displayAs: "json" }),
            column("html", { title: "HTML", allowHTML: true }),
          ],
        },
      },
      {
        type: "TABLE",
        name: "Table: reordered + hidden columns, highlighted links",
        options: {
          itemsPerPage: 50,
          columns: [
            column("total", { title: "Total ($)", displayAs: "number", numberFormat: "0,0.00", order: 0 }),
            column("customer", { order: 1 }),
            column("city_search", { title: "Link as text", highlightLinks: true, order: 2 }),
            column("invoice_id", { visible: false, order: 3 }),
            column("invoice_date", { visible: false, order: 4 }),
            column("email", { visible: false, order: 5 }),
            column("country", { visible: false, order: 6 }),
            column("region", { order: 7 }),
            column("items", { visible: false, order: 8 }),
            column("is_large", { visible: false, order: 9 }),
            column("badge", { visible: false, order: 10 }),
            column("billing", { visible: false, order: 11 }),
            column("html", { title: "HTML (escaped)", order: 12 }),
          ],
        },
      },
    ],
  },
  {
    name: "Customers",
    description: "Customer profile with lifetime stats.",
    query: `
SELECT
    c.FirstName || ' ' || c.LastName AS customer,
    c.Company AS company,
    c.Email AS email,
    c.City AS city,
    c.Country AS country,
    e.FirstName || ' ' || e.LastName AS support_rep,
    MIN(i.InvoiceDate) AS first_purchase,
    MAX(i.InvoiceDate) AS last_purchase,
    COUNT(i.InvoiceId) AS invoices,
    ROUND(SUM(i.Total), 2) AS lifetime_value
FROM customers c
LEFT JOIN employees e ON e.EmployeeId = c.SupportRepId
LEFT JOIN invoices i ON i.CustomerId = c.CustomerId
GROUP BY c.CustomerId
ORDER BY lifetime_value DESC
`,
    visualizations: [
      { type: "DETAILS", name: "Details: defaults", options: {} },
      {
        type: "DETAILS",
        name: "Details: formatted and hidden fields",
        options: {
          columns: [
            column("customer", { title: "Name" }),
            column("company", { title: "Company" }),
            column("email", { title: "Email", displayAs: "link", linkUrlTemplate: "mailto:{{ @ }}" }),
            column("city", { visible: false }),
            column("country", { title: "Country" }),
            column("support_rep", { title: "Support rep" }),
            column("first_purchase", { title: "Customer since", displayAs: "datetime", dateTimeFormat: "MMMM YYYY" }),
            column("last_purchase", { visible: false }),
            column("invoices", { title: "Invoices", displayAs: "number", numberFormat: "0" }),
            column("lifetime_value", { title: "Lifetime value", displayAs: "number", numberFormat: "$0,0.00" }),
          ],
        },
      },
      {
        type: "COUNTER",
        name: "Counter: row count",
        options: { countRow: true, counterLabel: "Customers" },
      },
    ],
  },
  // ----------------------------------------------------------------------------------------------
  // Counters
  // ----------------------------------------------------------------------------------------------
  {
    name: "Key metrics",
    description: "Single row of KPIs comparing 2013 to 2012.",
    query: `
SELECT
    ROUND(SUM(CASE WHEN InvoiceDate >= '2013-01-01' THEN Total END), 2) AS revenue_2013,
    ROUND(SUM(CASE WHEN InvoiceDate >= '2012-01-01' AND InvoiceDate < '2013-01-01' THEN Total END), 2) AS revenue_2012,
    ROUND(SUM(CASE WHEN InvoiceDate >= '2011-01-01' AND InvoiceDate < '2012-01-01' THEN Total END), 2) AS revenue_2011,
    COUNT(*) AS invoices,
    COUNT(DISTINCT CustomerId) AS customers,
    AVG(Total) AS avg_invoice,
    1234567.891 AS big_number,
    'Rock' AS top_genre
FROM invoices
`,
    visualizations: [
      {
        type: "COUNTER",
        name: "Counter: plain",
        options: { counterColName: "invoices", counterLabel: "Invoices" },
      },
      {
        type: "COUNTER",
        name: "Counter: prefix, decimals, trend down",
        options: {
          counterColName: "revenue_2013",
          targetColName: "revenue_2012",
          counterLabel: "Revenue 2013 vs 2012",
          stringPrefix: "$",
          stringDecimal: 2,
          formatTargetValue: true,
        },
      },
      {
        type: "COUNTER",
        name: "Counter: trend up",
        options: {
          counterColName: "revenue_2012",
          targetColName: "revenue_2011",
          counterLabel: "Revenue 2012 vs 2011",
          stringSuffix: " USD",
        },
      },
      {
        type: "COUNTER",
        name: "Counter: custom separators",
        options: {
          counterColName: "big_number",
          counterLabel: "European number format",
          stringDecimal: 3,
          stringDecChar: ",",
          stringThouSep: ".",
        },
      },
      {
        type: "COUNTER",
        name: "Counter: default number format",
        options: { counterColName: "avg_invoice", counterLabel: "Average invoice", stringDecimal: null },
      },
      {
        type: "COUNTER",
        name: "Counter: string value",
        options: { counterColName: "top_genre", counterLabel: "Top genre" },
      },
      {
        type: "COUNTER",
        name: "Counter: no label (uses visualization name)",
        options: { counterColName: "customers" },
      },
    ],
  },
  {
    name: "Monthly revenue (last months first)",
    description: "Used for counters that pick a specific row.",
    query: `
SELECT strftime('%Y-%m', InvoiceDate) AS month, ROUND(SUM(Total), 2) AS revenue
FROM invoices
GROUP BY 1
ORDER BY 1 DESC
`,
    visualizations: [
      {
        type: "COUNTER",
        name: "Counter: row 1 vs row 2 (month over month)",
        options: {
          counterColName: "revenue",
          rowNumber: 1,
          targetColName: "revenue",
          targetRowNumber: 2,
          counterLabel: "Latest month revenue",
          stringPrefix: "$",
          stringDecimal: 2,
        },
      },
      {
        type: "COUNTER",
        name: "Counter: last row (negative row number)",
        options: {
          counterColName: "revenue",
          rowNumber: -1,
          counterLabel: "First month revenue",
          stringPrefix: "$",
          stringDecimal: 2,
        },
      },
    ],
  },
  // ----------------------------------------------------------------------------------------------
  // Pivot
  // ----------------------------------------------------------------------------------------------
  {
    name: "Sales facts",
    description: "Denormalized sales rows for slicing in a pivot table.",
    query: `
SELECT
    strftime('%Y', i.InvoiceDate) AS year,
    'Q' || ((CAST(strftime('%m', i.InvoiceDate) AS INTEGER) + 2) / 3) AS quarter,
    ${region("i.BillingCountry")} AS region,
    ${GENRE_BUCKET} AS genre,
    m.Name AS media_type,
    SUM(ii.Quantity) AS units,
    ROUND(SUM(ii.UnitPrice * ii.Quantity), 2) AS revenue
${SALES}
JOIN media_types m ON m.MediaTypeId = t.MediaTypeId
GROUP BY 1, 2, 3, 4, 5
ORDER BY 1, 2, 3, 4, 5
`,
    visualizations: [
      {
        type: "PIVOT",
        name: "Pivot: genre x year, sum of revenue, controls shown",
        options: {
          rows: ["genre"],
          cols: ["year"],
          vals: ["revenue"],
          aggregatorName: "Sum",
          rendererName: "Table",
          controls: { enabled: false },
        },
      },
      {
        type: "PIVOT",
        name: "Pivot: heatmap, nested rows, controls hidden",
        options: {
          rows: ["region", "genre"],
          cols: ["year"],
          vals: ["units"],
          aggregatorName: "Integer Sum",
          rendererName: "Table Heatmap",
          controls: { enabled: true },
        },
      },
      {
        type: "PIVOT",
        name: "Pivot: no totals, fraction of column",
        options: {
          rows: ["media_type"],
          cols: ["region"],
          vals: ["revenue"],
          aggregatorName: "Sum as Fraction of Columns",
          rendererName: "Table Col Heatmap",
          controls: { enabled: true },
          rendererOptions: { table: { colTotals: false, rowTotals: false } },
        },
      },
      {
        type: "PIVOT",
        name: "Pivot: Plotly stacked bar renderer",
        options: {
          rows: ["year"],
          cols: ["region"],
          vals: ["revenue"],
          aggregatorName: "Sum",
          rendererName: "Stacked Column Chart",
          controls: { enabled: true },
        },
      },
    ],
  },
  // ----------------------------------------------------------------------------------------------
  // Cohort
  // ----------------------------------------------------------------------------------------------
  {
    name: "Customer cohorts (monthly)",
    description: "Customers grouped by first purchase month; active customers per month since.",
    query: `
WITH purchases AS (
    SELECT DISTINCT CustomerId, date(InvoiceDate, 'start of month') AS month
    FROM invoices
),
cohorts AS (
    SELECT CustomerId, MIN(month) AS cohort_month FROM purchases GROUP BY 1
),
sizes AS (
    SELECT cohort_month, COUNT(*) AS cohort_size FROM cohorts GROUP BY 1
)
SELECT
    c.cohort_month,
    (CAST(strftime('%Y', p.month) AS INTEGER) * 12 + CAST(strftime('%m', p.month) AS INTEGER))
        - (CAST(strftime('%Y', c.cohort_month) AS INTEGER) * 12 + CAST(strftime('%m', c.cohort_month) AS INTEGER))
        AS months_since_first,
    s.cohort_size,
    COUNT(*) AS active_customers
FROM purchases p
JOIN cohorts c ON c.CustomerId = p.CustomerId
JOIN sizes s ON s.cohort_month = c.cohort_month
GROUP BY 1, 2, 3
HAVING months_since_first <= 12
ORDER BY 1, 2
`,
    visualizations: [
      {
        type: "COHORT",
        name: "Cohort: diagonal, percent values",
        options: {
          timeInterval: "monthly",
          mode: "diagonal",
          dateColumn: "cohort_month",
          stageColumn: "months_since_first",
          totalColumn: "cohort_size",
          valueColumn: "active_customers",
        },
      },
      {
        type: "COHORT",
        name: "Cohort: simple, absolute values, custom colors & titles",
        options: {
          timeInterval: "monthly",
          mode: "simple",
          dateColumn: "cohort_month",
          stageColumn: "months_since_first",
          totalColumn: "cohort_size",
          valueColumn: "active_customers",
          percentValues: false,
          showTooltips: false,
          timeColumnTitle: "Cohort",
          peopleColumnTitle: "Customers",
          stageColumnTitle: "Month {{ @ }}",
          colors: { min: "#FFF4E0", max: "#B8001C", steps: 5 },
        },
      },
    ],
  },
  // ----------------------------------------------------------------------------------------------
  // Funnel
  // ----------------------------------------------------------------------------------------------
  {
    name: "Catalog funnel",
    description: "How much of the catalog actually sells.",
    query: `
SELECT 1 AS step_order, 'Tracks in catalog' AS step, COUNT(*) AS tracks FROM tracks
UNION ALL
SELECT 2, 'In at least one playlist', COUNT(DISTINCT TrackId) FROM playlist_track
UNION ALL
SELECT 3, 'Sold at least once', COUNT(DISTINCT TrackId) FROM invoice_items
UNION ALL
SELECT 4, 'Sold 2+ times', COUNT(*) FROM (SELECT TrackId FROM invoice_items GROUP BY 1 HAVING COUNT(*) >= 2)
UNION ALL
SELECT 5, 'Bought in the last year', COUNT(DISTINCT ii.TrackId)
FROM invoice_items ii JOIN invoices i ON i.InvoiceId = ii.InvoiceId
WHERE i.InvoiceDate >= '2013-01-01'
`,
    visualizations: [
      {
        type: "FUNNEL",
        name: "Funnel: auto sorted",
        options: {
          stepCol: { colName: "step", displayAs: "Step" },
          valueCol: { colName: "tracks", displayAs: "Tracks" },
        },
      },
      {
        type: "FUNNEL",
        name: "Funnel: custom sort column, custom formats",
        options: {
          stepCol: { colName: "step", displayAs: "Stage" },
          valueCol: { colName: "tracks", displayAs: "# Tracks" },
          autoSort: false,
          sortKeyCol: { colName: "step_order", reverse: false },
          numberFormat: "0.0a",
          percentFormat: "0%",
        },
      },
    ],
  },
  {
    name: "Revenue by genre",
    description: "Many categories, used for funnels with item limits.",
    query: `
SELECT g.Name AS genre, ROUND(SUM(ii.UnitPrice * ii.Quantity), 2) AS revenue
${SALES}
GROUP BY 1
ORDER BY 2 DESC
`,
    visualizations: [
      {
        type: "FUNNEL",
        name: "Funnel: limited to 8 items, percent range clamp",
        options: {
          stepCol: { colName: "genre", displayAs: "Genre" },
          valueCol: { colName: "revenue", displayAs: "Revenue" },
          itemsLimit: 8,
          percentValuesRange: { min: 0.05, max: 100 },
        },
      },
      chart("Pie: many slices, D3 palette", {
        globalSeriesType: "pie",
        color_scheme: "D3 Category 10",
        legend: { enabled: true, placement: "below" },
        columnMapping: { genre: "x", revenue: "y" },
      }),
    ],
  },
  // ----------------------------------------------------------------------------------------------
  // Maps
  // ----------------------------------------------------------------------------------------------
  {
    name: "Customer locations",
    description: "Customer cities with coordinates (coordinates are added inline for the demo).",
    query: `
WITH ${CITY_COORDINATES}
SELECT
    TRIM(c.City) AS city,
    c.Country AS country,
    ${region("c.Country")} AS region,
    e.FirstName || ' ' || e.LastName AS support_rep,
    co.lat,
    co.lon,
    COUNT(DISTINCT c.CustomerId) AS customers,
    ROUND(SUM(i.Total), 2) AS revenue
FROM customers c
JOIN coordinates co ON co.city = TRIM(c.City)
JOIN employees e ON e.EmployeeId = c.SupportRepId
JOIN invoices i ON i.CustomerId = c.CustomerId
GROUP BY 1, 2, 3, 4, 5, 6
ORDER BY revenue DESC
`,
    visualizations: [
      { type: "MAP", name: "Markers: defaults (clustered)", options: { latColName: "lat", lonColName: "lon" } },
      {
        type: "MAP",
        name: "Markers: grouped by region, custom colors, not clustered",
        options: {
          latColName: "lat",
          lonColName: "lon",
          classify: "region",
          clusterMarkers: false,
          groups: {
            "North America": { color: "#356AFF" },
            "South America": { color: "#3BD973" },
            Europe: { color: "#E92828" },
            "Asia Pacific": { color: "#FFD300" },
          },
        },
      },
      {
        type: "MAP",
        name: "Markers: customized icons, tooltip & popup templates",
        options: {
          latColName: "lat",
          lonColName: "lon",
          classify: "support_rep",
          clusterMarkers: false,
          customizeMarkers: true,
          iconShape: "circle-dot",
          iconFont: "music",
          foregroundColor: "#FFFFFF",
          backgroundColor: "#8A2BE2",
          borderColor: "#4B0082",
          tooltip: { enabled: true, template: "{{ city }}, {{ country }}" },
          popup: {
            enabled: true,
            template: `<b>{{ city }}</b><br>Customers: {{ customers }}<br>Revenue: \${{ revenue }}<br>Rep: {{ support_rep }}`,
          },
        },
      },
      {
        type: "MAP",
        name: "Markers: doughnut icons, alternative tiles",
        options: {
          latColName: "lat",
          lonColName: "lon",
          clusterMarkers: false,
          customizeMarkers: true,
          iconShape: "doughnut",
          backgroundColor: "#FB8D3D",
          borderColor: "#C45A00",
          mapTileUrl: "//{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        },
      },
    ],
  },
  {
    name: "Revenue by country (choropleth)",
    description: "Revenue per billing country, keyed by ISO code and by name.",
    query: `
SELECT
    CASE BillingCountry WHEN 'USA' THEN 'United States' WHEN 'Czech Republic' THEN 'Czech Rep.'
        ELSE BillingCountry END AS country,
    CASE BillingCountry
        WHEN 'USA' THEN 'US' WHEN 'Canada' THEN 'CA' WHEN 'France' THEN 'FR' WHEN 'Brazil' THEN 'BR'
        WHEN 'Germany' THEN 'DE' WHEN 'United Kingdom' THEN 'GB' WHEN 'Portugal' THEN 'PT'
        WHEN 'India' THEN 'IN' WHEN 'Czech Republic' THEN 'CZ' WHEN 'Sweden' THEN 'SE'
        WHEN 'Spain' THEN 'ES' WHEN 'Poland' THEN 'PL' WHEN 'Norway' THEN 'NO' WHEN 'Netherlands' THEN 'NL'
        WHEN 'Italy' THEN 'IT' WHEN 'Ireland' THEN 'IE' WHEN 'Hungary' THEN 'HU' WHEN 'Finland' THEN 'FI'
        WHEN 'Denmark' THEN 'DK' WHEN 'Chile' THEN 'CL' WHEN 'Belgium' THEN 'BE' WHEN 'Austria' THEN 'AT'
        WHEN 'Australia' THEN 'AU' WHEN 'Argentina' THEN 'AR'
    END AS iso_a2,
    COUNT(DISTINCT CustomerId) AS customers,
    ROUND(SUM(Total), 2) AS revenue
FROM invoices
GROUP BY 1, 2
ORDER BY revenue DESC
`,
    visualizations: [
      {
        type: "CHOROPLETH",
        name: "Choropleth: countries by ISO code (equidistant)",
        options: {
          mapType: "countries",
          keyColumn: "iso_a2",
          targetField: "iso_a2",
          valueColumn: "revenue",
        },
      },
      {
        type: "CHOROPLETH",
        name: "Choropleth: by name, quantile, custom colors & legend",
        options: {
          mapType: "countries",
          keyColumn: "country",
          targetField: "name",
          valueColumn: "customers",
          clusteringMode: "q",
          steps: 4,
          valueFormat: "0",
          noValuePlaceholder: "No customers",
          colors: {
            min: "#FFF4E0",
            max: "#B8001C",
            background: "#EAF2FF",
            borders: "#666666",
            noValue: "#DDDDDD",
          },
          legend: { visible: true, position: "top-right", alignText: "left" },
          tooltip: { enabled: true, template: "{{ @@name_long }}: {{ @@value }} customers" },
          popup: { enabled: false },
        },
      },
      {
        type: "CHOROPLETH",
        name: "Choropleth: k-means, no legend",
        options: {
          mapType: "countries",
          keyColumn: "iso_a2",
          targetField: "iso_a2",
          valueColumn: "revenue",
          clusteringMode: "k",
          steps: 3,
          legend: { visible: false },
        },
      },
    ],
  },
  {
    name: "Revenue by US state",
    description: "Only a handful of states have customers - most of the map is empty.",
    query: `
SELECT BillingState AS state, COUNT(DISTINCT CustomerId) AS customers, ROUND(SUM(Total), 2) AS revenue
FROM invoices
WHERE BillingCountry = 'USA'
GROUP BY 1
ORDER BY 3 DESC
`,
    visualizations: [
      {
        type: "CHOROPLETH",
        name: "Choropleth: USA states",
        options: {
          mapType: "usa",
          keyColumn: "state",
          targetField: "usps_abbrev",
          valueColumn: "revenue",
          valueFormat: "$0,0",
          legend: { visible: true, position: "bottom-right", alignText: "right" },
          popup: { enabled: true, template: "<b>{{ @@name }}</b><br>Revenue: {{ @@value }}" },
        },
      },
    ],
  },
  // ----------------------------------------------------------------------------------------------
  // Sankey and sunburst
  // ----------------------------------------------------------------------------------------------
  {
    name: "Revenue flow: region > genre > media type",
    description: "stage1..stage3 + value columns.",
    query: `
SELECT
    ${region("i.BillingCountry")} AS stage1,
    ${GENRE_BUCKET} AS stage2,
    m.Name AS stage3,
    ROUND(SUM(ii.UnitPrice * ii.Quantity), 2) AS value
${SALES}
JOIN media_types m ON m.MediaTypeId = t.MediaTypeId
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3
`,
    visualizations: [
      { type: "SANKEY", name: "Sankey: 3 stages", options: {} },
      { type: "SUNBURST_SEQUENCE", name: "Sunburst: 3 stages", options: {} },
    ],
  },
  {
    name: "Customer journey: support rep > region > next purchase",
    description: "Uneven paths: stage3 is NULL (shown as 'Exit') for customers without a 2013 purchase.",
    query: `
SELECT
    e.FirstName || ' ' || e.LastName AS stage1,
    ${region("c.Country")} AS stage2,
    CASE WHEN MAX(i.InvoiceDate) >= '2013-06-01' THEN 'Active in H2 2013' END AS stage3,
    1 AS value
FROM customers c
JOIN employees e ON e.EmployeeId = c.SupportRepId
JOIN invoices i ON i.CustomerId = c.CustomerId
GROUP BY c.CustomerId
`,
    visualizations: [
      { type: "SANKEY", name: "Sankey: with exits (NULL stages)", options: {} },
      { type: "SUNBURST_SEQUENCE", name: "Sunburst: with exits (NULL stages)", options: {} },
    ],
  },
  {
    name: "Revenue paths (sequence format)",
    description: "The alternative sunburst input format: sequence, stage, node, value.",
    query: `
WITH paths AS (
    SELECT
        ROW_NUMBER() OVER (ORDER BY 1) AS sequence,
        region, genre, media_type, value
    FROM (
        SELECT
            ${region("i.BillingCountry")} AS region,
            ${GENRE_BUCKET} AS genre,
            m.Name AS media_type,
            ROUND(SUM(ii.UnitPrice * ii.Quantity), 2) AS value
        ${SALES}
        JOIN media_types m ON m.MediaTypeId = t.MediaTypeId
        GROUP BY 1, 2, 3
    )
)
SELECT sequence, 1 AS stage, region AS node, value FROM paths
UNION ALL
SELECT sequence, 2, genre, value FROM paths
UNION ALL
SELECT sequence, 3, media_type, value FROM paths
ORDER BY sequence, stage
`,
    visualizations: [{ type: "SUNBURST_SEQUENCE", name: "Sunburst: sequence/stage/node format", options: {} }],
  },
  // ----------------------------------------------------------------------------------------------
  // Word cloud
  // ----------------------------------------------------------------------------------------------
  {
    name: "Artists by track count",
    description: "Artist names with a frequency column.",
    query: `
SELECT ar.Name AS artist, COUNT(*) AS tracks
FROM tracks t
JOIN albums al ON al.AlbumId = t.AlbumId
JOIN artists ar ON ar.ArtistId = al.ArtistId
GROUP BY 1
ORDER BY 2 DESC
LIMIT 150
`,
    visualizations: [
      {
        type: "WORD_CLOUD",
        name: "Word cloud: with frequencies column",
        options: { column: "artist", frequenciesColumn: "tracks" },
      },
      {
        type: "WORD_CLOUD",
        name: "Word cloud: word length and count limits",
        options: {
          column: "artist",
          frequenciesColumn: "tracks",
          wordLengthLimit: { min: 4, max: 15 },
          wordCountLimit: { min: 20, max: null },
        },
      },
    ],
  },
  {
    name: "Track titles",
    description: "Raw text, word frequencies are computed by the visualization.",
    query: `
SELECT t.Name AS title
FROM tracks t
JOIN genres g ON g.GenreId = t.GenreId
WHERE g.Name IN ('Rock', 'Blues', 'Jazz')
`,
    visualizations: [
      {
        type: "WORD_CLOUD",
        name: "Word cloud: computed word frequencies",
        options: {
          column: "title",
          wordLengthLimit: { min: 4, max: null },
          wordCountLimit: { min: 5, max: null },
        },
      },
    ],
  },
  // ----------------------------------------------------------------------------------------------
  // Boxplot (deprecated)
  // ----------------------------------------------------------------------------------------------
  {
    name: "Track lengths per genre (wide)",
    description: "One numeric column per genre, as the deprecated boxplot expects.",
    query: `
WITH ranked AS (
    SELECT
        g.Name AS genre,
        ROUND(t.Milliseconds / 60000.0, 2) AS minutes,
        ROW_NUMBER() OVER (PARTITION BY g.Name ORDER BY t.TrackId) AS n
    FROM tracks t
    JOIN genres g ON g.GenreId = t.GenreId
    WHERE g.Name IN ('Rock', 'Jazz', 'Metal', 'Latin') AND t.MediaTypeId <> 3
)
SELECT
    MAX(CASE WHEN genre = 'Rock' THEN minutes END) AS rock,
    MAX(CASE WHEN genre = 'Jazz' THEN minutes END) AS jazz,
    MAX(CASE WHEN genre = 'Metal' THEN minutes END) AS metal,
    MAX(CASE WHEN genre = 'Latin' THEN minutes END) AS latin
FROM ranked
WHERE n <= 100
GROUP BY n
`,
    visualizations: [
      {
        type: "BOXPLOT",
        name: "Boxplot: track minutes by genre",
        options: { xAxisLabel: "Genre", yAxisLabel: "Minutes" },
      },
    ],
  },
];
