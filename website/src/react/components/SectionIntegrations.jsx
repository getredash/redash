import React from 'react'
import Link from 'components/Link'

const SectionIntegrations = () => (
  <section className="section section__integrations">
    <div className="container">
      <div className="row integrations-container">
        <div className="col-sm-8">
          <img
            src="/assets/images/elements/integrations.png"
            id="integrations-illustrated"
            className="visible-xs"
          />
          <h2>Query All the Data Sources You Need</h2>
          <p className="highlight-p">
            Redash supports SQL, NoSQL, Big Data and API data sources - query
            your data from different sources to answer complex questions.
          </p>
          <p className="highlight-p">
            <Link to="/integrations/">
              Supported data sources and integrations →
            </Link>
          </p>
        </div>
        <div className="col-sm-4 text-right">
          <img
            src="/assets/images/elements/integrations.png"
            id="integrations-illustrated"
            className="hidden-xs"
          />
        </div>
      </div>
    </div>
  </section>
)

export default SectionIntegrations
