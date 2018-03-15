---
categories:
- example-queries
collection: examples
helpscout_url: https://help.redash.io/article/132-cohort-q
keywords: null
name: Cohort Query Example
slug: cohort-q
---
Cohorts are a good tool to review retention of users over a defined period of
time.

To create your own cohort report, you'll need to define your cohort time
frame, population, and activeness of users.

Here is an example of a cohort query in PostgreSQL, step by step:

* We used the `WITH` clause in this example - `WITH` clauses allow you to name a sub-query block, this way your query is modular (and sometimes runs faster), it can later be referred to inside the main query instead of making a large main query with many aliases, `JOIN`s or other complexities. You can have multiple sub-queries, just be sure to have a comma between them
1

    Select the time frame you want to investigate (usually a between a week and a month)  

    
    
    WITH    
    time_frame AS (    
    SELECT CURRENT_DATE - 14   
    ),
    

2

    Define your population relative to the cohort date, for each following day 
    
    
    population AS (
         select created_at::DATE AS cohort_date, id AS unique_id
         FROM users
         WHERE created_at > (SELECT * FROM time_frame)
       ),
    

3

    Define what's an active user to you - what event interest you to examine 
    
    
    activity AS (
         SELECT created_at::DATE AS activity_date, org_id AS unique_id, cohort_date
         FROM events
         JOIN population ON population.unique_id = org_id
         WHERE created_at > (SELECT * FROM time_frame)
       ),
    

4

    Aggregate your population by cohort date (day 1, day 2...) 
    
    
       population_agg AS (
         SELECT cohort_date, COUNT(distinct unique_id) AS total
         FROM population
         GROUP BY 1
       )
    

5

    Write your query to show your population % by cohort dates 
    
    
    SELECT activity.cohort_date AS DATE,
           date_part('day',age(activity_date, activity.cohort_date)) AS day_number,
           COUNT(distinct unique_id) AS value,
           total
       FROM activity
       JOIN population_agg ON activity.cohort_date = population_agg.cohort_date
       GROUP BY 1 , 2, 4
    

6

    Add a cohort visualization to your query and you're done!
![](https://redash.io/help/assets/visualization_examples/cohort.png)

