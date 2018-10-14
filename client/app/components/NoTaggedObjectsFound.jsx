import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { BigMessage } from './BigMessage';

function NoTaggedObjectsFound({ objectType, tags }) {
  return (
    <BigMessage icon="fa-tags">
      No {objectType} found tagged with
      {Array.from(tags).map(tag => (
        <span className="label label-tag" key={tag.name}>
          {tag.name}
        </span>
      ))}.
    </BigMessage>
  );
}

NoTaggedObjectsFound.propTypes = {
  objectType: PropTypes.string.isRequired,
  tags: PropTypes.objectOf(Set).isRequired,
};

export default function init(ngModule) {
  ngModule.component('noTaggedObjectsFound', react2angular(NoTaggedObjectsFound));
}
