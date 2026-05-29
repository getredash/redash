import { map } from "lodash";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import * as Grid from "antd/lib/grid";
import { Section, Select, Input, Checkbox, TextAlignmentSelect } from "@/components/visualizations/editor";

import ColumnTypes from "../columns";

type Column = {
  name: string;
  title?: string;
  visible?: boolean;
  alignContent?: "left" | "center" | "right";
  displayAs?: any;
  description?: string;
  allowSearch?: boolean;
};

type ColumnEditorProps = {
  column: Column;
  onChange?: (changes: any) => any;
  variant: "table" | "details";
  showSearch?: boolean;
  testPrefix?: string;
};

export default function ColumnEditor({
  column,
  onChange,
  variant,
  showSearch = variant === "table",
  testPrefix,
}: ColumnEditorProps) {
  function handleChange(changes: any) {
    if (onChange) {
      onChange({ ...column, ...changes });
    }
  }

  const [handleChangeDebounced] = useDebouncedCallback(handleChange, 200);

  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const AdditionalOptions = ColumnTypes[column.displayAs].Editor || null;

  const cssClass = `${variant}-visualization-editor-column`;
  const dataTestPrefix = testPrefix || `${variant === "table" ? "Table" : "Details"}.Column.${column.name}`;

  return (
    <div className={cssClass}>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element[]; gutter: number; type:... Remove this comment to see the full error message */}
        <Grid.Row gutter={15} type="flex" align="middle">
          <Grid.Col span={16}>
            <Input
              data-test={`${dataTestPrefix}.Title`}
              defaultValue={column.title}
              onChange={(event: any) => handleChangeDebounced({ title: event.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={8}>
            <TextAlignmentSelect
              data-test={`${dataTestPrefix}.TextAlignment`}
              defaultValue={column.alignContent}
              onChange={(event: any) => handleChange({ alignContent: event.target.value })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      {showSearch && (
        /* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */
        <Section>
          <Checkbox
            data-test={`${dataTestPrefix}.UseForSearch`}
            defaultChecked={column.allowSearch}
            onChange={event => handleChange({ allowSearch: event.target.checked })}>
            Use for search
          </Checkbox>
        </Section>
      )}

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label="Description"
          data-test={`${dataTestPrefix}.Description`}
          defaultValue={column.description}
          onChange={(event: any) => handleChangeDebounced({ description: event.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          label="Display as:"
          data-test={`${dataTestPrefix}.DisplayAs`}
          defaultValue={column.displayAs}
          onChange={(displayAs: any) => handleChange({ displayAs })}>
          {map(ColumnTypes, ({ friendlyName }, key) => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={key} data-test={`${dataTestPrefix}.DisplayAs.${key}`}>
              {friendlyName}
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {AdditionalOptions && <AdditionalOptions column={column} onChange={handleChange} />}
    </div>
  );
}

ColumnEditor.defaultProps = {
  onChange: () => {},
};
