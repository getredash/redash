import { extend, map, filter, reduce } from "lodash";
import React, { useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Button from "antd/lib/button";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import Icon from "antd/lib/icon";
import { EditInPlace } from "@/components/EditInPlace";
import { FavoritesControl } from "@/components/FavoritesControl";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import PermissionsEditorDialog from "@/components/PermissionsEditorDialog";
import ApiKeyDialog from "@/components/queries/ApiKeyDialog";
import getTags from "@/services/getTags";
import { clientConfig } from "@/services/auth";
import useQueryFlags from "../hooks/useQueryFlags";

import { updateQuery, publishQuery, unpublishQuery, renameQuery, archiveQuery, duplicateQuery } from "../utils";

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
        filter(groups, group => group.length > 0),
        (result, items, key) => {
          const divider = result.length > 0 ? <Menu.Divider key={`divider${key}`} /> : null;
          return [...result, divider, ...items];
        },
        []
      )}
    </Menu>
  );
}

export default function QueryPageHeader({ query, sourceMode, selectedVisualization, onChange }) {
  const queryFlags = useQueryFlags(query);

  const saveName = useCallback(
    name => {
      renameQuery(query, name).then(onChange);
    },
    [query, onChange]
  );

  const saveTags = useCallback(
    tags => {
      updateQuery(query, { tags }).then(onChange);
    },
    [query, onChange]
  );

  const showPermissionsControl = clientConfig.showPermissionsControl;

  const moreActionsMenu = useMemo(
    () =>
      createMenu([
        {
          fork: {
            isEnabled: !queryFlags.isNew && queryFlags.canFork,
            title: (
              <React.Fragment>
                Fork
                <i className="fa fa-external-link m-l-5" />
              </React.Fragment>
            ),
            onClick: () => {
              duplicateQuery(query);
            },
          },
        },
        {
          archive: {
            isAvailable: !queryFlags.isNew && queryFlags.canEdit && !queryFlags.isArchived,
            title: "Archive",
            onClick: () => {
              archiveQuery(query).then(onChange);
            },
          },
          managePermissions: {
            isAvailable: !queryFlags.isNew && queryFlags.canEdit && !queryFlags.isArchived && showPermissionsControl,
            title: "Manage Permissions",
            onClick: () => {
              const aclUrl = `api/queries/${query.id}/acl`;
              PermissionsEditorDialog.showModal({
                aclUrl,
                context: "query",
                author: query.user,
              });
            },
          },
          unpublish: {
            isAvailable: !queryFlags.isNew && queryFlags.canEdit && !queryFlags.isDraft,
            title: "Unpublish",
            onClick: () => {
              unpublishQuery(query).then(onChange);
            },
          },
        },
        {
          showAPIKey: {
            isAvailable: !queryFlags.isNew,
            title: "Show API Key",
            onClick: () => {
              ApiKeyDialog.showModal({ query }).result.then(onChange);
            },
          },
        },
      ]),
    [showPermissionsControl, query, queryFlags, onChange]
  );

  return (
    <div className="p-b-10 page-header--new page-header--query">
      <div className="page-title">
        <div className="d-flex flex-nowrap align-items-center">
          {!queryFlags.isNew && (
            <span className="m-r-5">
              <FavoritesControl item={query} />
            </span>
          )}
          <h3>
            <EditInPlace isEditable={queryFlags.canEdit} onDone={saveName} ignoreBlanks value={query.name} />
            <span className={cx("m-l-10", "query-tags", { "query-tags__empty": query.tags.length === 0 })}>
              <QueryTagsControl
                tags={query.tags}
                isDraft={queryFlags.isDraft}
                isArchived={queryFlags.isArchived}
                canEdit={queryFlags.canEdit}
                getAvailableTags={getQueryTags}
                onEdit={saveTags}
              />
            </span>
          </h3>
          <span className="flex-fill" />
          {queryFlags.isDraft && !queryFlags.isArchived && !queryFlags.isNew && queryFlags.canEdit && (
            <Button
              className="hidden-xs m-r-5"
              onClick={() => {
                publishQuery(query).then(onChange);
              }}>
              <i className="fa fa-paper-plane m-r-5" /> Publish
            </Button>
          )}

          {!queryFlags.isNew && queryFlags.canViewSource && (
            <span>
              {!sourceMode && (
                <Button className="m-r-5" href={query.getUrl(true, selectedVisualization)}>
                  <i className="fa fa-pencil-square-o m-r-5" aria-hidden="true" /> Edit Source
                </Button>
              )}
              {sourceMode && (
                <Button className="m-r-5" href={query.getUrl(false, selectedVisualization)} data-test="QueryPageShowDataOnly">
                  <i className="fa fa-table m-r-5" aria-hidden="true" /> Show Data Only
                </Button>
              )}
            </span>
          )}

          {!queryFlags.isNew && (
            <Dropdown overlay={moreActionsMenu} trigger={["click"]}>
              <Button>
                <Icon type="ellipsis" rotate={90} />
              </Button>
            </Dropdown>
          )}
        </div>
        <span className={cx("query-tags__mobile", { "query-tags__empty": query.tags.length === 0 })}>
          <QueryTagsControl
            tags={query.tags}
            isDraft={queryFlags.isDraft}
            isArchived={queryFlags.isArchived}
            canEdit={queryFlags.canEdit}
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
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  sourceMode: PropTypes.bool,
  selectedVisualization: PropTypes.number,
  onChange: PropTypes.func,
};

QueryPageHeader.defaultProps = {
  sourceMode: false,
  selectedVisualization: null,
  onChange: () => {},
};
