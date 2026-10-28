import React from 'react'
import Header from 'components/Header'
import Footer from 'components/Footer'

// <head> tags (title, description, social cards) and the iframe/postMessage
// bridge now live in src/layouts/MarketingLayout.astro. Pages still pass
// title/description here, unchanged from the Gatsby site; the Astro route
// reads them from the page module's `meta` export instead.
export default ({ children }) => (
  <div className="wrapper">
    <Header />
    <main>{children}</main>
    <Footer />
  </div>
)
