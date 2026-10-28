import React from 'react'
import Layout from 'components/Layout'
import Link from 'components/Link'
import SectionUsers from 'components/SectionUsers'
import SectionIntegrations from 'components/SectionIntegrations'
import SectionGetStarted from 'components/SectionGetStarted'

class Homepage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      controls: null,
    }

    this.addControls = this.addControls.bind(this)
    this.removeControls = this.removeControls.bind(this)
  }

  addControls() {
    this.setState({ controls: 'controls' })
  }

  removeControls() {
    this.setState({ controls: null })
  }

  render() {
    return (
      <Layout
        title="Redash helps you make sense of your data"
        description="Use Redash to connect to any data source (PostgreSQL, MySQL, Redshift, BigQuery, MongoDB and many others), query, visualize and share your data to make your company data driven."
        location={this.props.location}
      >
        <section className="section section--hero">
          <div className="container">
            <div className="row">
              <div className="col-md-5">
                <h1 className="mb-xs">
                  Redash helps you make sense of your data
                </h1>
                <h3 className="font-light">
                  Connect and query your data sources, build dashboards to
                  visualize data and share them with your company.
                </h3>
                {/* <Link
                  data-track
                  data-track-location="hero"
                  track-event="Clicked Get Started"
                  to="https://app.redash.io/signup"
                  className="btn btn-primary btn-lg"
                >
                  Get Started
                </Link> */}
              </div>
              <div className="col-md-7 hidden-xs hidden-sm">
                <div className="browser-container hidden-xs">
                  <img src="/assets/images/elements/browser-header.png" />
                  <video
                    width="100%"
                    height="100%"
                    autoPlay
                    loop
                    muted
                    id="main-video"
                    controls={this.state.controls}
                    onMouseEnter={this.addControls}
                    onMouseLeave={this.removeControls}
                  >
                    <source
                      src="/assets/images/elements/redash-intro-720.mp4"
                      type="video/mp4"
                    />
                    <source
                      src="/assets/images/elements/redash-intro-720.ogv"
                      type="video/ogg"
                    />
                    <source
                      src="/assets/images/elements/redash-intro-720.webm"
                      type="video/webm"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
          </div>
        </section>

        <SectionUsers />

        <section className="section section__feature section__feature--query">
          <div className="container">
            <div className="row">
              <div className="col-sm-6">
                <img
                  src="/assets/images/elements/write-queries.png"
                  id="write-query-illustrated"
                  className="visible-xs"
                />

                <h2>Write queries effectively</h2>

                <p className="highlight-p">
                  Enjoy the power and comfort of a SQL client with the
                  collaborative advantages of a cloud based service.
                </p>

                <ul className="highlight-ul">
                  <li>Powerful online SQL editor</li>
                  <li>Browse schema and click-to-insert</li>
                  <li>Create snippets and reuse them</li>
                </ul>
              </div>
              <div className="col-sm-6 hidden-xs">
                <img
                  src="/assets/images/elements/write-queries.png"
                  id="write-query-illustrated"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="section section__feature section__feature--visualize">
          <div className="container">
            <div className="row">
              <div className="col-sm-6">
                <img
                  src="/assets/images/elements/visualize-data.png"
                  id="visualize-illustrated"
                />
              </div>
              <div className="col-sm-6">
                <h2>Visualize your data on dashboards</h2>

                <p className="highlight-p">
                  Always see the big, easy to digest picture for deeper
                  understanding and better decision making.
                </p>

                <ul className="highlight-ul">
                  <li>Drag & Drop and resize any visualization</li>
                  <li>Schedule refresh from your data sources</li>
                  <li>Share dashboards with your team or with the public</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="section section__more-features">
          <div className="container">
            <div className="row">
              <div className="col-lg-8 col-lg-offset-2 col-xs-12 p-0 flex-content-center flex">
                <div className="feature-container">
                  <img
                    src="/assets/images/elements/icon-api.png"
                    width="64px"
                  />
                  <h4>API</h4>
                </div>

                <div className="feature-container">
                  <img
                    src="/assets/images/elements/icon-alerts.png"
                    width="64px"
                  />
                  <h4>Alerts</h4>
                </div>

                <div className="feature-container">
                  <img
                    src="/assets/images/elements/icon-user-management.png"
                    width="64px"
                  />
                  <h4>User Management</h4>
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-lg-12 text-center">
                <br />
                <Link
                  data-track
                  data-track-location="features"
                  track-event="Clicked All Redash Features"
                  to="/product"
                  className="btn btn-secondary"
                >
                  All Redash Features
                </Link>
              </div>
            </div>
          </div>
        </section>

        <SectionIntegrations />

        <section className="section section__open-source">
          <div className="container">
            <div className="row">
              <div className="col-lg-4 col-lg-offset-2 col-sm-5 col-sm-offset-1">
                <img
                  src="/assets/images/elements/open-source.png"
                  id="open-source-illustrated"
                  className="visible-xs"
                />
                <h2>Redash is a popular Open Source project</h2>
                <p className="highlight-p">
                  Customize and add features, no lock-in, contribute back to the
                  community
                </p>
                <Link
                  data-track
                  data-track-location="open-source"
                  track-event="Clicked Community"
                  to="/community/"
                  className="btn btn-secondary"
                >
                  Our Community
                </Link>
              </div>

              <div className="col-lg-4 col-sm-5 text-right hidden-xs">
                <img
                  src="/assets/images/elements/open-source.png"
                  id="open-source-illustrated"
                />
              </div>
            </div>
          </div>
        </section>

        <SectionGetStarted />
      </Layout>
    )
  }
}

export default Homepage
