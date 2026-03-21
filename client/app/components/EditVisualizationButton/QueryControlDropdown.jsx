import React from "react";
import PropTypes from "prop-types";
import Dropdown from "antd/lib/dropdown";
import Button from "antd/lib/button";
import PlainButton from "@/components/PlainButton";
import { clientConfig } from "@/services/auth";

import PlusCircleFilledIcon from "@ant-design/icons/PlusCircleFilled";
import ShareAltOutlinedIcon from "@ant-design/icons/ShareAltOutlined";
import FileOutlinedIcon from "@ant-design/icons/FileOutlined";
import FileExcelOutlinedIcon from "@ant-design/icons/FileExcelOutlined";
import EllipsisOutlinedIcon from "@ant-design/icons/EllipsisOutlined";

import QueryResultsLink from "./QueryResultsLink";

export default function QueryControlDropdown(props) {
  props = {
    queryResult: {},
    embed: false,
    apiKey: "",
    selectedTab: "",
    ...props,
  };

  const menuItems = [
    !props.query.isNew() &&
      (!props.query.is_draft || !props.query.is_archived) && {
        key: "add-to-dashboard",
        label: (
          <PlainButton onClick={() => props.openAddToDashboardForm(props.selectedTab)}>
            <PlusCircleFilledIcon /> Add to Dashboard
          </PlainButton>
        ),
      },
    !clientConfig.disablePublicUrls &&
      !props.query.isNew() && {
        key: "embed",
        label: (
          <PlainButton
            onClick={() => props.showEmbedDialog(props.query, props.selectedTab)}
            data-test="ShowEmbedDialogButton"
          >
            <ShareAltOutlinedIcon /> Embed Elsewhere
          </PlainButton>
        ),
      },
    {
      key: "download-csv",
      label: (
        <QueryResultsLink
          fileType="csv"
          disabled={props.queryExecuting || !props.queryResult.getData || !props.queryResult.getData()}
          query={props.query}
          queryResult={props.queryResult}
          embed={props.embed}
          apiKey={props.apiKey}
        >
          <FileOutlinedIcon /> Download as CSV File
        </QueryResultsLink>
      ),
    },
    {
      key: "download-tsv",
      label: (
        <QueryResultsLink
          fileType="tsv"
          disabled={props.queryExecuting || !props.queryResult.getData || !props.queryResult.getData()}
          query={props.query}
          queryResult={props.queryResult}
          embed={props.embed}
          apiKey={props.apiKey}
        >
          <FileOutlinedIcon /> Download as TSV File
        </QueryResultsLink>
      ),
    },
    {
      key: "download-xlsx",
      label: (
        <QueryResultsLink
          fileType="xlsx"
          disabled={props.queryExecuting || !props.queryResult.getData || !props.queryResult.getData()}
          query={props.query}
          queryResult={props.queryResult}
          embed={props.embed}
          apiKey={props.apiKey}
        >
          <FileExcelOutlinedIcon /> Download as Excel File
        </QueryResultsLink>
      ),
    },
  ].filter(Boolean);

  return (
    <Dropdown trigger={["click"]} menu={{ items: menuItems }} classNames={{ root: "query-control-dropdown-overlay" }}>
      <Button data-test="QueryControlDropdownButton">
        <EllipsisOutlinedIcon rotate={90} />
      </Button>
    </Dropdown>
  );
}

QueryControlDropdown.propTypes = {
  query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  queryResult: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  queryExecuting: PropTypes.bool.isRequired,
  showEmbedDialog: PropTypes.func.isRequired,
  embed: PropTypes.bool,
  apiKey: PropTypes.string,
  selectedTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  openAddToDashboardForm: PropTypes.func.isRequired,
};
