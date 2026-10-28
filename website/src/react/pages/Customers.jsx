import React from 'react'
import Layout from 'components/Layout'
import Link from 'components/Link'
import CustomerCard from 'components/CustomerCard'
import SectionGetStarted from 'components/SectionGetStarted'

const CustomersPage = ({
  data: {
    allCustomersYaml: { edges },
  },
  location,
}) => {
  const leftColumnCards = edges.filter((edge, index) => index % 3 === 2)
  const middleColumnCards = edges.filter((edge, index) => index % 3 === 0)
  const rightColumnCards = edges.filter((edge, index) => index % 3 === 1)
  return (
    <Layout
      title="Redash customers"
      description="Empowering data-driven decision making in thousands of teams across the globe. From small teams to huge organizations, Redash helps tens of thousands of users to query and visualize data in a new and meaningful way."
      location={location}
    >
      <section className="section section--pt-lg">
        <div className="container">
          <div className="row">
            <div className="col-md-8 col-md-offset-2 text-center">
              <h1 className="mb-lg">
                Empowering data-driven decision making in thousands of teams
                across the globe
              </h1>
              <p>
                From small teams to huge organizations, Redash helps tens of
                thousands of users to{' '}
                <strong>
                  query databases and visualise data in a new and meaningful
                  way.
                </strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <img
            src="/assets/images/elements/users-list-strip.png"
            width="100%"
            className="customer-logoshow"
          />
        </div>
      </section>

      <section className="section customer-quotes">
        <div className="container-fluid">
          <div className="row">
            <div className="col-sm-4">
              {leftColumnCards.map(({ node }) => {
                return (
                  <CustomerCard
                    customer={node.customer}
                    url={node.url}
                    logo={node.logo}
                    person={node.person}
                    role={node.role}
                    profile_img={node.profile_img}
                    quote={node.quote}
                    key={node.customer}
                  />
                )
              })}
            </div>

            <div className="col-sm-4 customer-quotes__middle">
              {middleColumnCards.map(({ node }) => {
                return (
                  <CustomerCard
                    customer={node.customer}
                    url={node.url}
                    logo={node.logo}
                    person={node.person}
                    role={node.role}
                    profile_img={node.profile_img}
                    quote={node.quote}
                    key={node.customer}
                  />
                )
              })}
            </div>

            <div className="col-sm-4">
              {rightColumnCards.map(({ node }) => {
                return (
                  <CustomerCard
                    customer={node.customer}
                    url={node.url}
                    logo={node.logo}
                    person={node.person}
                    role={node.role}
                    profile_img={node.profile_img}
                    quote={node.quote}
                    key={node.customer}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="section section__customers--alooma">
        <div className="container">
          <div className="row">
            <h2 className="text-center">Read our case studies</h2>
            <div className="col-md-8 col-md-offset-2">
              <div className="featured-customer">
                <div className="featured-customer--content">
                  <img
                    src="/assets/images/customers/studio71.png"
                    alt="Studio71 logo"
                    className="customer-logo"
                    width="96"
                  />

                  <h2>Studio71</h2>

                  <p>
                    Studio71 uses Redash to build a data driven culture, save
                    time and support sales and talent management
                  </p>

                  <Link
                    data-track
                    to="/case-studies/studio71"
                    className="btn btn-secondary"
                  >
                    Read Case Study →
                  </Link>
                </div>
              </div>

              <div className="featured-customer">
                <div className="featured-customer--content">
                  <img
                    src="/assets/images/customers/bubbleiq.png"
                    alt="BubbleIQ logo"
                    className="customer-logo"
                    width="96"
                  />

                  <h2>BubbleIQ</h2>

                  <p>
                    BubbleIQ uses Redash to support sales, save engineering time
                    and report towards investors
                  </p>

                  <Link
                    data-track
                    to="/case-studies/bubbleiq"
                    className="btn btn-secondary"
                  >
                    Read Case Study →
                  </Link>
                </div>
              </div>

              <div className="featured-customer">
                <img
                  src="/assets/images/elements/redash-charts.jpg"
                  width="100%"
                />

                <div className="featured-customer--content">
                  <h2>
                    How Redash is helping Alooma sustain a data driven culture
                  </h2>
                  <p>
                    by{' '}
                    <img
                      src="/assets/images/customers/dan-ya-shwartz.jpg"
                      width="32px"
                      className="profile-image"
                    />{' '}
                    <Link to="https://twitter.com/danjas" target="_blank">
                      Dan-ya Shwartz
                    </Link>
                  </p>

                  <p>
                    <em>
                      "Alooma and Redash share the same mission: to liberate
                      data and unleash its full potential. Knowing that
                      analytics and Business Intelligence (BI) were going to be
                      paramount for running a data company, we wanted something
                      that gave us full transparency down to the schemas without
                      any abstraction layers. We needed to write our own SQL and
                      collaborate over queries and dashboards in a simple
                      way..."
                    </em>
                  </p>

                  <Link
                    data-track
                    to="https://blog.redash.io/alooma-redash-for-pros-dashboads-etl-307dc189d3a5"
                    className="btn btn-secondary"
                  >
                    Continue Reading on Medium →
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12 text-center">
              <Link data-track to="/case-studies" className="btn btn-primary">
                All Redash Case Studies →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SectionGetStarted />
    </Layout>
  )
}


export default CustomersPage
