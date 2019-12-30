import React from "react";
import PropTypes from "prop-types";
import HtmlContent from "@/components/HtmlContent";
import { Section, Checkbox } from "@/components/visualizations/editor";
import { createTextFormatter } from "@/lib/value-format";

function Editor({ column, onChange }) {
  return (
    <React.Fragment>
      <Section>
        <Checkbox
          data-test="Table.ColumnEditor.Text.AllowHTML"
          checked={column.allowHTML}
          onChange={event => onChange({ allowHTML: event.target.checked })}>
          Allow HTML content
        </Checkbox>
      </Section>

      {column.allowHTML && (
        <Section>
          <Checkbox
            data-test="Table.ColumnEditor.Text.HighlightLinks"
            checked={column.highlightLinks}
            onChange={event => onChange({ highlightLinks: event.target.checked })}>
            Highlight links
          </Checkbox>
        </Section>
      )}
    </React.Fragment>
  );
}

Editor.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    allowHTML: PropTypes.bool,
    highlightLinks: PropTypes.bool,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function initTextColumn(column) {
  const format = createTextFormatter(column.allowHTML && column.highlightLinks);

  function prepareData(row) {
    return {
      text: format(row[column.name]),
    };
  }

  function TextColumn({ row }) {
    // eslint-disable-line react/prop-types
    const { text } = prepareData(row);
    return column.allowHTML ? <HtmlContent>{text}</HtmlContent> : text;
  }

  TextColumn.prepareData = prepareData;

  return TextColumn;
}

initTextColumn.friendlyName = "Text";
initTextColumn.Editor = Editor;
