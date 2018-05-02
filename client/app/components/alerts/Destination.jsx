import React from 'react';
import PropTypes from 'prop-types';

export default function Destination(props) {
  let icon;
  let name;
  if (props.destination.destination) {
    icon = props.destination.destination.icon;
    name = props.destination.destination.name;
  } else if (props.destination.user) {
    name = `${props.destination.user.name} (Email)`;
    icon = 'fa-envelope';
  } else {
    name = props.destination.name;
    icon = props.destination.icon;
  }
  return (
    <span>
      <i className={'fa ' + icon} />&nbsp;{name}
    </span>
  );
}

Destination.propTypes = {
  destination: PropTypes.shape({
    destination: PropTypes.shape({
      icon: PropTypes.string,
      name: PropTypes.string,
    }),
    user: PropTypes.shape({
      name: PropTypes.string,
    }),
  }).isRequired,
};
