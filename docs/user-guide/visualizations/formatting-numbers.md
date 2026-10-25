---
title: Formatting Numbers in Visualizations
---

In several Redash visualizations you can control how the numbers are formatted. You control the format by supplying a format string. Below you can find examples for the various format options.

## Numbers

<div class="table table-striped">

| Number     | Format       | Output        |
| ---------- | ------------ | ------------- |
| 10000      | '0,0.0000'   | 10,000.0000   |
| 10000.23   | '0,0'        | 10,000        |
| 10000.23   | '+0,0'       | +10,000       |
| -10000     | '0,0.0'      | -10,000.0     |
| 10000.1234 | '0.000'      | 10000.123     |
| 100.1234   | '00000'      | 00100         |
| 1000.1234  | '000000,0'   | 001,000       |
| 10         | '000.00'     | 010.00        |
| 10000.1234 | '0[.]00000'  | 10000.12340   |
| -10000     | '(0,0.0000)' | (10,000.0000) |
| -0.23      | '.00'        | -.23          |
| -0.23      | '(.00)'      | (.23)         |
| 0.23       | '0.00000'    | 0.23000       |
| 0.23       | '0.0[0000]'  | 0.23          |
| 1230974    | '0.0a'       | 1.2m          |
| 1460       | '0 a'        | 1 k           |
| -104000    | '0a'         | -104k         |
| 1          | '0o'         | 1st           |
| 100        | '0o'         | 100th         |

</div>

## Currency

<div class="table table-striped">

| Number    | Format        | Output      |
| --------- | ------------- | ----------- |
| 1000.234  | '\$0,0.00'    | \$1,000.23  |
| 1000.2    | '0,0[.]00 \$' | 1,000.20 \$ |
| 1001      | '\$ 0,0[.]00' | \$ 1,001    |
| -1000.234 | '(\$0,0)'     | (\$1,000)   |
| -1000.234 | '\$0.00'      | -\$1000.23  |
| 1230974   | '(\$ 0.00 a)' | \$ 1.23 m   |

</div>

## Bytes

<div class="table table-striped">

| Number        | Format     | Output    |
| ------------- | ---------- | --------- |
| 100           | '0b'       | 100B      |
| 1024          | '0b'       | 1KB       |
| 2048          | '0 ib'     | 2 KiB     |
| 3072          | '0.0 b'    | 3.1 KB    |
| 7884486213    | '0.00b'    | 7.88GB    |
| 3467479682787 | '0.000 ib' | 3.154 TiB |

</div>

## Percentages

<div class="table table-striped">

| Number     | Format      | Output   |
| ---------- | ----------- | -------- |
| 100        | '0%'        | 100%     |
| 97.4878234 | '0.000%'    | 97.488%  |
| -4.3       | '0 %'       | -4 %     |
| 65.43      | '(0.000 %)' | 65.430 % |

</div>

## Exponential

<div class="table table-striped">

| Number       | Format     | Output   |
| ------------ | ---------- | -------- |
| 1123456789   | '0,0e+0'   | 1e+9     |
| 12398734.202 | '0.00e+0'  | 1.24e+7  |
| 0.000123987  | '0.000e+0' | 1.240e-4 |

</div>
