---
title: Formatting Axis in Visualizations
---

Visualizations X and Y axis values are formatted with D3. Below you can find examples for the various format options.

## Numbers

The general form of a number specification is:

```
[​[fill]align][sign][symbol][0][width][,][.precision][~][type]
```

_fill_ can be any character. The presence of a fill character is signaled by the _align_ character following it, which must be one of the following:

- `>` - Forces the field to be right-aligned within the available space. (Default behavior).
- `<` - Forces the field to be left-aligned within the available space.
- `^` - Forces the field to be centered within the available space.
- `=` - like `>`, but with any sign and symbol to the left of any padding.

_sign_ can be:

- `-` - nothing for zero or positive and a minus sign for negative. (Default behavior.)
- `+` - a plus sign for zero or positive and a minus sign for negative.
- `(` - nothing for zero or positive and parentheses for negative.
- ` ` (space) - a space for zero or positive and a minus sign for negative.

_symbol_ can be:

- `$` - apply currency symbols per the locale definition.
- `#` - for binary, octal, or hexadecimal notation, prefix by `0b`, `0o`, or `0x`, respectively.

The _zero_ (`0`) option enables zero-padding; this implicitly sets _fill_ to `0` and _align_ to `=`. The _width_ defines the minimum field width; if not specified, then the width will be determined by the content. The _comma_ (`,`) option enables the use of a group separator, such as a comma for thousands.

Depending on the _type_, the _precision_ either indicates the number of digits that follow the decimal point (types `f` and `%`), or the number of significant digits (types `​`, `e`, `g`, `r`, `s` and `p`). If the precision is not specified, it defaults to 6 for all types except `​` (none), which defaults to 12. Precision is ignored for integer formats (types `b`, `o`, `d`, `x`, and `X`) and character data (type `c`).

The `~` option trims insignificant trailing zeros across all format types. This is most commonly used in conjunction with types `r`, `e`, `s` and `%`.

The available _type_ values are:

- `e` - exponent notation.
- `f` - fixed point notation.
- `g` - either decimal or exponent notation, rounded to significant digits.
- `r` - decimal notation, rounded to significant digits.
- `s` - decimal notation with an "SI prefix" (`k`, `M`, `G`, ...), rounded to significant digits.
- `%` - multiply by 100, and then decimal notation with a percent sign.
- `p` - multiply by 100, round to significant digits, and then decimal notation with a percent sign.
- `b` - binary notation, rounded to integer.
- `o` - octal notation, rounded to integer.
- `d` - decimal notation, rounded to integer.
- `x` - hexadecimal notation, using lower-case letters, rounded to integer.
- `X` - hexadecimal notation, using upper-case letters, rounded to integer.
- `c` - character data, for a string of text.

The type `​` (none) is also supported as shorthand for `~g` (with a default precision of 12 instead of 6), and the type `n` is shorthand for `,g`. For the `g`, `n` and `​` (none) types, decimal notation is used if the resulting string would have _precision_ or fewer digits; otherwise, exponent notation is used. For example:

## Time

The time format string may contain the following directives:

- `%a` - abbreviated weekday name.\*
- `%A` - full weekday name.\*
- `%b` - abbreviated month name.\*
- `%B` - full month name.\*
- `%c` - the locale’s date and time, such as `%x, %X`.\*
- `%d` - zero-padded day of the month as a decimal number [01,31].
- `%e` - space-padded day of the month as a decimal number [ 1,31]; equivalent to `%_d`.
- `%f` - microseconds as a decimal number [000000, 999999].
- `%g` - ISO 8601 week-based year without century as a decimal number [00,99].
- `%G` - ISO 8601 week-based year with century as a decimal number.
- `%H` - hour (24-hour clock) as a decimal number [00,23].
- `%I` - hour (12-hour clock) as a decimal number [01,12].
- `%j` - day of the year as a decimal number [001,366].
- `%m` - month as a decimal number [01,12].
- `%M` - minute as a decimal number [00,59].
- `%L` - milliseconds as a decimal number [000, 999].
- `%p` - either AM or PM.\*
- `%q` - quarter of the year as a decimal number [1,4].
- `%Q` - milliseconds since UNIX epoch.
- `%s` - seconds since UNIX epoch.
- `%S` - second as a decimal number [00,61].
- `%u` - Monday-based (ISO 8601) weekday as a decimal number [1,7].
- `%U` - Sunday-based week of the year as a decimal number [00,53].
- `%V` - ISO 8601 week of the year as a decimal number [01, 53].
- `%w` - Sunday-based weekday as a decimal number [0,6].
- `%W` - Monday-based week of the year as a decimal number [00,53].
- `%x` - the locale’s date, such as `%-m/%-d/%Y`.\*
- `%X` - the locale’s time, such as `%-I:%M:%S %p`.\*
- `%y` - year without century as a decimal number [00,99].
- `%Y` - year with century as a decimal number, such as `1999`.
- `%Z` - time zone offset, such as `-0700`, `-07:00`, `-07`, or `Z`.
- `%%` - a literal percent sign (`%`).

Directives marked with an asterisk (\*) may be affected by the locale definition.

The `%` sign indicating a directive may be immediately followed by a padding modifier:

- `0` - zero-padding
- `_` - space-padding
- `-` - disable padding

If no padding modifier is specified, the default is `0` for all directives except `%e`, which defaults to `_`.
