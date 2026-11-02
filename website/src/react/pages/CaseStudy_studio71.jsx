import React from 'react'
import Layout from 'components/Layout'
import Link from 'components/Link'
import SectionGetStarted from 'components/SectionGetStarted'

const Studio71Page = ({ location }) => (
  <Layout
    title="Studio71 Redash Case Study"
    description="Studio71 uses Redash to build a more data driven culture"
    location={location}
  >
    <section className="section">
      <div className="container">
        <div className="row">
          <div className="col-md-8 col-md-offset-2 text-center">
            <img
              src="/assets/images/customers/studio71-vert.jpg"
              alt="Studio71 logo"
              className="customer-logo"
              width="256"
            />
            <br />
            <h1>Studio71 uses Redash to build a data driven culture</h1>
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
                  <td>
                    <Link to="https://studio71.com/us/" target="_blank">
                      Studio71
                    </Link>
                  </td>
                  <td>
                    <img
                      src="/assets/images/customers/mike-flynn.jpg"
                      width="38px"
                      className="profile-image"
                    />
                    <Link
                      to="https://www.linkedin.com/in/flynn/"
                      target="_blank"
                    >
                      Mike Flynn
                    </Link>
                    ,
                    <br />
                    CTO
                  </td>
                  <td>300+</td>
                  <td>2016</td>
                  <td>
                    <img
                      src="/assets/images/integrations/mysql.png"
                      alt="MySQL Logo"
                      width="32"
                    />
                    <Link to="/data-sources/mysql">MySQL</Link>
                    <br />
                    <img
                      src="/assets/images/integrations/dynamodb_sql.png"
                      alt="DynamoDB Logo"
                      width="32"
                    />
                    <Link to="/data-sources/amazon-dynamodb">DynamoDB</Link>
                    <br />
                    <img
                      src="/assets/images/integrations/google-analytics.png"
                      alt="Google Analytics Logo"
                      width="32"
                    />
                    <Link to="/data-sources/google-analytics">
                      Google Analytics
                    </Link>
                    <br />
                    <img
                      src="/assets/images/integrations/elasticsearch.png"
                      alt="Elasticsearch Logo"
                      width="32"
                    />
                    <Link to="/data-sources/elasticsearch">Elasticsearch</Link>
                  </td>
                  <td>Media</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="row">
          <div className="col-md-8 col-md-push-2">
            <h2>About Studio71</h2>
            <p>
              A media company and content studio, Studio71 works with artists,
              actors and YouTubers (like Dwayne “The Rock” Johnson, Rhett and
              Link, etc) to develop, produce and distribute content on various
              channels. Studio71 is a Red Arrow Studios Company headquartered in
              Los Angeles with offices in Berlin, New York, Toronto, London,
              Paris and Milan.
            </p>
            <p>
              For six years, Mike has worked as CTO at Studio71 where they’ve
              been using Redash since 2016. We’ve asked Mike to share his story
              about how he has transformed Studio71 into a more data-driven
              company.
            </p>
            <h2>The challenge</h2>
            <p>
              Tracking, managing and querying various data sources from
              different databases makes for a challenging and time-consuming
              task. Before using Redash, the tech team spent a lot of resources
              getting their data in hand, visualizing and creating custom
              interfaces for reporting. It took several days of development time
              to create those reports and things didn’t move as quickly as they
              wanted.
            </p>
            <blockquote>
              A critical function of the Studio71 Tech team is to track content
              metrics across all of the different social and distribution
              platforms. Every system is different and staying on top of it is a
              big important job that is only getting bigger and more important
              every day.
            </blockquote>
            <h2>The solution</h2>
            <p>
              Mike wanted a solution that allowed the company to work closer
              with their data. This led them to using Redash.
            </p>
            <blockquote>
              I think the number one thing that drew my eye was the flexibility.
              We had data coming in from Google Analytics, Elasticsearch. We
              still have multiple SQL databases. We've got some NoSQL databases
              banging around. So we've got a lot of different data sources.
            </blockquote>
            <blockquote>
              When I came across Redash, I found that list of supported data
              sources and supports and it covered a lot of ground for us. So
              that was obviously a huge positive development when I saw that.
            </blockquote>
            <p>
              Mike receives a lot of questions from other executives, board
              members and their parent company. “How much does this cost?” and
              “What data are we pulling and how frequently?” just marked the
              start of it. Redash proved to be the right place to get all their
              data together and respond to those questions swiftly:
            </p>
            <blockquote>
              I automated a lot of the backlog of requests within an hour or
              two, by simply sitting down at Redash, writing queries, and
              playing with visualizations.
            </blockquote>
            <h2>The outcome</h2>
            <h4>Using Redash to bring data closer</h4>
            <p>
              Redash has become a huge time saver for Studio71. They can write
              queries, visualize their data, and embed visualizations to
              reports. This saves the tech team a lot of time as they don't need
              to build custom solutions.
            </p>
            <blockquote>
              If the developers launch a new feature that spark questions from
              other teams, I can write a query and put it in a dashboard or
              report in the same meeting. I've got some great graphs up rotating
              on a screen in my office that I look at every day. That was a big
              change for us and improved monitoring of all these stat
              collections and video processing systems we have.
            </blockquote>
            <h4>Using Redash to save time and track more</h4>
            <p>
              It used to entail a complicated process which required them to
              make a dev ticket and have it work through the process. Now very
              simply, they just write a single query and and share the link to
              the visualization.
            </p>
            <blockquote>
              The time saving aspect is a huge win. We have a lot lot of data
              sources and a lot of different teams in our company that all have
              very different requirements for data.
            </blockquote>
            <p>
              Making sure we track even the most trivial thing and monitor it
              with a query in Redash became a standard that helps the business
              in various ways.
            </p>
            <blockquote>
              Even if it's a new webpage, that's less about database entries. We
              can still add the Google Analytics into Redash and instead of
              giving everyone analytics access all the time, we could have them
              go to Redash and see the report. So that's been probably the
              second biggest thing, the completeness of our ability to track
              success metrics.
            </blockquote>
            <h4>Using Redash to support sales</h4>
            <p>Sales and the talent management teams consume the most data.</p>
            <blockquote>
              Everything comes back to sales and a lot of our data is either
              tracking those sales or finding new ways to market our talent and
              content.
            </blockquote>
            <p>
              Redash supports sales with critical business data, like which of
              their influencers would make sense for different brands.
            </p>
            <blockquote>
              Tracking and visualizing success metrics are essential and
              something we use Redash for all the time. Requests like "Can I see
              a report of our branded videos that have done better than we
              projected?” are very easy to create, which is great for my team,
              and it helps Sales get what they need ASAP.
            </blockquote>
          </div>
        </div>
      </div>
    </section>

    <SectionGetStarted />
  </Layout>
)

export default Studio71Page
