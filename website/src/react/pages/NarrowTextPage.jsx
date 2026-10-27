import React from 'react'
import Layout from 'components/Layout'

export default function NarrowTextPageTemplate({
  location,
  data: {
    markdownRemark: { frontmatter, html },
  },
}) {
  return (
    <Layout title={frontmatter.title} location={location}>
      <div className="container p-t-25 p-b-25">
        <div className="row">
          <div className="col-md-8 col-md-offset-2">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>
    </Layout>
  )
}

