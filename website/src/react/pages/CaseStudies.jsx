import React from 'react'
import Layout from 'components/Layout'
import Link from 'components/Link'
import SectionGetStarted from 'components/SectionGetStarted'

const CaseStudiesPage = ({ location }) => (
  <Layout
    title="Case Studies"
    description="Stories about how Redash is being used"
    location={location}
  >
    <section className="section">
      <div className="container">
        <div className="row">
          <div className="col-md-8 col-md-offset-2 text-center">
            <h1>Case Studies</h1>
            <p>
              See how various organizations use Redash to build a data-driven
              business
            </p>
          </div>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="row">
          <div className="col-md-6">
            <Link
              data-track
              to="/case-studies/stasher"
              className="featured-customer case-study-item"
            >
              <img
                src="/assets/images/customers/stasher.jpg"
                alt="Stasher logo"
                className="customer-logo"
              />
              <h2>Stasher</h2>
              <p>
                Stasher uses Redash to track KPIs and collaborate with partners
              </p>
              <button className="btn btn-secondary">Learn more →</button>
            </Link>

            <Link
              data-track
              to="/case-studies/bubbleiq"
              className="featured-customer case-study-item"
            >
              <img
                src="/assets/images/customers/bubbleiq.png"
                alt="BubbleIQ logo"
                className="customer-logo"
              />
              <h2>BubbleIQ</h2>
              <p>
                BubbleIQ uses Redash to support sales, save engineering time and
                report towards investors
              </p>
              <button className="btn btn-secondary">Learn more →</button>
            </Link>
          </div>
          <div className="col-md-6">
            <Link
              data-track
              to="/case-studies/studio71"
              className="featured-customer case-study-item"
            >
              <img
                src="/assets/images/customers/studio71.png"
                alt="Studio71 logo"
                className="customer-logo"
              />
              <h2>Studio71</h2>
              <p>
                Studio71 uses Redash to build a data driven culture, save time
                and support sales and talent management
              </p>
              <button className="btn btn-secondary">Learn more →</button>
            </Link>
          </div>
        </div>
      </div>
    </section>

    <SectionGetStarted />
  </Layout>
)

export default CaseStudiesPage
