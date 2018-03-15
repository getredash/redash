---
categories:
- redash-hacks
collection: examples
helpscout_url: https://help.redash.io/article/136-condition
keywords: null
name: Conditional Formatting & General Text Formatting
slug: condition
---
While Redash doesn't naturally support conditional formatting, this can be
bypassed with some html tags.

    
    
    CASE
        WHEN cat.color IN ('short_hair',
                              'semi_short_hair')
             AND cat_count > 1000 THEN '<div class="bg-success p-10 text-center">count(cat)</div>'
             OR cat_count > 200 THEN '<div class="bg-warning p-10 text-center">count(cat)</div>'
        ELSE '<div class="bg-danger p-10 text-center">count(cat)</div>'
    END AS cat_count
    

In this example we cover different formatting types you can apply in a div:

1

    Colors - green (bg-success), yellow (bg-warning) and red (bg-danger). You can also use bg-info for blue but who wants blue in their tables? 
2

    Padding - we used 10 to pad the text just a little bit. 
3

    Text alignment - we aligned our cat counts to the center (text-center), by default tables are aligned to the left.

Other styling formats you can use:

1

    Font Size (font-size) - can be pixels (10ox, 20px, 34px and so on), relative (50%, 150%...), textual (large, medium, xx-small..) or HTML tags for headings (h1, h2...). 
2

    Headings `<h1>` and Displays (class = display1) - h1-h6 are heading sizes when h1 is the largest, display is a class you can combine with a heading to get a more stylized look. 
3

    Font type (font-family) - change the font, not all fonts are supported in each browser so it's tricky. 
4

    Misc- mark (mark),  _underline (u)_ , bold (strong),  _italic (em)_

You're welcome to try other Bootstrap CSS tricks and share with us.

