import { map, trim, isObject, isFunction } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

// eslint-disable-next-line import/prefer-default-export
export class TagsControl extends React.Component {
  static propTypes = {
    tags: PropTypes.arrayOf(PropTypes.string),
    canEdit: PropTypes.bool,
    getAvailableTags: PropTypes.func,
    onEdit: PropTypes.func,
  };

  static defaultProps = {
    tags: [],
    canEdit: false,
    getAvailableTags: () => {},
    onEdit: () => {},
  };

  openEditTagsModal(tags, availableTags = []) {
    const { $uibModal } = this.props; // eslint-disable-line react/prop-types

    $uibModal
      .open({
        component: 'tagsEditorModal',
        resolve: {
          tags: () => tags,
          availableTags: () => availableTags,
        },
      }).result.then((newTags) => {
        const { onEdit } = this.props;
        if (isFunction(onEdit)) {
          onEdit(newTags);
        }
      });
  }

  editTags() {
    const { getAvailableTags } = this.props;
    const tags = map(this.props.tags, trim);

    if (isFunction(getAvailableTags)) {
      const availableTags = getAvailableTags();
      if (isObject(availableTags) && isFunction(availableTags.then) && isFunction(availableTags.catch)) {
        availableTags
          .then((loadedTags) => {
            this.openEditTagsModal(tags, loadedTags);
          })
          .catch(() => {
            this.openEditTagsModal(tags);
          });
      } else {
        this.openEditTagsModal(tags, availableTags);
      }
    } else {
      this.openEditTagsModal(tags);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  renderPrependTags() {
    return null;
  }

  renderTags() {
    return map(this.props.tags, tag => (
      <span className="label label-tag" key={tag} title={tag}>{tag}</span>
    ));
  }

  // eslint-disable-next-line class-methods-use-this
  renderAppendTags() {
    return null;
  }

  renderEditButton() {
    if (this.props.canEdit) {
      return (this.props.tags.length > 0) ? (
        <a className="label label-tag" role="none" onClick={() => this.editTags()}>
          <i className="zmdi zmdi-edit" />
        </a>
      ) : (
        <a className="label label-tag" role="none" onClick={() => this.editTags()}>
          <i className="zmdi zmdi-plus" />
          Add tag
        </a>
      );
    }
    return null;
  }

  render() {
    return (
      <div className="tags-control">
        {this.renderPrependTags()}
        {this.renderTags()}
        {this.renderAppendTags()}
        {this.renderEditButton()}
      </div>
    );
  }
}
