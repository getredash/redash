import { map, trim } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

export default class TagsControl extends React.Component {
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

  editTags() {
    const { getAvailableTags, onEdit, $uibModal } = this.props; // eslint-disable-line react/prop-types
    const tags = map(this.props.tags, trim);

    getAvailableTags().then((availableTags) => {
      $uibModal
        .open({
          component: 'tagsEditorModal',
          resolve: {
            tags: () => tags,
            availableTags: () => availableTags,
          },
        }).result.then((newTags) => {
          onEdit(newTags);
        });
    });
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
