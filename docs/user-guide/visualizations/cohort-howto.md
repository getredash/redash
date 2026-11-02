---
title: Cohort Visualizations
sidebar:
  order: 1
---

## Cohorts Introduction

A cohort analysis examines the outcomes of predetermined groups, called cohorts, as they progress through a set of stages. The signature characteristic of a cohort chart is its comparison of the change in a variable across two different time series. For example, a common cohort definition is users by sign-up period and their usage pattern by day. Other examples include:

- Monthly hard drive failure statistics by month
- Weekly supplier delivery performance by week
- Monthly average class GPA's by month

While there are many ways to define the stages of a Cohort analysis, Redash's supports Cohorts visualizations with daily, weekly, or monthly stages. Also, Redash's cohort charts compare a cohort's measurements in a given period against that group's initial population size.

### Data Format

Redash expects your input samples to take the following format:

| Cohort Date | Period | Count Satisfying Target | Total Cohort Size |
| ----------- | ------ | ----------------------- | ----------------- |

- **Cohort Date** is the date that uniquely identifies a cohort. Suppose you're visualizing monthly user activity by sign-up date, your cohort date for all users that signed-up in January 2018 would be January 1st, 2018. The cohort date for any user that signed-up in February would be February 1st, 2018.
- **Period** is a count of how many periods transpired since the cohort date as of this sample. If you are grouping users by sign-up month, then your period will be the count of months since these users signed up. In the above example, a measurement of activity in July for users that signed up in January would yield a period value of 7 because seven periods have transpired between January and July.
- **Count Satisfying Target** is your actual measurement of this cohort's performance in the given period. In the above example, if thirty users who signed up in January showed activity in July then the Count Satisfying Target would be 30.
- **Total Cohort Size** is the denominator that Redash will use to calculate the percentage of a cohort's target satisfaction for a given period. Continuing the example above, if seventy-two users signed up in January then the Total Cohort Size would be 72. When the visualization is rendered, Redash would display the value as 41.67% (30 ÷ 72).

### Cohort Date Notes

Even if you define your cohorts by month or week, Redash expects the values in your **Cohort Date** column to be a full date value. If you are grouping by month, `2018-01-18` should be shortened to `2018-01-01` or any other full date in January, **not** `2018-01`.

Due to a bug in the underlying rendering engine, Redash's cohort visualizer converts all date and time values to GMT before rendering. To avoid rendering issues, you should adjust the datetimes returned from your database by your local UTC offset.
