import { extend, trim } from "lodash";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Input, ControlLabel, ContextHelp } from "@/components/visualizations/editor";
import { formatSimpleTemplate } from "@/lib/value-format";

type Props = {
    column: {
        name: string;
        imageUrlTemplate?: string;
        imageWidth?: string;
        imageHeight?: string;
        imageTitleTemplate?: string;
    };
    onChange: (...args: any[]) => any;
};

function Editor({ column, onChange }: Props) {
  const [onChangeDebounced] = useDebouncedCallback(onChange, 200);

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label="URL template"
          data-test="Table.ColumnEditor.Image.UrlTemplate"
          defaultValue={column.imageUrlTemplate}
          onChange={(event: any) => onChangeDebounced({ imageUrlTemplate: event.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <ControlLabel
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message
          label={
            <React.Fragment>
              Size
              {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
              <ContextHelp placement="topLeft" arrowPointAtCenter>
                <div style={{ marginBottom: 5 }}>Any positive integer value that specifies size in pixels.</div>
                <div>Leave empty to use default value.</div>
              </ContextHelp>
            </React.Fragment>
          }>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
          <div className="image-dimension-selector">
            <Input
              data-test="Table.ColumnEditor.Image.Width"
              placeholder="Width"
              defaultValue={column.imageWidth}
              onChange={(event: any) => onChangeDebounced({ imageWidth: event.target.value })}
            />
            <span className="image-dimension-selector-spacer">&times;</span>
            <Input
              data-test="Table.ColumnEditor.Image.Height"
              placeholder="Height"
              defaultValue={column.imageHeight}
              onChange={(event: any) => onChangeDebounced({ imageHeight: event.target.value })}
            />
          </div>
        </ControlLabel>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label="Title template"
          data-test="Table.ColumnEditor.Image.TitleTemplate"
          defaultValue={column.imageTitleTemplate}
          onChange={(event: any) => onChangeDebounced({ imageTitleTemplate: event.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
        <ContextHelp
          placement="topLeft"
          arrowPointAtCenter
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message
          icon={<span style={{ cursor: "default" }}>Format specs {ContextHelp.defaultIcon}</span>}>
          <div>
            All columns can be referenced using <code>{"{{ column_name }}"}</code> syntax.
          </div>
          <div>
            Use <code>{"{{ @ }}"}</code> to reference current (this) column.
          </div>
          <div>This syntax is applicable to URL, Title and Size options.</div>
        </ContextHelp>
      </Section>
    </React.Fragment>
  );
}

export default function initImageColumn(column: any) {
  function prepareData(row: any) {
    row = extend({ "@": row[column.name] }, row);

    const src = trim(formatSimpleTemplate(column.imageUrlTemplate, row));
    if (src === "") {
      return {};
    }

    const width = parseInt(formatSimpleTemplate(column.imageWidth, row), 10);
    const height = parseInt(formatSimpleTemplate(column.imageHeight, row), 10);
    const title = trim(formatSimpleTemplate(column.imageTitleTemplate, row));

    const result = { src };

    if (Number.isFinite(width) && width > 0) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'width' does not exist on type '{ src: st... Remove this comment to see the full error message
      result.width = width;
    }
    if (Number.isFinite(height) && height > 0) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'height' does not exist on type '{ src: s... Remove this comment to see the full error message
      result.height = height;
    }
    if (title !== "") {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'text' does not exist on type '{ src: str... Remove this comment to see the full error message
      result.text = title; // `text` is used for search
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'title' does not exist on type '{ src: st... Remove this comment to see the full error message
      result.title = title;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'alt' does not exist on type '{ src: stri... Remove this comment to see the full error message
      result.alt = title;
    }

    return result;
  }

  function ImageColumn({
    row
  }: any) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'text' does not exist on type '{}'.
    // eslint-disable-line react/prop-types
    const { text, ...props } = prepareData(row);
    return <img alt="" {...props} />;
  }

  ImageColumn.prepareData = prepareData;

  return ImageColumn;
}

initImageColumn.friendlyName = "Image";
initImageColumn.Editor = Editor;
