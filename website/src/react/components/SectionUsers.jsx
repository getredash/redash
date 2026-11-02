import React from 'react'
import Link from 'components/Link'

const SectionUsers = () => (
  <section className="section section--users bg-mutted-soft" id="anchor">
    <div className="container">
      <div className="row">
        <div className="col-sm-7">
          <img
            src="/assets/images/elements/users-list.png"
            id="customers-illustrated"
            className="hidden-xs"
          />
          <img
            src="/assets/images/elements/users-list-center.png"
            id="customers-illustrated"
            className="visible-xs"
          />
        </div>
        <div className="col-sm-5">
          <h3 className="serif em">
            “Redash is as essential as email to my company. We love data but
            accessing the data is a pain without Redash. Any company I go to, I
            get them hooked on Redash. It’s an easy sell :)”
          </h3>
          <p>
            <img
              src="/assets/images/customers/ben-dehghan.jpg"
              width="48px"
              className="profile-image"
            />{' '}
            by Ben Dehghan, Co-Founder of{' '}
            <Link to="https://data-miner.io/">Data Miner</Link>
          </p>
          <Link
            data-track
            data-track-location="customers"
            track-event="Clicked Customers"
            to="/customers/"
            className="btn btn-secondary"
          >
            Read what our users say →
          </Link>
        </div>
      </div>
    </div>
  </section>
)

export default SectionUsers
