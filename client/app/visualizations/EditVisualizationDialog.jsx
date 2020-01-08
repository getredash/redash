import { isEqual, extend, map, sortBy, findIndex, filter, pick } from "lodash";
import React, { useState, useMemo, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import Modal from "antd/lib/modal";
import Select from "antd/lib/select";
import Input from "antd/lib/input";
import * as Grid from "antd/lib/grid";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import ErrorBoundary, { ErrorMessage } from "@/components/ErrorBoundary";
import Filters, { filterData } from "@/components/Filters";
import notification from "@/services/notification";
import { Visualization } from "@/services/visualization";
import recordEvent from "@/services/recordEvent";

// ANGULAR_REMOVE_ME Remove when all visualizations will be migrated to React
import { cleanAngularProps } from "@/lib/utils";
import useQueryResult from "@/lib/hooks/useQueryResult";

import { VisualizationType, registeredVisualizations, getDefaultVisualization, newVisualization } from "./index";

function updateQueryVisualizations(query, visualization) {
  const index = findIndex(query.visualizations, v => v.id === visualization.id);
  if (index > -1) {
    query.visualizations[index] = visualization;
  } else {
    // new visualization
    query.visualizations.push(visualization);
  }
  query.visualizations = [...query.visualizations]; // clone array
}

function saveVisualization(visualization) {
  if (visualization.id) {
    recordEvent("update", "visualization", visualization.id, { type: visualization.type });
  } else {
    recordEvent("create", "visualization", null, { type: visualization.type });
  }

  return Visualization.save(visualization)
    .$promise.then(result => {
      notification.success("Visualization saved");
      return result;
    })
    .catch(error => {
      notification.error("Visualization could not be saved");
      return Promise.reject(error);
    });
}

function confirmDialogClose(isDirty) {
  return new Promise((resolve, reject) => {
    if (isDirty) {
      Modal.confirm({
        title: "Visualization Editor",
        content: "Are you sure you want to close the editor without saving?",
        okText: "Yes",
        cancelText: "No",
        onOk: () => resolve(),
        onCancel: () => reject(),
      });
    } else {
      resolve();
    }
  });
}

function EditVisualizationDialog({ dialog, visualization, query, queryResult }) {
  const errorHandlerRef = useRef();

  const isNew = !visualization;

  const data = useQueryResult(queryResult);
  const [filters, setFilters] = useState(data.filters);

  const filteredData = useMemo(
    () => ({
      columns: data.columns,
      rows: filterData(data.rows, filters),
    }),
    [data, filters]
  );

  const defaultState = useMemo(() => {
    const config = visualization ? registeredVisualizations[visualization.type] : getDefaultVisualization();
    const options = config.getOptions(isNew ? {} : visualization.options, data);
    return {
      type: config.type,
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
      errorHandlerRef.current.reset();
    }
  }, [data, options]);

  function onTypeChanged(newType) {
    setType(newType);

    const config = registeredVisualizations[newType];
    if (!nameChanged) {
      setName(config.name);
    }

    setOptions(config.getOptions(isNew ? {} : visualization.options, data));
  }

  function onNameChanged(newName) {
    setName(newName);
    setNameChanged(newName !== name);
  }

  function onOptionsChanged(newOptions) {
    const config = registeredVisualizations[type];
    setOptions(config.getOptions(newOptions, data));
  }

  function save() {
    setSaveInProgress(true);
    const visualizationData = extend(newVisualization(type), visualization, { name, options, query_id: query.id });
    saveVisualization(visualizationData).then(savedVisualization => {
      updateQueryVisualizations(query, savedVisualization);
      dialog.close(savedVisualization);
    });
  }

  function dismiss() {
    const optionsChanged = !isEqual(cleanAngularProps(options), defaultState.originalOptions);
    confirmDialogClose(nameChanged || optionsChanged).then(dialog.dismiss);
  }

  const { Renderer, Editor } = registeredVisualizations[type];

  // When editing existing visualization chart type selector is disabled, so add only existing visualization's
  // descriptor there (to properly render the component). For new visualizations show all types except of deprecated
  const availableVisualizations = isNew
    ? filter(sortBy(registeredVisualizations, ["name"]), vis => !vis.isDeprecated)
    : pick(registeredVisualizations, [type]);

  return (
    <Modal
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
      <Grid.Row gutter={24}>
        <Grid.Col span={24} md={10}>
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
                <Select.Option key={vis.type} data-test={"VisualizationType." + vis.type}>
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
            <Editor data={data} options={options} visualizationName={name} onOptionsChange={onOptionsChanged} />
          </div>
        </Grid.Col>
        <Grid.Col span={24} md={14}>
          <label htmlFor="visualization-preview" className="invisible hidden-xs">
            Preview
          </label>
          <Filters filters={filters} onChange={setFilters} />
          <div className="scrollbox" data-test="VisualizationPreview">
            <ErrorBoundary
              ref={errorHandlerRef}
              renderError={() => <ErrorMessage>Error while rendering visualization.</ErrorMessage>}>
              <Renderer
                data={filteredData}
                options={options}
                visualizationName={name}
                onOptionsChange={onOptionsChanged}
                context="query"
              />
            </ErrorBoundary>
          </div>
        </Grid.Col>
      </Grid.Row>
    </Modal>
  );
}

EditVisualizationDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  visualization: VisualizationType,
  queryResult: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

EditVisualizationDialog.defaultProps = {
  visualization: null,
};

export default wrapDialog(EditVisualizationDialog);
