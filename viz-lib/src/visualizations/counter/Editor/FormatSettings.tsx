import React from "react";
import { Section, Select, Input, InputNumber, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

import { isValueNumber } from "../utils";

export default function FormatSettings({ options, data, onOptionsChange }: any) {
  const inputsEnabled = isValueNumber(data.rows, options);
  return (
    <React.Fragment>
      <Section>
        <Select
          layout="horizontal"
          label="Style"
          data-test="Counter.Formatting.Style"
          defaultValue={options.tooltipFormat?.style}
          disabled={!inputsEnabled}
          onChange={(style: any) => onOptionsChange({ tooltipFormat: {style} })}
          options={[
            {
              value: "decimal",
              label: "Decimal",
            },
            {
              value: "unit",
              label: "Unit",
            },
            {
              value: "percent",
              label: "Percent",
            },
            {
              value: "currency",
              label: "Currency",
            },
          ]}
        />
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Grouping"
          data-test="Counter.Formatting.Grouping"
          defaultValue={options.tooltipFormat?.useGrouping}
          disabled={!inputsEnabled}
          onChange={(useGrouping: any) => onOptionsChange({ tooltipFormat: {useGrouping} })}
          options={[
            {
              value: "always",
              label: "Always",
            },
            {
              value: "auto",
              label: "Auto",
            },
            {
              value: "min2",
              label: "Use separator with 2 digits in a group",
            },
            {
              value: false,
              label: "Disable",
            },
          ]}
        />
      </Section>

      {options.tooltipFormat?.style === "unit" && (
        <>
          <Section>
            <Select
              layout="horizontal"
              label="Unit"
              data-test="Counter.Formatting.Unit"
              defaultValue={options.tooltipFormat?.unit}
              disabled={!inputsEnabled}
              onChange={(unit: any) => onOptionsChange({ tooltipFormat: {unit} })}
              options={Intl.supportedValuesOf("unit").map((v: any) => {
                return { value: v, label: v.replace("-", " ") };
              })}
            />
          </Section>

          <Section>
            <Select
              layout="horizontal"
              label="Unit Display"
              data-test="Counter.Formatting.UnitDisplay"
              defaultValue={options.formatTooltip?.unitDisplay}
              disabled={!inputsEnabled}
              onChange={(unitDisplay: any) => onOptionsChange({ tooltipFormat: {unitDisplay} })}
              options={[
                {
                  label: "Short",
                  value: "short",
                },
                {
                  label: "Narrow",
                  value: "narrow",
                },
                {
                  label: "Long",
                  value: "long",
                },
              ]}
            />
          </Section>
        </>
      )}

      {options.tooltipFormat?.style === "currency" && (
        <>
          <Section>
            <Select
              layout="horizontal"
              label="Currency"
              data-test="Counter.Formatting.Currency"
              defaultValue={options.tooltopFormat?.currency}
              disabled={!inputsEnabled}
              onChange={(currency: any) => onOptionsChange({ tooltipFormat: {currency} })}
              options={Intl.supportedValuesOf("currency").map((v: any) => {
                return { value: v };
              })}
            />
          </Section>

          <Section>
            <Select
              layout="horizontal"
              label="Currency Display"
              data-test="Counter.Formatting.CurrencyDisplay"
              defaultValue={options.tooltipFormat?.currencyDisplay}
              disabled={!inputsEnabled}
              onChange={(currencyDisplay: any) => onOptionsChange({ tooltipFormat: {currencyDisplay} })}
              options={[
                {
                  value: "code",
                  label: "Code",
                },
                {
                  value: "symbol",
                  label: "Symbol",
                },
                {
                  value: "narrowSymbol",
                  label: "Narrow Symbol",
                },
                {
                  value: "name",
                  label: "Name",
                },
              ]}
            />
          </Section>

          <Section>
            <Select
              layout="horizontal"
              label="Currency Sign"
              data-test="Counter.Formatting.CurrencySign"
              defaultValue={options.tooltipFormat?.currencySign}
              disabled={!inputsEnabled}
              onChange={(currencySign: any) => onOptionsChange({ tooltipFormat: {currencySign} })}
              options={[
                {
                  value: "standard",
                  label: "Standard",
                },
                {
                  value: "accounting",
                  label: "Accounting",
                },
              ]}
            />
          </Section>
        </>
      )}

      <Section>
        <InputNumber
          layout="horizontal"
          label="Minimum Integer Digits"
          data-test="Counter.Formatting.MinimumIntegerDigits"
          defaultValue={options.tooltipFormat?.minimumIntegerDigits}
          disabled={!inputsEnabled}
          onChange={(minimumIntegerDigits: any) => onOptionsChange({ tooltipFormat: {minimumIntegerDigits} })}
        />
      </Section>

      <Section>
        <InputNumber
          layout="horizontal"
          label="Minimum Fraction Digits"
          data-test="Counter.Formatting.MinimumFractionDigits"
          defaultValue={options.tooltipFormat?.minimumFractionDigits}
          disabled={!inputsEnabled}
          onChange={(minimumFractionDigits: any) => onOptionsChange({ tooltipFormat: {minimumFractionDigits} })}
        />
      </Section>

      <Section>
        <InputNumber
          layout="horizontal"
          label="Maximum Fraction Digits"
          data-test="Counter.Formatting.MaximumFractionDigits"
          defaultValue={options.tooltipFormat?.maximumFractionDigits}
          disabled={!inputsEnabled}
          onChange={(maximumFractionDigits: any) => onOptionsChange({ tooltipFormat: {maximumFractionDigits} })}
        />
      </Section>

      <Section>
        <InputNumber
          layout="horizontal"
          label="Minimum Significant Digits"
          data-test="Counter.Formatting.MinimumSignificantDigits"
          defaultValue={options.tooltipFormat?.minimumSignificantDigits}
          disabled={!inputsEnabled}
          onChange={(minimumSignificantDigits: any) => onOptionsChange({ tooltipFormat: {minimumSignificantDigits} })}
        />
      </Section>

      <Section>
        <InputNumber
          layout="horizontal"
          label="Maximum Significant Digits"
          data-test="Counter.Formatting.MaximumSignificantDigits"
          defaultValue={options.tooltipFormat?.maximumSignificantDigits}
          disabled={!inputsEnabled}
          onChange={(maximumSignificantDigits: any) => onOptionsChange({ tooltipFormat: {maximumSignificantDigits} })}
        />
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Rounding Priority"
          data-test="Counter.Formatting.RoundingPriority"
          defaultValue={options.tooltipFormat?.roundingPriority}
          disabled={!inputsEnabled}
          onChange={(roundingPriority: any) => onOptionsChange({ tooltipFormat: {roundingPriority} })}
          options={[{
            value: "auto",
            label: "Auto"
          }, {
            value: "morePrecision",
            label: "More Precision"
          }, {
            value: "lessPrecision",
            label: "Less Precision"
          }]}
        />
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Rounding Increment"
          data-test="Counter.Formatting.RoundingIncrement"
          defaultValue={options.tooltipFormat?.roundingIncrement}
          disabled={!inputsEnabled}
          onChange={(roundingIncrement: any) => onOptionsChange({ tooltipFormat: {roundingIncrement} })}
          options={[1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000].map(x => { return {value: x}})}
        />
      </Section>
 
      <Section>
        <Select
          layout="horizontal"
          label="Rounding Mode"
          data-test="Counter.Formatting.RoundingMode"
          defaultValue={options.tooltipFormat?.roundingMode}
          disabled={!inputsEnabled}
          onChange={(roundingMode: any) => onOptionsChange({ tooltipFormat: {roundingMode} })}
          options={[{
            value: "ceil",
            label: "Ceil",
          }, {
            value: "floor",
            label: "Floor",
          }, {
            value: "expand",
            label: "Expand",
          }, {
            value: "trunc",
            label: "Trunc",
          }, {
            value: "ceil",
            label: "Ceil",
          }, {
            value: "halfCeil",
            label: "Half Ceil",
          }, {
            value: "halfFloor",
            label: "Half Floor",
          }, {
            value: "halfExpand",
            label: "Half Expand",
          }, {
            value: "halfTrunc",
            label: "Half Trunc",
          }, {
            value: "halfEven",
            label: "Half Even",
          }]}
        />
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Trailing Zero Display"
          data-test="Counter.Formatting.TrailingZeroDisplay"
          defaultValue={options.tooltipFormat?.trailingZeroDisplay}
          disabled={!inputsEnabled}
          onChange={(trailingZeroDisplay: any) => onOptionsChange({ tooltipFormat: {trailingZeroDisplay} })}
          options={[{
            value: "auto",
            label: "Auto",
          }, {
            value: "stripIfInteger",
            label: "Strip If Integer",
          }]}
        />
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Notation"
          data-test="Counter.Formatting.Notation"
          defaultValue={options.tooltipFormat?.notation}
          disabled={!inputsEnabled}
          onChange={(notation: any) => onOptionsChange({ tooltipFormat: {notation} })}
          options={[{
            value: "standard",
            label: "Standard",
          }, {
            value: "scientific",
            label: "Scientific",
          }, {
            value: "engineering",
            label: "Engineering",
          }, {
            value: "compact",
            label: "Compact",
          }]}
        />
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Compact Display"
          data-test="Counter.Formatting.CompactDisplay"
          defaultValue={options.tooltipFormat?.compactDisplay}
          disabled={!inputsEnabled}
          onChange={(compactDisplay: any) => onOptionsChange({ tooltipFormat: {compactDisplay} })}
          options={[{
            value: "short",
            label: "Short",
          }, {
            value: "long",
            label: "Long",
          }]}
        />
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Sign Display"
          data-test="Counter.Formatting.SignDisplay"
          defaultValue={options.tooltipFormat?.signDisplay}
          disabled={!inputsEnabled}
          onChange={(signDisplay: any) => onOptionsChange({ tooltipFormat: {signDisplay} })}
          options={[{
            value: "auto",
            label: "Auto",
          }, {
            value: "always",
            label: "Always",
          }, {
            value: "exceptZero",
            label: "Except Zero",
          }, {
            value: "negative",
            label: "Negative",
          }, {
            value: "never",
            label: "Never",
          }]}
        />
      </Section>

      <Section>
        <Switch
          data-test="Counter.Formatting.FormatTargetValue"
          defaultChecked={options.formatTargetValue}
          onChange={(formatTargetValue: any) => onOptionsChange({ formatTargetValue })}>
          Format Target Value
        </Switch>
      </Section>
    </React.Fragment>
  );
}

FormatSettings.propTypes = EditorPropTypes;
