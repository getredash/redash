import { extend } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'antd/lib/tooltip';
import TagsControl from '@/components/tags-control/TagsControl';

export default class ModelTagsControl extends TagsControl {
  static propTypes = extend({}, TagsControl.propTypes, {
    isDraft: PropTypes.bool,
    isArchived: PropTypes.bool,
  });

  static defaultProps = extend({}, TagsControl.defaultProps, {
    isDraft: false,
    isArchived: false,
  });

  static archivedTooltip = '';

  renderPrependTags() {
    const { isDraft, isArchived } = this.props;
    const result = [];

    if (isDraft && !isArchived) {
      result.push((
        <span className="label label-tag-unpublished" key="query-tag-unpublished">Unpublished</span>
      ));
    }

    if (isArchived) {
      result.push((
        <Tooltip
          key="query-tag-archived"
          placement="right"
          title={this.constructor.archivedTooltip}
        >
          <span className="label label-tag-archived">Archived</span>
        </Tooltip>
      ));
    }

    return result;
  }
}
