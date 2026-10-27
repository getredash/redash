---
title: Query Snippets
---

Copy and Paste are a big part of composing database queries. Because it's much easier to duplicate prior work than to write it from scratch. This is particularly true for common `JOIN` statements or complex `CASE` expressions. As your list of queries in Redash grows, however, it can be difficult to remember which queries contain the statement you need right now. Enter Query Snippets.

Query Snippets are segments of queries that your whole team can share and trigger via auto complete. You create them at `Settings` -> `Query Snippets`.

![](/assets/images/docs/gitbook/Snippet.png)

Here's an example for a simple snippet:

```
JOIN organizations org ON org.id = ${1:table}.org_id
```

## Insertion Points

`${1:table}` is an insertion point with placeholder text. When Redash renders the snippet, the dollar sign `$` and curly braces `{}` will be stripped away and the word `table` will be highlighted for the user to replace.

:::note

You can use the placeholder text as a desirable default value for the user to override at runtime.

:::

You designate insertion points by wrapping an integer tab order with a single dollar sign and curly braces `${}`. A text placeholder preceded by a colon `:` is optional but useful for users unfamiliar with your snippet.

When Redash renders this snippet:

    AND (invoices.complete IS NULL OR invoices.complete <> '${2}')
    AND (invoices.canceled IS NULL OR invoices.canceled <> '${1}')
    AND (invoices.modified IS NULL OR invoices.modified_date <> '${0: this_date}')

The text insertion carat will jump to the second line between the quote marks `''`. When the user presses `Tab` the carat will jump _backwards_ onto the first line. When the user presses `Tab` again, the carat will jump to the third line and `this_date` will be highlighted to prompt the user for the desired value.

:::note

An insertion point of zero `${0}` is always the _last_ point in the tab order.

:::

## Insert A Query Snippet

If you have Live Auto Complete enabled, you can invoke your snippet from the Query Editor by typing the trigger word you defined in the Query Snippet editor. Auto Complete will suggest it like any other keyword in your database.

:::caution

If Live Auto Complete is disabled, you can still invoke Query Snippets by pressing `CTRL + Space` and typing the trigger word for your Query Snippet. This can be necessary if your schema exceeds 5000 tokens.

:::

Here are some other ideas for snippets:

- Frequent `JOIN` statements
- Complicated clauses like `WITH` or `CASE`.
- [Conditional Formatting](https://discuss.redash.io/t/conditional-formatting-general-text-formatting/1706/1)
