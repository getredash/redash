import React from 'react'
import Link from 'components/Link'
import PropTypes from 'prop-types'

const ContributorCard = ({ name, photo, github, twitter }) => (
  <div className="contributor-card">
    <div style={{ backgroundImage: `url(${photo})` }} class="img" />
    <h3>{name}</h3>
    <p>
      {github && (
        <Link to={github} target="_blank">
          <i className="fa fa-github" />
        </Link>
      )}{' '}
      {twitter && (
        <Link to={twitter} target="_blank">
          <i className="fa fa-twitter" />
        </Link>
      )}
    </p>
  </div>
)

ContributorCard.propTypes = {
  name: PropTypes.string.isRequired,
  photo: PropTypes.string.isRequired,
  github: PropTypes.string,
  twitter: PropTypes.string,
}

export default ContributorCard
