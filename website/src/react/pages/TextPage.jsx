import React from 'react'
import Layout from 'components/Layout'

export default function TextPageTemplate({
  location,
  data: {
    markdownRemark: { frontmatter, html },
  },
}) {
  return (
    <Layout title={frontmatter.title} location={location}>
      <div className="container p-t-25 p-b-25">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </Layout>
  )
}

