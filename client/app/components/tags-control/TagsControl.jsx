import { isObject, map, filter, trim, extend } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Tooltip from 'antd/lib/tooltip';
import TagsEditorModal from './TagsEditorModal';

export class TagsControl extends React.Component {
  static propTypes = {
    tags: PropTypes.arrayOf(PropTypes.string),
    canEdit: PropTypes.bool,
    getAvailableTags: PropTypes.func,
    onEdit: PropTypes.func,
    className: PropTypes.string,
    children: PropTypes.node,
  };

  static defaultProps = {
    tags: [],
    canEdit: false,
    getAvailableTags: () => Promise.resolve([]),
    onEdit: () => {},
    className: '',
    children: null,
  };

  static Prepend({ children }) {
    return <React.Fragment>{children}</React.Fragment>;
  }

  static Append({ children }) {
    return <React.Fragment>{children}</React.Fragment>;
  }

  state = {
    showModal: false,
    availableTags: [],
  };

  openEditModal = () => {
    // load available tags every time modal is shown; show modal only when tags loaded
    this.props.getAvailableTags()
      .then(availableTags => this.setState({ showModal: true, availableTags }));
  };

  closeEditModal = () => {
    this.setState({ showModal: false });
  };

  onTagsChanged = (newTags) => {
    this.props.onEdit(newTags);
    this.closeEditModal();
  };

  renderEditButton() {
    const tags = map(this.props.tags, trim);
    const buttonLabel = tags.length > 0
      ? <i className="zmdi zmdi-edit" />
      : <React.Fragment><i className="zmdi zmdi-plus m-r-5" />Add tag</React.Fragment>;

    return (
      <React.Fragment>
        <a className="label label-tag" role="none" onClick={this.openEditModal}>{buttonLabel}</a>
        {this.state.showModal && (
          <TagsEditorModal
            tags={tags}
            availableTags={this.state.availableTags}
            onConfirm={this.onTagsChanged}
            onCancel={this.closeEditModal}
          />
        )}
      </React.Fragment>
    );
  }

  render() {
    const children = filter(React.Children.toArray(this.props.children), isObject);
    return (
      <div className={'tags-control ' + this.props.className}>
        {filter(children, child => child.type === this.constructor.Prepend)}
        {map(this.props.tags, tag => (
          <span className="label label-tag" key={tag} title={tag}>{tag}</span>
        ))}
        {filter(children, child => child.type === this.constructor.Append)}
        {this.props.canEdit && this.renderEditButton()}
      </div>
    );
  }
}

function modelTagsControl({ archivedTooltip }) {
  // See comment for `propTypes`/`defaultProps`
  // eslint-disable-next-line react/prop-types
  function ModelTagsControl({ isDraft, isArchived, ...props }) {
    return (
      <TagsControl {...props}>
        <TagsControl.Prepend>
          {!isArchived && isDraft && (
            <span className="label label-tag-unpublished">Unpublished</span>
          )}
          {isArchived && (
            <Tooltip placement="right" title={archivedTooltip}>
              <span className="label label-tag-archived">Archived</span>
            </Tooltip>
          )}
        </TagsControl.Prepend>
      </TagsControl>
    );
  }

  // `extend` needed just for `react2angular`, so remove it when `react2angular` no longer needed
  ModelTagsControl.propTypes = extend({
    isDraft: PropTypes.bool,
    isArchived: PropTypes.bool,
  }, TagsControl.propTypes);

  ModelTagsControl.defaultProps = extend({
    isDraft: false,
    isArchived: false,
  }, TagsControl.defaultProps);

  return ModelTagsControl;
}

export const QueryTagsControl = modelTagsControl({
  archivedTooltip: 'This query is archived and can\'t be used in dashboards, and won\'t appear in search results.',
});

export const DashboardTagsControl = modelTagsControl({
  archivedTooltip: 'This dashboard is archived and and won\'t appear in the dashboards list or search results.',
});

export default function init(ngModule) {
  ngModule.component('queryTagsControl', react2angular(QueryTagsControl));
  ngModule.component('dashboardTagsControl', react2angular(DashboardTagsControl));
}

init.init = true;
