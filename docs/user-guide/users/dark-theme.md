---
title: Dark Theme
description: Switch Redash between its light and dark themes, or follow your operating system.
keywords: [dark mode, dark theme, theme, appearance]
---

Redash has a light and a dark theme.

## Choosing your theme

Open your profile (click your picture at the bottom of the sidebar, then **Profile**) and pick a **Theme**:

- **Organization default**: the theme your admin chose for everyone (the initial setting).
- **Light** or **Dark**.
- **System**: follows the light or dark appearance of your operating system, and switches with it.

The change applies right away, and it's saved with your account, so it follows you on every browser.

## The organization's default theme

Admins set the default in **Settings > General > Theme**. It applies to users who haven't chosen a theme of their
own, to the login page, and to public dashboards and embedded visualizations. An admin who chose a theme in their
profile keeps seeing that one: the settings page says so. On a self-hosted Redash, the initial
default can also be set with the `REDASH_DEFAULT_THEME` [environment variable](/help/open-source/admin-guide/env-vars-settings/).

## Overriding the theme in a link

Add `theme=light`, `theme=dark` or `theme=system` to the query string of a Redash page to open it in that theme
without changing anyone's settings. It's handy for a dashboard on a TV screen, or for an embedded visualization that
should match the page around it:

```
https://redash.example.com/public/dashboards/<token>?theme=dark
```

:::note
Colours chosen in a visualization's options don't change with the theme: series colours, a map's background or the
colour range of a cohort or choropleth stay as configured. If a series is drawn in black or a dark grey, or a map has
a white background, consider other colours so they read well in both themes. Custom JavaScript charts draw their own
colours too.

Pages are printed in the light theme.
:::
