import { map } from "lodash";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import * as Grid from "antd/lib/grid";
import { Section, Select, Input, TextAlignmentSelect } from "@/components/visualizations/editor";

import ColumnTypes from "../../table/columns";

type OwnProps = {
  column: {
    name: string;
    title?: string;
    visible?: boolean;
    alignContent?: "left" | "center" | "right";
    displayAs?: any;
    description?: string;
  };
  onChange?: (...args: any[]) => any;
};

type Props = OwnProps & typeof ColumnEditor.defaultProps;

export default function ColumnEditor({ column, onChange }: Props) {
  function handleChange(changes: any) {
    onChange({ ...column, ...changes });
  }

  const [handleChangeDebounced] = useDebouncedCallback(handleChange, 200);

  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const AdditionalOptions = ColumnTypes[column.displayAs].Editor || null;

  return (
    <div className="details-visualization-editor-column">
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element[]; gutter: number; type:... Remove this comment to see the full error message */}
        <Grid.Row gutter={15} type="flex" align="middle">
          <Grid.Col span={16}>
            <Input
              label="Column Title"
              data-test={`Details.Column.${column.name}.Title`}
              defaultValue={column.title}
              onChange={(event: any) => handleChangeDebounced({ title: event.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={8}>
            <TextAlignmentSelect
              label="Alignment"
              data-test={`Details.Column.${column.name}.TextAlignment`}
              defaultValue={column.alignContent}
              onChange={(event: any) => handleChange({ alignContent: event.target.value })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label="Description"
          data-test={`Details.Column.${column.name}.Description`}
          defaultValue={column.description}
          onChange={(event: any) => handleChangeDebounced({ description: event.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          label="Display as:"
          data-test={`Details.Column.${column.name}.DisplayAs`}
          defaultValue={column.displayAs}
          onChange={(displayAs: any) => handleChange({ displayAs })}>
          {map(ColumnTypes, ({ friendlyName }, key) => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={key} data-test={`Details.Column.${column.name}.DisplayAs.${key}`}>
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
  onChange: (...args: any[]) => {},
};
