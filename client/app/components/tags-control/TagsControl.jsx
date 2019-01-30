import { map, trim } from 'lodash';
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import TagsEditorModal from './TagsEditorModal';

export default class TagsControl extends React.Component {
  static propTypes = {
    tags: PropTypes.arrayOf(PropTypes.string),
    canEdit: PropTypes.bool,
    getAvailableTags: PropTypes.func,
    onEdit: PropTypes.func,
    className: PropTypes.string,
  };

  static defaultProps = {
    tags: [],
    canEdit: false,
    getAvailableTags: () => Promise.resolve([]),
    onEdit: () => {},
    className: '',
  };

  constructor(props) {
    super(props);

    this.state = {
      showModal: false,
    };

    // get available tags
    this.props.getAvailableTags()
      .then((tags) => {
        this.availableTags = tags;
      });
  }

  onTagsChanged = (newTags) => {
    this.props.onEdit(newTags);
    this.closeEditModal();
  }

  openEditModal = () => {
    this.setState({ showModal: true });
  }

  closeEditModal = () => {
    this.setState({ showModal: false });
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
    if (!this.props.canEdit) {
      return null;
    }

    const tags = map(this.props.tags, trim);

    const buttonLabel = tags.length > 0
      ? <i className="zmdi zmdi-edit" />
      : <Fragment><i className="zmdi zmdi-plus" /> Add tag</Fragment>;

    return (
      <Fragment>
        <a className="label label-tag" role="none" onClick={this.openEditModal}>
          {buttonLabel}
        </a>
        {this.state.showModal
          ? <TagsEditorModal
            tags={tags}
            availableTags={this.availableTags}
            close={this.onTagsChanged}
            dismiss={this.closeEditModal}
          />
          : null
        }
      </Fragment>
    );
  }

  render() {
    return (
      <div className={'tags-control ' + this.props.className}>
        {this.renderPrependTags()}
        {this.renderTags()}
        {this.renderAppendTags()}
        {this.renderEditButton()}
      </div>
    );
  }
}
