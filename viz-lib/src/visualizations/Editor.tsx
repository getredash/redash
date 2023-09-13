import React, { useMemo } from "react";
import { EditorPropTypes } from "@/visualizations/prop-types";
import registeredVisualizations, { getUnknownVisualization } from "@/visualizations/registeredVisualizations";

/*
(ts-migrate) TODO: Migrate the remaining prop types
...EditorPropTypes
*/
type Props = {
  type: string;
} & typeof EditorPropTypes;

export default function Editor({ type, options: optionsProp, data, ...otherProps }: Props) {
  const { Editor, getOptions } = registeredVisualizations[type] ?? getUnknownVisualization(type)
  const options = useMemo(() => getOptions(optionsProp, data), [optionsProp, data]);

  return <Editor options={options} data={data} {...otherProps} />;
}
