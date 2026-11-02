import React from 'react'
import Layout from 'components/Layout'
import IntegrationsCard from 'components/IntegrationsCard'
import SectionGetStarted from 'components/SectionGetStarted'

const IntegrationsPage = ({
  location,
  data: { Databases, Integrations, Partners },
}) => (
  <Layout
    title="Supported Databases, APIs and Integrations"
    description="Use Redash to connect to any data source (Redshift, BigQuery, MySQL, PostgreSQL, MongoDB and many others), query, visualize and share your data to make your company data driven."
    location={location}
  >
    <section className="section section--pt-lg">
      <div className="container">
        <h1 className="text-center">Query all the data sources you need</h1>
        <h4 className="text-center font-light">
          Redash supports SQL, NoSQL, Big Data and API data sources - query data
          from different sources and types to answer complex issues.
        </h4>
      </div>
    </section>

    <section className="section">
      <div className="container container-sm">
        <div className="row">
          <div className="col-md-12 text-center">
            <h2>Databases</h2>

            <div className="cards">
              {Databases.edges.map(({ node: { frontmatter } }) => {
                return (
                  <IntegrationsCard
                    name={frontmatter.name}
                    logo={frontmatter.logo}
                    path={frontmatter.path}
                    key={frontmatter.name}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container container-sm">
        <div className="row">
          <div className="col-md-12 text-center">
            <h2>Integrations</h2>

            <div className="cards">
              {Integrations.edges.map(({ node: { frontmatter } }) => {
                return (
                  <IntegrationsCard
                    name={frontmatter.name}
                    logo={frontmatter.logo}
                    path={frontmatter.path}
                    key={frontmatter.name}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container container-sm">
        <div className="row">
          <div className="col-md-12 text-center">
            <h2>Partners</h2>

            <div className="cards">
              {Partners.edges.map(({ node: { frontmatter } }) => {
                return (
                  <IntegrationsCard
                    name={frontmatter.name}
                    logo={frontmatter.logo}
                    path={frontmatter.path}
                    key={frontmatter.name}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>

    <SectionGetStarted />
  </Layout>
)


export default IntegrationsPage
