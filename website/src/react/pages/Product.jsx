import React from 'react'
import Layout from 'components/Layout'
import Link from 'components/Link'
import SectionIntegrations from 'components/SectionIntegrations'
import SectionGetStarted from 'components/SectionGetStarted'

const ProductPage = ({ location }) => (
  <Layout
    title="All the tools to unlock your data"
    description="Use Redash to connect to any data source (Redshift, BigQuery, MySQL, PostgreSQL, MongoDB and many others), query, visualize and share your data to make your company data driven."
    location={location}
  >
    <section className="section section-product-hero">
      <div className="container">
        <div className="row">
          <div className="col-md-8 col-md-offset-2 text-center">
            <h1 className="m-b-100">All the tools to unlock your data</h1>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <img src="/assets/images/elements/icon-query.png" width="64px" />
            <h2 className="m-t-0">
              Enjoy the power and comfort of Redash's query editor with powerful
              collaboration
            </h2>
            <ul className="highlight-ul">
              <li>Write queries in their natural syntax and explore schemas</li>
              <li>Live auto-complete and keyboard shortcuts</li>
              <li>Create snippets for elements you frequently use</li>
              <li>Results are cached for minimal running times</li>
              <li>Schedule auto-update times for results you rely on</li>
              <li>
                Use query results as data sources to join different databases
              </li>
            </ul>
            <p>
              <img
                src="/assets/images/elements/integrations-small.png"
                width="75%"
              />
            </p>
            <Link
              data-track
              data-track-location="product-hero"
              track-event="Clicked Check Integrations"
              to="/integrations"
              className="btn btn-secondary"
            >
              Check integrations
            </Link>
          </div>

          <div className="col-md-6">
            <div className="browser-container hidden-xs">
              <img src="/assets/images/elements/browser-header.png" />
              <img src="/assets/images/elements/query-editor-focus.png" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="section bg-soft-blue">
      <div className="container">
        <div className="row">
          <div className="col-md-6 push-sm-down">
            <img
              src="/assets/images/elements/visualizing-data.png"
              width="100%"
              className="visualize-dashboards-illustrated"
            />
          </div>

          <div className="col-md-6">
            <img
              src="/assets/images/elements/icon-dashboard.png"
              width="64px"
            />
            <h4 className="m-b-0">Visualize as you will &</h4>
            <h2 className="m-t-0">create amazing dashboards</h2>
            <ul className="highlight-ul">
              <li>
                Easily visualize your results in various formats: chart, cohort,
                pivot table, boxplot, map, counter, sankey, sunburst and word
                cloud
              </li>
              <li>
                Gather info from multiple sources into thematic dashboards
              </li>
              <li>
                Share your data-story with colleagues, other teams or external
                partners
              </li>
              <li>
                Share dashboards on a URL or embed widgets anywhere you need for
                timely and contextual data
              </li>
            </ul>

            <h4>Visualization types</h4>
            <p>
              <span className="label label-primary">
                Charts: Line, Bar, Area, Pie, Scatter
              </span>
              <span className="label label-primary">Boxplot</span>
              <span className="label label-primary">Cohort</span>
              <span className="label label-primary">Sunburst</span>
              <span className="label label-primary">Word Cloud</span>
              <span className="label label-primary">Sankey</span>
              <span className="label label-primary">Map</span>
              <span className="label label-primary">Counter</span>
              <span className="label label-primary">Pivot Table</span>
              <span className="label label-primary">Funnel</span>
            </p>
            <p class="m-t-25 m-b-0">
              <a href="/help/user-guide/visualizations/visualization-types">
                See examples in the Redash Docs
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="row">
          <div className="col-md-4">
            <img src="/assets/images/elements/icon-alerts.png" width="64px" />
            <h2>Alerts</h2>
            <p>
              Set up alerts and get notified on certain events on your data.
            </p>
          </div>

          <div className="col-md-4">
            <img src="/assets/images/elements/icon-api.png" width="64px" />
            <h2>API</h2>
            <p>
              Access Redash via API and extend its functionality as you like.
            </p>
          </div>

          <div className="col-md-4">
            <img
              src="/assets/images/elements/icon-user-management.png"
              width="64px"
            />
            <h2>User Management</h2>
            <p>
              SSO, access control and many other great features for
              enterprise-friendly workflow.
            </p>
          </div>
        </div>
      </div>
    </section>

    <SectionIntegrations />

    <section className="section section--pt-sm">
      <div className="container">
        <h2 className="text-center mb-md">
          Democratise access to your data in your organization
        </h2>
        <div className="row">
          <div className="col-sm-6">
            <div className="card card--yellow">
              <img
                src="/assets/images/elements/icon-dashboard.png"
                width="64px"
              />
              <h4>Share Dashboards</h4>
              <p>
                Share Dashboard with a single click on a secret URL with your
                peers or clients.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="section section--pt-sm">
      <div className="container">
        <h2 className="text-center mb-md">What our customers say</h2>
        <div className="row">
          <div className="col-md-4">
            <div className="card card--customer">
              <img
                src="/assets/images/customers/root.png"
                alt="Root <3 Redash"
                className="customer-logo"
              />
              <h4 className="serif">
                <em>
                  "Root is an extremely data-driven company. We make dozens of
                  changes to our product every week, and we measure the impact
                  of all of them. Redash allows us to easily analyze data and
                  share results among our team."
                </em>
              </h4>
              <p>
                <img
                  src="/assets/images/customers/dan-manges.jpg"
                  width="32x"
                  className="profile-image"
                />
                by Dan Manges, CTO at{' '}
                <Link to="https://www.joinroot.com/" target="_blank">
                  Root
                </Link>
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card card--customer">
              <img
                src="/assets/images/customers/findhotel.png"
                alt="FindHotel <3 Redash"
                className="customer-logo"
              />
              <h4 className="serif">
                <em>
                  "At FindHotel every important decision is based on data, and
                  Redash has quickly become one of the preferred tools to share
                  a data story across the company..."
                </em>
              </h4>
              <p>
                <img
                  src="/assets/images/customers/german-gomez-herrero.jpg"
                  width="32px"
                  className="profile-image"
                />
                by German Gomez-Herrero, CTO at{' '}
                <Link to="https://www.findhotel.net/" target="_blank">
                  FindHotel
                </Link>
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card card--customer">
              <img
                src="/assets/images/customers/data-miner.png"
                alt="DataMiner <3 Redash"
                className="customer-logo"
              />
              <h4 className="serif">
                <em>
                  "Redash is as essential as email to my company. We love data
                  but accessing the data is a pain without Redash. Any company I
                  go to, I get them hooked on Redash. It's an easy sell :)"
                </em>
              </h4>
              <p>
                <img
                  src="/assets/images/customers/ben-dehghan.jpg"
                  width="32px"
                  className="profile-image"
                />
                by Ben Dehghan, Co-Founder of{' '}
                <Link to="https://data-miner.io/" target="_blank">
                  Data Miner
                </Link>
              </p>
            </div>
          </div>
        </div>
        <div className="row text-center">
          <Link
            data-track
            data-track-location="product-testimonials"
            track-event="Clicked Check Customers Say"
            to="/customers"
            className="btn btn-secondary"
          >
            Read Customer Stories
          </Link>
        </div>
      </div>
    </section>

    <SectionGetStarted />
  </Layout>
)

export default ProductPage
