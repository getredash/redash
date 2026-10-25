import React from 'react'
import Layout from 'components/Layout'
import Link from 'components/Link'
import SectionGetStarted from 'components/SectionGetStarted'

const StasherPage = ({ location }) => (
  <Layout
    title="Stasher Redash Case Study"
    description="Stasher uses Redash to build a more data driven culture"
    location={location}
  >
    <section className="section">
      <div className="container">
        <div className="row">
          <div className="col-md-8 col-md-offset-2 text-center">
            <img
              src="/assets/images/customers/stasher.jpg"
              alt="Stasher logo"
              className="customer-logo"
              width="196"
            />
            <br />
            <h1>
              Stasher uses Redash to track KPIs and collaborate with partners
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
                  <td>
                    <Link to="https://stasher.com" target="_blank">
                      Stasher
                    </Link>
                  </td>
                  <td>
                    <img
                      src="/assets/images/customers/jacob-wedderburn.jpg"
                      width="38px"
                      className="profile-image"
                    />
                    <Link
                      to="https://www.linkedin.com/in/jacob-wedderburn-day-499258111/"
                      target="_blank"
                    >
                      Jacob Wedderburn
                    </Link>
                    ,<br />
                    CEO
                  </td>
                  <td>10+</td>
                  <td>2017</td>
                  <td>
                    <img
                      src="/assets/images/integrations/postgresql.png"
                      alt="Postgres Logo"
                      width="32"
                    />
                    <Link to="/data-sources/postgresql">Postgres</Link>
                  </td>
                  <td>Travel</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="row">
          <div className="col-md-8 col-md-push-2">
            <h2>About Stasher</h2>
            <p>
              <Link to="https://stasher.com" target="_blank">
                Stasher
              </Link>
              , the world's first luggage storage network, connects you with
              hotels and stores that can keep your luggage safe while you enjoy
              your time in a city. They work with large partners like Accor
              Hotels and Premier Inn in cities worldwide. No need for cash -
              with Stasher, you can book on-demand and leave your luggage in
              secure storage rooms.
            </p>
            <blockquote>
              I'm Jacob, the CEO of Stasher. We founded Stasher to become the
              world's largest home storage network. Before we came along, people
              didn't really have any convenient solutions in different cities
              for storing luggage. Especially for just dropping stuff off short
              term, but also for however long, no one really catered to that
              need, certainly nothing on demand. The sharing economy seemed like
              the perfect solution to that problem.
            </blockquote>
            <h2>The challenge</h2>
            <p>
              Stasher have data in Google Analytics, Stripe and their own
              database. Google Analytics and Stripe have their dashboards, but
              they still needed a solution that provided a more custom and
              complete view of their data. Their need to track performance
              caused the main pain point: supply capacity across their network,
              geographical coverage, performance by city, etc. They stored this
              performance data in their database.
            </p>
            <blockquote>
              You can see some data in Analytics and you could see some in the
              Stripe dashboard. I wanted a more custom solution where we could
              do more specific queries around information in our database. You
              can obviously do a lot more with SQL analysis! So I wanted a
              solution that could translate it into a dashboard I could share
              with my team.
            </blockquote>
            <h2>The solution</h2>
            <p>After extensive research, Jacob decided to give Redash a try.</p>
            <blockquote>
              I looked at lots of other dashboard software companies and found
              them ridiculously expensive for what they offered. I think they
              promise more visual graphics, but it just didn't merit hundreds if
              not thousands of pounds a month. It just seemed insane. You guys
              have a really nice simple solution. Just such a simple tool,
              Redash connects to our database. I like it more than anything else
              I've found.
            </blockquote>
            <h2>The outcome</h2>
            <h4>Tracking business-critical KPIs with Redash</h4>
            <p>
              Stasher uses Redash to track critical metrics like occupancy rate
              and monthly performance.
            </p>
            <blockquote>
              We do revenue tracking with it as well with a pretty simple query
              which tracks how much we've made. And we do that against targets;
              we built a really nice graph! We track stored bag numbers, broken
              down across different regions and our capacity in them. We have a
              supplier table that logs everything on our network. We track
              growth in those categories as well. Our investors and we as a
              business care about the headline KPIs the most.
            </blockquote>
            <h4>Redash helps Stasher work with partners</h4>
            <p>
              Stasher works with multiple partners and at times they need to
              share performance information with these partners. Using Redash,
              they can create shareable dashboards for them. They can also
              tailor each one to the specific partner’s needs without having to
              invest engineering resources to develop custom solutions.
            </p>
            <blockquote>
              One of our other partners asked for a breakdown of where our
              customers come from. I could just get it in Redash which proved
              quite useful so. We made a dashboard for one of our major
              partners, the Premier Inn hotel chain. That just has the graph of
              their monthly performance and a breakdown of bookings, etc. which
              we share with them.
            </blockquote>
          </div>
        </div>
      </div>
    </section>

    <SectionGetStarted />
  </Layout>
)

export default StasherPage
