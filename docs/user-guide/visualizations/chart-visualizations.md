---
title: Chart Visualizations
---

Redash bundles together charts that use X & Y axes into the **Chart** visualization type, which can take eight different forms. Because the forms are similar, you can often switch seamlessly between them to find the one that best conveys your meaning. In the animation below, all eight charts were built from the same SQL query result:

<video src="/assets/images/docs/gifs/visualization/chart-examples.mp4" controls muted loop playsinline width="100%"></video>

## Setup

Your query should return at least two columns: one column of values for the **X axis** and one column of values for the **Y Axis**. It can also return values for trace [grouping], displaying [error bars], and bubble sizes.

The charts in the above animation were all produced from the following tabular result:

![](/assets/images/docs/gitbook/animation-table-data.png)

Once your query returns the right columns, start by setting your X and Y axis values. The visualization preview updates instantly. You don't need to save the visualization to see how a change affects its appearance. Tabs along the top of the Visualization Settings screen give you fine-grained control over the rest of chart.

Use the **X Axis** and **Y Axis** tabs to modify the axis ranges and labels.

The **Series** tab is powerful. It lets you change your data aliases, z-index behavior, assign traces between the left- and right- Y axes. It also lets you combine different trace forms on one chart like in the chart below.

![](/assets/images/docs/gitbook/multi-form-chart.png)

**Colors** gives you a color picker for changing the appearance of the traces on your charts.

**Data Labels** controls what appears when you hover your mouse over a chart.

## Grouping

The **Group By** setting can generate multiple traces against the same X and Y axes. It does this by grouping records into distinct traces instead of drawing one line. Almost every time you see multiple colors of line or bar in a Redash chart, it's because the query results included a grouping column.

As shown in the below example, the grouping column is used to sort `(x,y)` pairs together.

![](/assets/images/docs/gitbook/group-by-ex.png)

Use of **Group By** is often easier than writing queries which return multiple Y columns for an X value. The following two data sets are identical.

![](/assets/images/docs/gitbook/grouped-vs-pivot.png)

:::note

Use the **Group By** column for melted data sets. Use multiple Y-columns for pivoted data sets

:::

## Stacking

Redash can "stack" your Y axis values on top of one another. The name name is borrowed from [Stacked Bar Charts], but it can be useful with area charts as well. The below image shows the same data, unstacked on the left and stacked on the right.

![](/assets/images/docs/gitbook/stacked_vs_not_stacked.png)

Notice how each Y axis value is displayed as the sum of itself and the Y values "beneath" it.

:::note

Stacking and Grouping are related. You won't stack data unless you have also grouped it.

:::

You can use the **Series** tab of the Visualization Editor to control the order in which traces are stacked. You can also control it by adding an `ORDER BY` statement to your query. The stack follows the order in which your group names first appear in your query result. Stacking is only available for Line, Bar, and Area charts.

## Error Bars

For certain chart forms, Redash can draw error bars around your data points using values from your query result. A few things are always true of error bars:

1. Error bars are always symmetrical. The distance above and below a given `(x,y)` pair is always the same.
2. Errors are the same color as their target trace
3. Errors are shown for all traces or no traces. They cannot be configured to appear on some traces and not others.
4. The values in your errors column will be charted on the same axis as their associated trace. This means your error values must be absolute. You cannot, for example, have errors expressed in percentages for Y values expressed in hundreds.

![](/assets/images/docs/gitbook/area_grouped_stacked_errors.png)

Also keep in mind that errors are not aggregated when you stack records. An error bar will be shown for each trace. You can work around this by only providing non-zero error values for those records where the error should be displayed prominently. See in the above example that a flat error bar is shown at every trace point. But only the `Paid` trace error bars have any length.

## Using Chart Forms

Each chart form is useful for certain kinds of presentation. You can mix and match multiple forms on the same chart as needed.

- **Line** charts are almost exclusively used to present change in one or more metrics over _time_.
- **Bar** charts can be used to present change in metrics over time or to show proportionality, like a pie chart. Bar charts can be combined with [Stacking] with great effect. Horizontal bar charts are also supported.
- **Area** charts are often used to show sales funnel changes through time. They are frequently combined with [Stacking] to grant a broader picture.
- **Pie** charts are designed to show proportionality between metrics. They are _not_ meant for conveying time series data.
- **Scatter** charts excel at showing many groups of data points. Under the covers, Scatter plots are just like line plots, but without the connecting lines. A scatter graph is more precise but less useful for time series data.

:::note

Scatter plots are necessary for visualizations where some groups appear just once. The line chart does not display singleton values because it can only show data where two or more points are present. One option is to force singletons into scatter form on the **Series** tab of the Visualization Editor while keeping other traces in line form.

:::

- **Bubble** charts are scatter graphs where the size of each point marker reflects a relevant metric.
- **Heatmap** visualizations blend features of bar charts, stacking, and bubble charts. There are several built-in color schemes to pick from. Heatmaps cannot be grouped since the entire chart is technically one trace.
- **Box** plots can automatically show the distribution of data points across grouped categories. Horizontal box plots are also supported.

## Common Mistakes

### Multiple Records per X-axis value

Redash can make some crazy shapes if your query returns two or more rows with the same **X axis** value. This often happens in SQL if you unintentionally `JOIN` a table with a one-to-many relationship.

![](/assets/images/docs/gitbook/error_double_entries.png)

In this example a vertical line is drawn because there are two records for 1 January. You can resolve this by filtering out the doubled entries on the **X axis**. Or revise the query to include [grouping] field, as shown below.

![](/assets/images/docs/gitbook/error_double_entries__solved.png)

### Unordered X-axis records

Redash is smart enough to figure out most common **X axis** scales: timestamps, linear, and logarithms. But if it can't parse your X column into an ordered series, it falls back to treating each X value as a "category". This can have mixed results:

![](/assets/images/docs/gitbook/charted_redash_logo__broken.png)

If you see shapes you don't expect you can check whether your X axis has been sorted on the **X Axis** tab of the Visualization Editor. Just toggle the _Sort Values_ option. If _Sort Values_ is disabled then Redash retains the ordering of the source query.

![](/assets/images/docs/gitbook/charted_redash_logo__working.png)

These two charts come from the same base data. The only difference is whether or not Redash sorted the X axis values.

[group by]: #Grouping
[grouping]: #Grouping
[errors]: #error
[error bars]: #error
[stacking]: #Stacking
[line]: #line
[bar]: #bar
[area]: #area
[stacked bar charts]: https://en.wikipedia.org/wiki/Bar_chart#Grouped_and_stacked
