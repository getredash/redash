import { extend, map, filter, reduce } from "lodash";
import React, { useMemo } from "react";
import Button from "antd/lib/button";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import EllipsisOutlinedIcon from "@ant-design/icons/EllipsisOutlined";
import useMedia from "use-media";
import Link from "@/components/Link";
import EditInPlace from "@/components/EditInPlace";
import FavoritesControl from "@/components/FavoritesControl";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import getTags from "@/services/getTags";
import { clientConfig } from "@/services/auth";
import useQueryFlags from "../hooks/useQueryFlags";
import useArchiveQuery from "../hooks/useArchiveQuery";
import usePublishQuery from "../hooks/usePublishQuery";
import useUnpublishQuery from "../hooks/useUnpublishQuery";
import useUpdateQueryTags from "../hooks/useUpdateQueryTags";
import useRenameQuery from "../hooks/useRenameQuery";
import useDuplicateQuery from "../hooks/useDuplicateQuery";
import useApiKeyDialog from "../hooks/useApiKeyDialog";
import usePermissionsEditorDialog from "../hooks/usePermissionsEditorDialog";
import "./QueryPageHeader.less";
function getQueryTags() {
    return getTags("api/queries/tags").then(tags => map(tags, t => t.name));
}
function createMenu(menu: any) {
    const handlers = {};
    const groups = map(menu, group => filter(map(group, (props, key) => {
        props = extend({ isAvailable: true, isEnabled: true, onClick: () => { } }, props);
        if (props.isAvailable) {
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            handlers[key] = props.onClick;
            return (<Menu.Item key={key} disabled={!props.isEnabled}>
              {props.title}
            </Menu.Item>);
        }
        return null;
    })));
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    return (<Menu onClick={({ key }) => handlers[key]()}>
      {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
      {reduce(filter(groups, group => group.length > 0), (result, items, key) => {
        const divider = result.length > 0 ? <Menu.Divider key={`divider${key}`}/> : null;
        return [...result, divider, ...items];
    }, [])}
    </Menu>);
}
type OwnProps = {
    query: {
        id?: number | string;
        name?: string;
        tags?: string[];
    };
    dataSource?: any;
    sourceMode?: boolean;
    selectedVisualization?: number;
    headerExtra?: React.ReactNode;
    tagsExtra?: React.ReactNode;
    onChange?: (...args: any[]) => any;
};
type Props = OwnProps & typeof QueryPageHeader.defaultProps;
export default function QueryPageHeader({ query, dataSource, sourceMode, selectedVisualization, headerExtra, tagsExtra, onChange, }: Props) {
    const isDesktop = useMedia({ minWidth: 768 });
    const queryFlags = useQueryFlags(query, dataSource);
    const updateName = useRenameQuery(query, onChange);
    const updateTags = useUpdateQueryTags(query, onChange);
    const archiveQuery = useArchiveQuery(query, onChange);
    const publishQuery = usePublishQuery(query, onChange);
    const unpublishQuery = useUnpublishQuery(query, onChange);
    const [isDuplicating, duplicateQuery] = useDuplicateQuery(query);
    const openApiKeyDialog = useApiKeyDialog(query, onChange);
    const openPermissionsEditorDialog = usePermissionsEditorDialog(query);
    const moreActionsMenu = useMemo(() => createMenu([
        {
            fork: {
                isEnabled: !queryFlags.isNew && queryFlags.canFork && !isDuplicating,
                title: (<React.Fragment>
                Fork
                <i className="fa fa-external-link m-l-5"/>
              </React.Fragment>),
                onClick: duplicateQuery,
            },
        },
        {
            archive: {
                isAvailable: !queryFlags.isNew && queryFlags.canEdit && !queryFlags.isArchived,
                title: "Archive",
                onClick: archiveQuery,
            },
            managePermissions: {
                isAvailable: !queryFlags.isNew && queryFlags.canEdit && !queryFlags.isArchived && (clientConfig as any).showPermissionsControl,
                title: "Manage Permissions",
                onClick: openPermissionsEditorDialog,
            },
            publish: {
                isAvailable: !isDesktop && queryFlags.isDraft && !queryFlags.isArchived && !queryFlags.isNew && queryFlags.canEdit,
                title: "Publish",
                onClick: publishQuery,
            },
            unpublish: {
                isAvailable: !(clientConfig as any).disablePublish && !queryFlags.isNew && queryFlags.canEdit && !queryFlags.isDraft,
                title: "Unpublish",
                onClick: unpublishQuery,
            },
        },
        {
            showAPIKey: {
                isAvailable: !(clientConfig as any).disablePublicUrls && !queryFlags.isNew,
                title: "Show API Key",
                onClick: openApiKeyDialog,
            },
        },
    ]), [
        queryFlags.isNew,
        queryFlags.canFork,
        queryFlags.canEdit,
        queryFlags.isArchived,
        queryFlags.isDraft,
        isDuplicating,
        duplicateQuery,
        archiveQuery,
        openPermissionsEditorDialog,
        isDesktop,
        publishQuery,
        unpublishQuery,
        openApiKeyDialog,
    ]);
    return (<div className="query-page-header">
      <div className="title-with-tags">
        <div className="page-title">
          <div className="d-flex align-items-center">
            {!queryFlags.isNew && <FavoritesControl item={query}/>}
            <h3>
              <EditInPlace isEditable={queryFlags.canEdit} onDone={updateName} ignoreBlanks value={(query as any).name}/>
            </h3>
          </div>
        </div>
        <div className="query-tags">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ tags: any; isDraft: any; isArchived: any; ... Remove this comment to see the full error message */}
          <QueryTagsControl tags={(query as any).tags} isDraft={queryFlags.isDraft} isArchived={queryFlags.isArchived} canEdit={queryFlags.canEdit} getAvailableTags={getQueryTags} onEdit={updateTags} tagsExtra={tagsExtra}/>
        </div>
      </div>
      <div className="header-actions">
        {headerExtra}
        {isDesktop && queryFlags.isDraft && !queryFlags.isArchived && !queryFlags.isNew && queryFlags.canEdit && (<Button className="m-r-5" onClick={publishQuery}>
            <i className="fa fa-paper-plane m-r-5"/> Publish
          </Button>)}

        {!queryFlags.isNew && queryFlags.canViewSource && (<span>
            {!sourceMode && queryFlags.canEdit && (<Link.Button className="m-r-5" href={(query as any).getUrl(true, selectedVisualization)}>
                <i className="fa fa-pencil-square-o" aria-hidden="true"/>
                <span className="m-l-5">Edit Source</span>
              </Link.Button>)}
            {sourceMode && (<Link.Button className="m-r-5" href={(query as any).getUrl(false, selectedVisualization)} data-test="QueryPageShowResultOnly">
                <i className="fa fa-table" aria-hidden="true"/>
                <span className="m-l-5">Show Results Only</span>
              </Link.Button>)}
          </span>)}

        {!queryFlags.isNew && (<Dropdown overlay={moreActionsMenu} trigger={["click"]}>
            <Button data-test="QueryPageHeaderMoreButton">
              <EllipsisOutlinedIcon rotate={90}/>
            </Button>
          </Dropdown>)}
      </div>
    </div>);
}
QueryPageHeader.defaultProps = {
    dataSource: null,
    sourceMode: false,
    selectedVisualization: null,
    headerExtra: null,
    tagsExtra: null,
    onChange: () => { },
};
