import React, { useMemo } from "react";
import { EditorPropTypes } from "@/visualizations/prop-types";
import registeredVisualizations from "@/visualizations/registeredVisualizations";

/*
(ts-migrate) TODO: Migrate the remaining prop types
...EditorPropTypes
*/
type Props = {
    type: string;
} & typeof EditorPropTypes;

export default function Editor({ type, options: optionsProp, data, ...otherProps }: Props) {
  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const { Editor, getOptions } = registeredVisualizations[type];
  const options = useMemo(() => getOptions(optionsProp, data), [optionsProp, data]);

  return <Editor options={options} data={data} {...otherProps} />;
}
