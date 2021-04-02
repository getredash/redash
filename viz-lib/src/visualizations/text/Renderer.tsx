import React, { useState } from "react";
import { map, mapValues, keyBy } from "lodash";
import moment from "moment";
import { RendererPropTypes } from "@/visualizations/prop-types";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";
import Descriptions from "antd/lib/descriptions";
import Pagination from "antd/lib/pagination";
import { markdown } from "markdown";
import HtmlContent from "@/components/HtmlContent";
import Handlebars from "handlebars"


import "./text.less";

function renderValue(value: any, type: any) {
  const formats = {
    date: visualizationsSettings.dateFormat,
    datetime: visualizationsSettings.dateTimeFormat,
  };

  if (type === "date" || type === "datetime") {
    if (moment.isMoment(value)) {
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      return value.format(formats[type]);
    }
  }

  return "" + value;
}

export default function Renderer({options, data }: any) {
  const [page, setPage] = useState(0);

  if (!data || !data.rows || data.rows.length === 0) {
    return null;
  }

  const types = mapValues(keyBy(data.columns, "name"), "type");

  // We use columsn to maintain order of columns in the view.
  const columns = data.columns.map((column: any) => column.name);
  const row = data.rows[page];

  return (
    <div className="text-viz">
      <HtmlContent className="markdown">{
        markdown.toHTML(
          Handlebars.compile(options.template||"")(row)
	)
      }</HtmlContent>
      {data.rows.length > 1 && (
        <div className="paginator-container">
          <Pagination
            showSizeChanger={false}
            current={page + 1}
            defaultPageSize={1}
            total={data.rows.length}
            onChange={p => setPage(p - 1)}
          />
        </div>
      )}
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;

