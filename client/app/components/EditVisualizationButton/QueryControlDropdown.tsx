import React from "react";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import Button from "antd/lib/button";
import { clientConfig } from "@/services/auth";
import PlusCircleFilledIcon from "@ant-design/icons/PlusCircleFilled";
import ShareAltOutlinedIcon from "@ant-design/icons/ShareAltOutlined";
import FileOutlinedIcon from "@ant-design/icons/FileOutlined";
import FileExcelOutlinedIcon from "@ant-design/icons/FileExcelOutlined";
import EllipsisOutlinedIcon from "@ant-design/icons/EllipsisOutlined";
import QueryResultsLink from "./QueryResultsLink";
type OwnProps = {
    query: any;
    queryResult?: any;
    queryExecuting: boolean;
    showEmbedDialog: (...args: any[]) => any;
    embed?: boolean;
    apiKey?: string;
    selectedTab?: string | number;
    openAddToDashboardForm: (...args: any[]) => any;
};
type Props = OwnProps & typeof QueryControlDropdown.defaultProps;
export default function QueryControlDropdown(props: Props) {
    const menu = (<Menu>
      {!props.query.isNew() && (!props.query.is_draft || !props.query.is_archived) && (<Menu.Item>
          <a target="_self" onClick={() => props.openAddToDashboardForm(props.selectedTab)}>
            <PlusCircleFilledIcon /> Add to Dashboard
          </a>
        </Menu.Item>)}
      {!(clientConfig as any).disablePublicUrls && !props.query.isNew() && (<Menu.Item>
          <a onClick={() => props.showEmbedDialog(props.query, props.selectedTab)} data-test="ShowEmbedDialogButton">
            <ShareAltOutlinedIcon /> Embed Elsewhere
          </a>
        </Menu.Item>)}
      <Menu.Item>
        <QueryResultsLink fileType="csv" disabled={props.queryExecuting || !props.queryResult.getData || !props.queryResult.getData()} query={props.query} queryResult={props.queryResult} embed={props.embed} apiKey={props.apiKey}>
          <FileOutlinedIcon /> Download as CSV File
        </QueryResultsLink>
      </Menu.Item>
      <Menu.Item>
        <QueryResultsLink fileType="tsv" disabled={props.queryExecuting || !props.queryResult.getData || !props.queryResult.getData()} query={props.query} queryResult={props.queryResult} embed={props.embed} apiKey={props.apiKey}>
          <FileOutlinedIcon /> Download as TSV File
        </QueryResultsLink>
      </Menu.Item>
      <Menu.Item>
        <QueryResultsLink fileType="xlsx" disabled={props.queryExecuting || !props.queryResult.getData || !props.queryResult.getData()} query={props.query} queryResult={props.queryResult} embed={props.embed} apiKey={props.apiKey}>
          <FileExcelOutlinedIcon /> Download as Excel File
        </QueryResultsLink>
      </Menu.Item>
    </Menu>);
    return (<Dropdown trigger={["click"]} overlay={menu} overlayClassName="query-control-dropdown-overlay">
      <Button data-test="QueryControlDropdownButton">
        <EllipsisOutlinedIcon rotate={90}/>
      </Button>
    </Dropdown>);
}
QueryControlDropdown.defaultProps = {
    queryResult: {},
    embed: false,
    apiKey: "",
    selectedTab: "",
};
