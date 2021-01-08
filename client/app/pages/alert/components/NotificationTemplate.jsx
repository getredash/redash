import React, { useState } from "react";
import PropTypes from "prop-types";
import { head, isEmpty, isNull, isUndefined, isNil, isArray, zip, mapKeys } from "lodash";
import Mustache from "mustache";
import { table, getBorderCharacters } from "table";

import HelpTrigger from "@/components/HelpTrigger";
import { Alert as AlertType, Query as QueryType } from "@/components/proptypes";

import Input from "antd/lib/input";
import Select from "antd/lib/select";
import Modal from "antd/lib/modal";
import Switch from "antd/lib/switch";

import "./NotificationTemplate.less";

function normalizeCustomTemplateData(alert, query, columnNames, resultValues) {
  const topValue = !isEmpty(resultValues) ? head(resultValues)[alert.options.column] : null;

  const tabulateFn = (text, _subRender) => {
    if (_.isEmpty(resultValues)) {
      return "ERROR: No data.";
    }
    const colNames = text
      .split("|")
      .map((t) => t.trim())
      .filter((t) => t.length >= 0);
    const firstRow = head(rows);
    const columns = [];
    for (const colName of colNames) {
      if (isNil(firstRow[colName])) {
        return `ERROR: Column ${colName} not in result.`;
      }
      try {
        const parsed = JSON.parse(firstRow[colName]);
        if (!isArray(parsed)) {
          throw new Error(`Column ${colName} is not an array.`);
        }
        columns.push([colName, ...parsed]);
      } catch (_e) {
        return `ERROR: Column ${colName} is not a valid json array.`;
      }
    }
    const tableOptions = {
      drawHorizontalLine: (index, size) => {
        return index === 0 || index === 1 || index === size;
      },
      border: getBorderCharacters("ramac"),
    };

    return table(zip(...columns), tableOptions);
  };

  const resultColumns = !isEmpty(resultValues) ? mapKeys(result, (_v, c) => `RESULT_${c}`) : {};

  return {
    ALERT_STATUS: "TRIGGERED",
    ALERT_CONDITION: alert.options.op,
    ALERT_THRESHOLD: alert.options.value,
    ALERT_NAME: alert.name,
    ALERT_URL: `${window.location.origin}/alerts/${alert.id}`,
    QUERY_NAME: query.name,
    QUERY_URL: `${window.location.origin}/queries/${query.id}`,
    QUERY_RESULT_VALUE: isNull(topValue) || isUndefined(topValue) ? "UNKNOWN" : topValue,
    QUERY_RESULT_ROWS: JSON.stringify(resultValues),
    QUERY_RESULT_COLS: columnNames,
    ...resultColumns,
    tabulate: () => tabulateFn,
  };
}

function NotificationTemplate({ alert, query, columnNames, resultValues, subject, setSubject, body, setBody }) {
  const hasContent = !!(subject || body);
  const [enabled, setEnabled] = useState(hasContent ? 1 : 0);
  const [showPreview, setShowPreview] = useState(false);

  const renderData = normalizeCustomTemplateData(alert, query, columnNames, resultValues);

  const render = (tmpl) => Mustache.render(tmpl || "", renderData);
  const onEnabledChange = (value) => {
    if (value || !hasContent) {
      setEnabled(value);
      setShowPreview(false);
    } else {
      Modal.confirm({
        title: "Are you sure?",
        content: "Switching to default template will discard your custom template.",
        onOk: () => {
          setSubject(null);
          setBody(null);
          setEnabled(value);
          setShowPreview(false);
        },
        maskClosable: true,
        autoFocusButton: null,
      });
    }
  };

  return (
    <div className="alert-template">
      <Select
        value={enabled}
        onChange={onEnabledChange}
        optionLabelProp="label"
        dropdownMatchSelectWidth={false}
        style={{ width: "fit-content" }}>
        <Select.Option value={0} label="Use default template">
          Default template
        </Select.Option>
        <Select.Option value={1} label="Use custom template">
          Custom template
        </Select.Option>
      </Select>
      {!!enabled && (
        <div className="alert-custom-template" data-test="AlertCustomTemplate">
          <div className="d-flex align-items-center">
            <h5 className="flex-fill">Subject / Body</h5>
            Preview{" "}
            <Switch size="small" className="alert-template-preview" value={showPreview} onChange={setShowPreview} />
          </div>
          <Input
            value={showPreview ? render(subject) : subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={showPreview}
            data-test="CustomSubject"
          />
          <Input.TextArea
            value={showPreview ? render(body) : body}
            autoSize={{ minRows: 9 }}
            onChange={(e) => setBody(e.target.value)}
            disabled={showPreview}
            data-test="CustomBody"
          />
          <HelpTrigger type="ALERT_NOTIF_TEMPLATE_GUIDE" className="f-13">
            <i className="fa fa-question-circle" /> Formatting guide
          </HelpTrigger>
        </div>
      )}
    </div>
  );
}

NotificationTemplate.propTypes = {
  alert: AlertType.isRequired,
  query: QueryType.isRequired,
  columnNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  resultValues: PropTypes.arrayOf(PropTypes.any).isRequired,
  subject: PropTypes.string,
  setSubject: PropTypes.func.isRequired,
  body: PropTypes.string,
  setBody: PropTypes.func.isRequired,
};

NotificationTemplate.defaultProps = {
  subject: "",
  body: "",
};

export default NotificationTemplate;
