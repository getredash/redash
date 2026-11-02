import React from 'react'
import Layout from 'components/Layout'
import Link from 'components/Link'
import SectionGetStarted from 'components/SectionGetStarted'

const BubbleIQPage = ({ location }) => (
  <Layout
    title="BubbleIQ Redash Case Study"
    description="BubbleIQ uses Redash to support sales, save engineering time and report towards investors"
    location={location}
  >
    <section className="section">
      <div className="container">
        <div className="row">
          <div className="col-md-8 col-md-offset-2 text-center">
            <img
              src="/assets/images/customers/bubbleiq.png"
              alt="BubbleIQ logo"
              className="customer-logo"
              width="128"
            />
            <h1>
              BubbleIQ uses Redash to support sales, save engineering time and
              report towards investors
            </h1>
          </div>
        </div>
      </div>
    </section>

    <section className="section section-case-study">
      <div className="container">
        <div className="row m-b-50">
          <div className="col-md-12">
            <table
              style={{ width: '100%' }}
              className="table-default table-bordered"
            >
              <tbody>
                <tr>
                  <th>Company</th>
                  <th>Name</th>
                  <th>No. of Employees</th>
                  <th>Using Redash Since</th>
                  <th>Data Sources</th>
                  <th>Industry</th>
                </tr>
                <tr>
                  <td>BubbleIQ</td>
                  <td>
                    <img
                      src="/assets/images/customers/fletcher-richman.jpg"
                      width="38px"
                      className="profile-image"
                    />
                    <Link
                      to="https://www.linkedin.com/in/fletchrichman/"
                      target="_blank"
                    >
                      Fletcher Richman
                    </Link>
                    ,<br />
                    Co-founder & CEO
                  </td>
                  <td>6</td>
                  <td>2017</td>
                  <td>
                    <img
                      src="/assets/images/integrations/mongodb.png"
                      alt="MongoDB Logo"
                      width="32"
                    />
                    <Link to="/data-sources/mongodb">MongodDB</Link>
                  </td>
                  <td>Customer Support</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="row">
          <div className="col-md-8 col-md-push-2">
            <h2>About BubbleIQ</h2>
            <p>
              BubbleIQ helps companies streamline their support workflow by
              connecting helpdesk systems (Zendesk, Salesforce) to real-time
              chat tools (Slack, Drift). This allows companies to provide better
              support and a high-touch relationship with their customers.
            </p>
            <p>
              Fletcher Richman serves as the CEO of BubbleIQ, which three
              technical co-founders started up and has since grown to a team of
              six.
            </p>
            <h2>The challenge: Why BubbleIQ started with Redash</h2>
            <p>
              Fletcher got to know Redash in his previous role as a data
              analyst. When the need emerged at BubbleIQ to do something with
              their data, he chose Redash.
            </p>
            <p>
              Their product is simple in terms of what they're measuring and the
              things that are important. The only time that something stores in
              the database is when they pass a ticket from Zendesk into Slack or
              vice-a-versa. It's real strong usage of the product when that's
              happening. They call that a Bubble and then, within the Bubble,
              there's the messages that go back and forth as well. Those are the
              two core KPI's.
            </p>
            <blockquote>
              We just got to that point where there's a bunch of stuff happening
              that we needed to measure and I personally like to have things
              measured. To make good decisions, I need to have graphs and I need
              to know what's going on.
            </blockquote>
            <h2>The solution</h2>
            <p>
              They setup Redash and had a few dashboards and graphs that became
              pretty core to their business.
            </p>
            <p>
              Redash is being used across their entire organization including
              employees, customers, stakeholders and even investors. They are
              looking at various different dashboards and using Redash on a
              daily basis to track and visualize the most crucial KPIs for the
              business.
            </p>
            <blockquote>
              We've 10x the number of Bubbles that we sync per week, since the
              beginning of the year. And it's just cool to see that number every
              week. And you can tell: “Oh cool, our usage is going up every
              single week. We're breaking records, every week and that's
              something the team can rally around.”
            </blockquote>
            <h2>The outcome</h2>
            <h4>Using Redash to save engineering time</h4>
            <p>
              BubbleIQ got a feature request from their users: get a
              notification when a synced Bubble meets some conditions. They
              could take two weeks of engineering time and build a notification
              feature, but for a young startup investing two weeks of
              engineering time for a feature request is a significant
              investment.
            </p>
            <blockquote>
              We could build a whole feature, right? Like take two weeks of
              engineering time and build a notification feature, but I've been
              able to satisfy a lot of those customers’ requests just with
              custom Redash dashboards.
            </blockquote>
            <p>
              Instead, they built out the feature based on a few Redash queries
              (each query for each type of condition) and the Zapier integration
              to deliver these notifications. The whole “feature” was done in
              less in a day.
            </p>
            <p>
              Being able to implement it using Redash and Zapier not only saved
              them considerable engineering resources (and made their customers
              happy), but also allows them to better understand the feature and
              requirements before implementing it.
            </p>
            <h4>Using Redash to support Sales</h4>
            <p>
              One of Fletcher’s favorite queries is that he wants to see Bubbles
              over time for a specific company which he can use it during sales.
            </p>
            <blockquote>
              Like, this person signed up, they're a week into their free trial,
              I want to know how much they are using the product.
            </blockquote>
            <p>
              Because he is going to send a very different email if they’ve
              created one Bubble or if they’ve created 100.
            </p>
            <blockquote>
              If they've already synced like 100 tickets, I'm going to say,
              "Hey, are you ready to sign up for your paid subscription?" If
              they've only had one, then I'd be like, "Hey, can I help you get
              things set up?"
            </blockquote>
            <p>
              Eventually, BubbleIQ will automate this, but it’s great to see how
              useful Redash can prove in a fast-moving startup environment.
            </p>
            <h4>Using Redash for reporting towards Techstars</h4>
            <p>
              Part of what helped BubbleIQ get into Techstars, is they had all
              of these great metrics that they could share with them. They were
              sharing every two-week update and they were sending them to the
              program managers at Techstars and they were seeing the same
              metrics and dashboards.
            </p>
            <blockquote>
              We also used it during Techstars to report on our weekly goals and
              metrics. We had a weekly operations review that was two minutes,
              and we would include a series of Redash graphs to report on growth
              of our core KPIs. Wow, the usage every week is going up and up and
              up and up, and we could share those visuals. We constantly got
              compliments from the Techstars team about being so data-driven and
              focused.
            </blockquote>
          </div>
        </div>
      </div>
    </section>

    <SectionGetStarted />
  </Layout>
)

export default BubbleIQPage
