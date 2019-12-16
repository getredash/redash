import { extend, map, filter, reduce } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Button from "antd/lib/button";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import Icon from "antd/lib/icon";
import { EditInPlace } from "@/components/EditInPlace";
import { FavoritesControl } from "@/components/FavoritesControl";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import getTags from "@/services/getTags";

function getQueryTags() {
  return getTags("api/queries/tags").then(tags => map(tags, t => t.name));
}

function createMenu(menu) {
  const handlers = {};

  const groups = map(menu, group =>
    filter(
      map(group, (props, key) => {
        props = extend({ isAvailable: true, isEnabled: true, onClick: () => {} }, props);
        if (props.isAvailable) {
          handlers[key] = props.onClick;
          return (
            <Menu.Item key={key} disabled={!props.isEnabled}>
              {props.title}
            </Menu.Item>
          );
        }
        return null;
      })
    )
  );

  return (
    <Menu onClick={({ key }) => handlers[key]()}>
      {reduce(
        groups,
        (result, items, key) => {
          const divider = result.length > 0 ? <Menu.Divider key={`divider${key}`} /> : null;
          return [...result, divider, ...items];
        },
        []
      )}
    </Menu>
  );
}

export default function QueryPageHeader({ query, sourceMode }) {
  function saveName(name) {
    console.log("saveName", name);
  }

  function saveTags(tags) {
    console.log("saveTags", tags);
  }

  function togglePublished() {
    console.log("togglePublished");
  }

  const selectedTab = null; // TODO: replace with actual value
  const canViewSource = true; // TODO: replace with actual value
  const canForkQuery = () => true; // TODO: replace with actual value
  const showPermissionsControl = true; // TODO: replace with actual value

  const moreActionsMenu = [
    {
      fork: {
        isEnabled: !query.isNew() && canForkQuery(),
        title: (
          <React.Fragment>
            Fork
            <i className="fa fa-external-link m-l-5" />
          </React.Fragment>
        ),
        onClick: () => {
          console.log("duplicateQuery");
        },
      },
    },
    {
      archive: {
        isAvailable: !query.isNew() && query.can_edit && !query.is_archived,
        title: "Archive",
        onClick: () => {
          console.log("archiveQuery");
        },
      },
      managePermissions: {
        isAvailable: !query.isNew() && query.can_edit && !query.is_archived && showPermissionsControl,
        title: "Manage Permissions",
        onClick: () => {
          console.log("showManagePermissionsModal");
        },
      },
      unpublish: {
        isAvailable: !query.isNew() && query.can_edit && !query.is_draft,
        title: "Unpublish",
        onClick: () => {
          console.log("togglePublished");
        },
      },
    },
    {
      showAPIKey: {
        isAvailable: !query.isNew(),
        title: "Show API Key",
        onClick: () => {
          console.log("showApiKey");
        },
      },
    },
  ];

  return (
    <div className="p-b-10 page-header--new page-header--query">
      <div className="page-title">
        <div className="d-flex flex-nowrap align-items-center">
          {!query.isNew() && (
            <span className="m-r-5">
              <FavoritesControl item={query} />
            </span>
          )}
          <h3>
            <EditInPlace isEditable={query.can_edit} onDone={saveName} ignoreBlanks value={query.name} editor="input" />
            <span className={cx("m-l-10", "query-tags", { "query-tags__empty": query.tags.length === 0 })}>
              <QueryTagsControl
                tags={query.tags}
                isDraft={query.is_draft}
                isArchived={query.is_archived}
                canEdit={query.can_edit}
                getAvailableTags={getQueryTags}
                onEdit={saveTags}
              />
            </span>
          </h3>
          <span className="flex-fill" />
          {query.is_draft && !query.isNew() && query.can_edit && (
            <Button className="hidden-xs m-r-5" onClick={togglePublished}>
              <i className="fa fa-paper-plane m-r-5" /> Publish
            </Button>
          )}

          {!query.isNew() && canViewSource && (
            <span>
              {!sourceMode && (
                <Button className="m-r-5" href={query.getUrl(true, selectedTab)}>
                  <i className="fa fa-pencil-square-o m-r-5" aria-hidden="true" /> Edit Source
                </Button>
              )}
              {sourceMode && (
                <Button className="m-r-5" href={query.getUrl(false, selectedTab)} data-test="QueryPageShowDataOnly">
                  <i className="fa fa-table m-r-5" aria-hidden="true" /> Show Data Only
                </Button>
              )}
            </span>
          )}

          {!query.isNew() && (
            <Dropdown overlay={createMenu(moreActionsMenu)} trigger={["click"]}>
              <Button>
                <Icon type="ellipsis" rotate={90} />
              </Button>
            </Dropdown>
          )}
        </div>
        <span className={cx("query-tags__mobile", { "query-tags__empty": query.tags.length === 0 })}>
          <QueryTagsControl
            tags={query.tags}
            isDraft={query.is_draft}
            isArchived={query.is_archived}
            canEdit={query.can_edit}
            getAvailableTags={getQueryTags}
            onEdit={saveTags}
          />
        </span>
      </div>
    </div>
  );
}

QueryPageHeader.propTypes = {
  query: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    isNew: PropTypes.func,
    can_edit: PropTypes.bool,
    is_draft: PropTypes.bool,
    is_archived: PropTypes.bool,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  sourceMode: PropTypes.bool,
};

QueryPageHeader.defaultProps = {
  sourceMode: false,
};
