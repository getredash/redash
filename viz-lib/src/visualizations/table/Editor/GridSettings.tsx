import { map } from "lodash";
import React, { useState } from "react";
import { Section, Select } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

const ALLOWED_ITEM_PER_PAGE = [5, 10, 15, 20, 25, 50, 100, 150, 200, 250, 500];

const ALLOWED_COLS_TO_FIX = [0, 1, 2, 3, 4]

export default function GridSettings({ options, onOptionsChange }: any) {
  const numCols = options.columns.length;
  const maxColsToFix = Math.min(4, numCols - 1);

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never' but its value is 'Element'. */}
      <Section>
        <Select
          label="Items per page"
          data-test="Table.ItemsPerPage"
          defaultValue={options.itemsPerPage}
          onChange={(itemsPerPage: any) => onOptionsChange({ itemsPerPage })}>
          {map(ALLOWED_ITEM_PER_PAGE, value => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={`ipp${value}`} value={value} data-test={`Table.ItemsPerPage.${value}`}>
              {value}
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never' but its value is 'Element'. */}
      <Section>
        <Select
          label="Number of Columns to Fix in Place"
          data-test="FixedColumns"
          defaultValue={options.fixedColumns}
          onChange={(fixedColumns: number) => {onOptionsChange({ fixedColumns })}}>
          {map(ALLOWED_COLS_TO_FIX.slice(0, maxColsToFix + 1), value => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={`fc${value}`} value={value}>
              {value}
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
          </Select>
      </Section>
    </React.Fragment>
  );
}

GridSettings.propTypes = EditorPropTypes;
