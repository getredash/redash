import React, { useState, useEffect } from "react";
import { toLower, isNumber } from "lodash";

import InputNumber from "antd/lib/input-number";
import Select from "antd/lib/select";

import "./Rearm.less";

const DURATIONS = [
  ["Second", 1],
  ["Minute", 60],
  ["Hour", 3600],
  ["Day", 86400],
  ["Week", 604800],
];

type OwnRearmByDurationProps = {
    onChange?: (...args: any[]) => any;
    value: number;
    editMode: boolean;
};

type RearmByDurationProps = OwnRearmByDurationProps & typeof RearmByDuration.defaultProps;

function RearmByDuration({ value, onChange, editMode }: RearmByDurationProps) {
  const [durationIdx, setDurationIdx] = useState();
  const [count, setCount] = useState();

  useEffect(() => {
    for (let i = DURATIONS.length - 1; i >= 0; i -= 1) {
      const [, durValue] = DURATIONS[i];
      // @ts-expect-error ts-migrate(2363) FIXME: The right-hand side of an arithmetic operation mus... Remove this comment to see the full error message
      if (value % durValue === 0) {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'number' is not assignable to par... Remove this comment to see the full error message
        setDurationIdx(i);
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'number' is not assignable to par... Remove this comment to see the full error message
        setCount(value / durValue);
        break;
      }
    }
  }, [value]);

  if (!isNumber(count) || !isNumber(durationIdx)) {
    return null;
  }

  const onChangeCount = (newCount: any) => {
    setCount(newCount);
    // @ts-expect-error ts-migrate(2538) FIXME: Type 'undefined' cannot be used as an index type.
    onChange(newCount * DURATIONS[durationIdx][1]);
  };

  const onChangeIdx = (newIdx: any) => {
    setDurationIdx(newIdx);
    // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
    onChange(count * DURATIONS[newIdx][1]);
  };

  const plural = count !== 1 ? "s" : "";

  if (editMode) {
    return (
      <>
        <InputNumber value={count} onChange={onChangeCount} min={1} precision={0} />
        <Select value={durationIdx} onChange={onChangeIdx}>
          {DURATIONS.map(([name], idx) => (
            <Select.Option value={idx} key={name}>
              {name}
              {plural}
            </Select.Option>
          ))}
        </Select>
      </>
    );
  }

  // @ts-expect-error ts-migrate(2538) FIXME: Type 'undefined' cannot be used as an index type.
  const [name] = DURATIONS[durationIdx];
  return count + " " + toLower(name) + plural;
}

RearmByDuration.defaultProps = {
  onChange: () => {},
};

type RearmEditorProps = {
    onChange: (...args: any[]) => any;
    value: number;
};

function RearmEditor({ value, onChange }: RearmEditorProps) {
  const [selected, setSelected] = useState(value < 2 ? value : 2);

  const _onChange = (newSelected: any) => {
    setSelected(newSelected);
    onChange(newSelected < 2 ? newSelected : 3600);
  };

  return (
    <div className="alert-rearm">
      <Select
        optionLabelProp="label"
        defaultValue={selected || 0}
        dropdownMatchSelectWidth={false}
        onChange={_onChange}>
        <Select.Option value={0} label="Just once">
          Just once <em>until back to normal</em>
        </Select.Option>
        <Select.Option value={1} label="Each time alert is evaluated">
          Each time alert is evaluated <em>until back to normal</em>
        </Select.Option>
        <Select.Option value={2} label="At most every">
          At most every ... <em>when alert is evaluated</em>
        </Select.Option>
      </Select>
      {/* @ts-expect-error ts-migrate(2786) FIXME: 'RearmByDuration' cannot be used as a JSX componen... Remove this comment to see the full error message */}
      {selected === 2 && value && <RearmByDuration value={value} onChange={onChange} editMode />}
    </div>
  );
}

type RearmViewerProps = {
    value: number;
};

function RearmViewer({ value }: RearmViewerProps) {
  let phrase = "";
  switch (value) {
    case 0:
      phrase = "just once, until back to normal";
      break;
    case 1:
      phrase = "each time alert is evaluated, until back to normal";
      break;
    default:
      // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'string'.
      phrase = (
        <>
          {/* @ts-expect-error ts-migrate(2786) FIXME: 'RearmByDuration' cannot be used as a JSX componen... Remove this comment to see the full error message */}
          at most every <RearmByDuration value={value} editMode={false} />, when alert is evaluated
        </>
      );
  }

  return <span>Notifications are sent {phrase}.</span>;
}

type OwnRearmProps = {
    onChange?: (...args: any[]) => any;
    value: number;
    editMode?: boolean;
};

type RearmProps = OwnRearmProps & typeof Rearm.defaultProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function Rearm({ editMode, ...props }: RearmProps) {
  return editMode ? <RearmEditor {...props} /> : <RearmViewer {...props} />;
}

Rearm.defaultProps = {
  onChange: null,
  editMode: false,
};
