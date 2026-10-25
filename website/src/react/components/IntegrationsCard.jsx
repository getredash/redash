import React from 'react'
import Link from 'components/Link'
import PropTypes from 'prop-types'

const IntegrationsCard = ({ name, logo, path }) => {
  const cardContent = (
    <div className="card__item-content">
      <div className="card__item-brand">
        <img src={logo} className="card__item-brand_img" alt={name} />
      </div>
      <p className="card__item-title">{name}</p>
    </div>
  )

  if (path) {
    return (
      <Link to={path} className="card__item">
        {cardContent}
      </Link>
    )
  } else {
    return <div className="card__item">{cardContent}</div>
  }
}

IntegrationsCard.propTypes = {
  name: PropTypes.string.isRequired,
  logo: PropTypes.string.isRequired,
  path: PropTypes.string,
}

export default IntegrationsCard
