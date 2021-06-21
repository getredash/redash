import { map, trim } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Tooltip from "@/components/Tooltip";
import EditTagsDialog from "./EditTagsDialog";
import PlainButton from "@/components/PlainButton";

export class TagsControl extends React.Component {
  static propTypes = {
    tags: PropTypes.arrayOf(PropTypes.string),
    canEdit: PropTypes.bool,
    getAvailableTags: PropTypes.func,
    onEdit: PropTypes.func,
    className: PropTypes.string,
    tagsExtra: PropTypes.node,
    tagSeparator: PropTypes.node,
    children: PropTypes.node,
  };

  static defaultProps = {
    tags: [],
    canEdit: false,
    getAvailableTags: () => Promise.resolve([]),
    onEdit: () => {},
    className: "",
    tagsExtra: null,
    tagSeparator: null,
    children: null,
  };

  editTags = (tags, getAvailableTags) => {
    EditTagsDialog.showModal({ tags, getAvailableTags }).onClose(this.props.onEdit);
  };

  renderEditButton() {
    const tags = map(this.props.tags, trim);
    return (
      <PlainButton
        className="label label-tag hidden-xs"
        onClick={() => this.editTags(tags, this.props.getAvailableTags)}
        data-test="EditTagsButton">
        {tags.length === 0 && (
          <React.Fragment>
            <i className="zmdi zmdi-plus m-r-5" aria-hidden="true" />
            Add tag
          </React.Fragment>
        )}
        {tags.length > 0 && (
          <>
            <i className="zmdi zmdi-edit" aria-hidden="true" />
            <span className="sr-only">Edit</span>
          </>
        )}
      </PlainButton>
    );
  }

  render() {
    const { tags, tagSeparator } = this.props;
    return (
      <div className={"tags-control " + this.props.className} data-test="TagsControl">
        {this.props.children}
        {map(tags, (tag, i) => (
          <React.Fragment key={tag}>
            {tagSeparator && i > 0 && <span className="tag-separator">{tagSeparator}</span>}
            <span className="label label-tag" key={tag} title={tag} data-test="TagLabel">
              {tag}
            </span>
          </React.Fragment>
        ))}
        {this.props.canEdit && this.renderEditButton()}
        {this.props.tagsExtra}
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
        {!isArchived && isDraft && <span className="label label-tag-unpublished">Unpublished</span>}
        {isArchived && (
          <Tooltip placement="right" title={archivedTooltip}>
            <span className="label label-tag-archived">Archived</span>
          </Tooltip>
        )}
      </TagsControl>
    );
  }

  ModelTagsControl.propTypes = {
    isDraft: PropTypes.bool,
    isArchived: PropTypes.bool,
  };

  ModelTagsControl.defaultProps = {
    isDraft: false,
    isArchived: false,
  };

  return ModelTagsControl;
}

export const QueryTagsControl = modelTagsControl({
  archivedTooltip: "This query is archived and can't be used in dashboards, or appear in search results.",
});

export const DashboardTagsControl = modelTagsControl({
  archivedTooltip: "This dashboard is archived and won't be listed in dashboards nor search results.",
});
