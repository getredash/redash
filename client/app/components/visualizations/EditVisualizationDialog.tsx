import { isEqual, extend, map, sortBy, findIndex, filter, pick, omit } from "lodash";
import React, { useState, useMemo, useRef, useEffect } from "react";
import Modal from "antd/lib/modal";
import Select from "antd/lib/select";
import Input from "antd/lib/input";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import Filters, { filterData } from "@/components/Filters";
import notification from "@/services/notification";
import Visualization from "@/services/visualization";
import recordEvent from "@/services/recordEvent";
import useQueryResultData from "@/lib/useQueryResultData";
import {
  registeredVisualizations,
  getDefaultVisualization,
  newVisualization,
  VisualizationType,
} from "@redash/viz/lib";
import { Renderer, Editor } from "@/components/visualizations/visualizationComponents";

import "./EditVisualizationDialog.less";

function updateQueryVisualizations(query: any, visualization: any) {
  // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
  const index = findIndex(query.visualizations, v => v.id === visualization.id);
  if (index > -1) {
    query.visualizations[index] = visualization;
  } else {
    // new visualization
    query.visualizations.push(visualization);
  }
  query.visualizations = [...query.visualizations]; // clone array
}

function saveVisualization(visualization: any) {
  if (visualization.id) {
    recordEvent("update", "visualization", visualization.id, { type: visualization.type });
  } else {
    recordEvent("create", "visualization", null, { type: visualization.type });
  }

  return Visualization.save(visualization)
    .then(result => {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
      notification.success("Visualization saved");
      return result;
    })
    .catch(error => {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
      notification.error("Visualization could not be saved");
      return Promise.reject(error);
    });
}

function confirmDialogClose(isDirty: any) {
  return new Promise((resolve, reject) => {
    if (isDirty) {
      Modal.confirm({
        title: "Visualization Editor",
        content: "Are you sure you want to close the editor without saving?",
        okText: "Yes",
        cancelText: "No",
        // @ts-expect-error ts-migrate(2794) FIXME: Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
        onOk: () => resolve(),
        onCancel: () => reject(),
      });
    } else {
      // @ts-expect-error ts-migrate(2794) FIXME: Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
      resolve();
    }
  });
}

type OwnProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    query: any;
    visualization?: VisualizationType;
    queryResult: any;
};

type Props = OwnProps & typeof EditVisualizationDialog.defaultProps;

function EditVisualizationDialog({ dialog, visualization, query, queryResult }: Props) {
  const errorHandlerRef = useRef();

  const isNew = !visualization;

  const data = useQueryResultData(queryResult);
  const [filters, setFilters] = useState(data.filters);

  const filteredData = useMemo(
    () => ({
      columns: data.columns,
      rows: filterData(data.rows, filters),
    }),
    [data, filters]
  );

  const defaultState = useMemo(() => {
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const config = visualization ? registeredVisualizations[visualization.type] : getDefaultVisualization();
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'options' does not exist on type 'never'.
    const options = config.getOptions(isNew ? {} : visualization.options, data);
    return {
      type: config.type,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'name' does not exist on type 'never'.
      name: isNew ? config.name : visualization.name,
      options,
      originalOptions: options,
    };
  }, [data, isNew, visualization]);

  const [type, setType] = useState(defaultState.type);
  const [name, setName] = useState(defaultState.name);
  const [nameChanged, setNameChanged] = useState(false);
  const [options, setOptions] = useState(defaultState.options);

  const [saveInProgress, setSaveInProgress] = useState(false);

  useEffect(() => {
    if (errorHandlerRef.current) {
      // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
      errorHandlerRef.current.reset();
    }
  }, [data, options]);

  function onTypeChanged(newType: any) {
    setType(newType);

    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const config = registeredVisualizations[newType];
    if (!nameChanged) {
      setName(config.name);
    }

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'options' does not exist on type 'never'.
    setOptions(config.getOptions(isNew ? {} : visualization.options, data));
  }

  function onNameChanged(newName: any) {
    setName(newName);
    setNameChanged(newName !== name);
  }

  function onOptionsChanged(newOptions: any) {
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const config = registeredVisualizations[type];
    setOptions(config.getOptions(newOptions, data));
  }

  function save() {
    setSaveInProgress(true);
    let visualizationOptions = options;
    if (type === "TABLE") {
      visualizationOptions = omit(visualizationOptions, ["paginationSize"]);
    }

    const visualizationData = extend(newVisualization(type), visualization, {
      name,
      options: visualizationOptions,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'never'.
      query_id: query.id,
    });
    saveVisualization(visualizationData).then(savedVisualization => {
      updateQueryVisualizations(query, savedVisualization);
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'close' does not exist on type 'never'.
      dialog.close(savedVisualization);
    });
  }

  function dismiss() {
    const optionsChanged = !isEqual(options, defaultState.originalOptions);
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dismiss' does not exist on type 'never'.
    confirmDialogClose(nameChanged || optionsChanged).then(dialog.dismiss);
  }

  // When editing existing visualization chart type selector is disabled, so add only existing visualization's
  // descriptor there (to properly render the component). For new visualizations show all types except of deprecated
  const availableVisualizations = isNew
    ? // @ts-expect-error ts-migrate(2339) FIXME: Property 'isDeprecated' does not exist on type 'ne... Remove this comment to see the full error message
                filter(sortBy(registeredVisualizations, ["name"]), vis => !vis.isDeprecated)
    : pick(registeredVisualizations, [type]);

  return (
    <Modal
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'props' does not exist on type 'never'.
      {...dialog.props}
      wrapClassName="ant-modal-fullscreen"
      title="Visualization Editor"
      okText="Save"
      okButtonProps={{
        loading: saveInProgress,
        disabled: saveInProgress,
      }}
      onOk={save}
      onCancel={dismiss}
      wrapProps={{ "data-test": "EditVisualizationDialog" }}>
      <div className="edit-visualization-dialog">
        <div className="visualization-settings">
          <div className="m-b-15">
            <label htmlFor="visualization-type">Visualization Type</label>
            <Select
              data-test="VisualizationType"
              id="visualization-type"
              className="w-100"
              disabled={!isNew}
              value={type}
              onChange={onTypeChanged}>
              {map(availableVisualizations, vis => (
                // @ts-expect-error ts-migrate(2741) FIXME: Property 'value' is missing in type '{ children: a... Remove this comment to see the full error message
                <Select.Option key={vis.type} data-test={"VisualizationType." + vis.type}>
                  {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'name' does not exist on type 'never'. */}
                  {vis.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="m-b-15">
            <label htmlFor="visualization-name">Visualization Name</label>
            <Input
              data-test="VisualizationName"
              id="visualization-name"
              className="w-100"
              value={name}
              onChange={event => onNameChanged(event.target.value)}
            />
          </div>
          <div data-test="VisualizationEditor">
            <Editor
              type={type}
              data={data}
              options={options}
              visualizationName={name}
              onOptionsChange={onOptionsChanged}
            />
          </div>
        </div>
        <div className="visualization-preview">
          <label htmlFor="visualization-preview" className="invisible hidden-xs">
            Preview
          </label>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<any>' is not assignable to type '((... Remove this comment to see the full error message */}
          <Filters filters={filters} onChange={setFilters} />
          <div className="scrollbox" data-test="VisualizationPreview">
            <Renderer
              type={type}
              data={filteredData}
              options={options}
              visualizationName={name}
              onOptionsChange={onOptionsChanged}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

EditVisualizationDialog.defaultProps = {
  visualization: null,
};

export default wrapDialog(EditVisualizationDialog);
