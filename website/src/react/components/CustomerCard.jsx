import React from 'react'
import Link from 'components/Link'
import PropTypes from 'prop-types'

const CustomerCard = ({
  customer,
  url,
  logo,
  person,
  role,
  profile_img,
  quote,
}) => (
  <div className="card card--customer">
    <img src={logo} alt={`${customer} <3 Redash`} className="customer-logo" />
    <h4 className="serif">
      <em>{quote}</em>
    </h4>
    <p>
      <img src={profile_img} width="48px" className="profile-image" /> by{' '}
      <strong>{person}</strong>, {role} at{' '}
      <Link to={url} target="_blank">
        {customer}
      </Link>
    </p>
  </div>
)

CustomerCard.propTypes = {
  customer: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  logo: PropTypes.string.isRequired,
  person: PropTypes.string.isRequired,
  role: PropTypes.string.isRequired,
  profile_img: PropTypes.string.isRequired,
  quote: PropTypes.string.isRequired,
}

export default CustomerCard
