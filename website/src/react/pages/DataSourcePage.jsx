import React from 'react'
import Layout from 'components/Layout'
import Link from 'components/Link'
import SectionGetStarted from 'components/SectionGetStarted'

export default function DataSourcePageTemplate({
  location,
  data: {
    markdownRemark: { frontmatter },
  },
}) {
  return (
    <Layout title={frontmatter.title} location={location}>
      <section className="section">
        <div className="container">
          <div className="from-to-holder">
            <div className="from-to-holder__item">
              <img
                src={frontmatter.logo}
                className="from-to-holder__logo"
                alt=""
              />
              <p className="from-to-holder__title">{frontmatter.name}</p>
            </div>
            <div className="from-to-plus"> + </div>
            <div className="from-to-holder__item">
              <img
                src="/assets/images/redash-256.png"
                className="from-to-holder__logo"
                alt=""
              />
              <p className="from-to-holder__title">Redash</p>
            </div>
          </div>

          <h2 className="text-center mb-lg m-t-50">
            Query and Visualize <strong>{frontmatter.name} in Redash</strong> in
            just a few moments
          </h2>
        </div>
      </section>

      <section className="section section--pt-sm">
        <div className="container">
          <div className="row">
            <div className="col-md-6 push-sm-down">
              <img
                src="/assets/images/elements/query-editor.png"
                className="img-responsive center-block img-rounded img--has-shadow"
                alt=""
              />
            </div>

            <div className="col-md-6">
              <ul className="highlight-ul m-t-25">
                <li>
                  <b>Query {frontmatter.name}</b> using its natural syntax,
                  enjoy live auto-complete and explore your {frontmatter.name}{' '}
                  schema easily in Redash's cloud-based query editor.
                </li>
                <li>
                  <b>Get results, fast</b> - shorter on-demand running times,
                  all query results are cached, so you don't have to wait for
                  the same result set every time.
                </li>
                <li>
                  <b>Schedule</b> queries to run periodically to view the latest
                  data without running again and again manually.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--pt-sm">
        <div className="container">
          <div className="row">
            <div className="col-md-6 push-sm-down">
              <img
                src="/assets/images/elements/dashboard.png"
                className="img-responsive center-block img-rounded img--has-shadow"
                alt=""
              />
            </div>

            <div className="col-md-6">
              <ul className="highlight-ul m-t-50">
                <li>
                  <b>Visualize your {frontmatter.name}</b> data and gather it
                  into thematic dashboards from multiple sources, share the
                  story your data tells with your team or extermal partners.
                </li>
                <li>
                  <b>Supported visualizations</b>:
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
                  ...and more are on the way.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--pt-sm">
        <div className="container">
          <div className="row">
            <div className="col-md-6 push-sm-down">
              <img
                src="/assets/images/elements/slack-redash.png"
                className="img-responsive center-block img-rounded img--has-shadow"
                alt="Slack chat demo"
              />
              {/* Stray character from the Gatsby site, kept so the page renders the same. */}
              {'>'}
            </div>

            <div className="col-md-6">
              <ul className="highlight-ul m-t-50">
                <li>
                  <b>Share insights from {frontmatter.name}</b> via link or
                  embed them wherever you need to make your organization truly
                  data driven.
                </li>
                <li>
                  <b>Integrate</b> Redash with external services and{' '}
                  <b>create alerts</b> to be alway in the know.
                </li>
              </ul>
            </div>
          </div>
          <div className="row text-center m-t-50">
            <Link to="/product/" className="btn btn-primary">
              Check all the features
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="row">
            <h2 className="text-center">What our customers say</h2>
            <div className="col-lg-6">
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
                    width="48px"
                    className="profile-image"
                  />
                  {'>'} by Dan Manges, CTO at{' '}
                  <Link to="https://www.joinroot.com/" target="_blank">
                    Root Insurance
                  </Link>
                </p>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card card--customer">
                <img
                  src="/assets/images/customers/atomized.jpeg"
                  alt="Atomized <3 Redash"
                  className="customer-logo"
                />
                <h4 className="serif">
                  <em>
                    "The ability to query multiple data sources from a single
                    window in a read-only environment is a huge plus for our
                    team on a day to day basis. Redash allowed our team to
                    provide better customer service by giving us the information
                    we need without requiring a developer to get involved."
                  </em>
                </h4>
                <p>
                  by Jon Lee, CTO at{' '}
                  <Link to="https://www.atomized.com/" target="_blank">
                    Atomized
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionGetStarted />
    </Layout>
  )
}

