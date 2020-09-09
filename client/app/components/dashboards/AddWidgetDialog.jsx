import { map, includes, groupBy, first, find } from "lodash";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import Select from "antd/lib/select";
import Modal from "antd/lib/modal";
import Checkbox from "antd/lib/checkbox";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import { MappingType, ParameterMappingListInput } from "@/components/ParameterMappingInput";
import QuerySelector from "@/components/QuerySelector";
import notification from "@/services/notification";
import { Query } from "@/services/query";
import { Dashboard } from "@/services/dashboard";
import useSearchResults from "@/lib/hooks/useSearchResults";

function queryDashboard() {
  return Dashboard.query({ page_size: 100 })
    .then(({ results }) => results)
    .catch(() => []);
}

function SubDashboardSelect(props) {
  // const [searchTerm, setSearchTerm] = useState("");
  const [doSearch, searchResults] = useSearchResults(queryDashboard, { initialResults: [] });
  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const placeholder = "Select sub-dashboard";

  const handleSelectSubDashboard = slug => {
    props.onChange(slug);
  };

  return (
    <div>
      <div className="form-group">
        {/* <label htmlFor="choose-visualization">Choose sub dashboard</label> */}
        <Select
          onChange={handleSelectSubDashboard}
          placeholder={placeholder}
          id="choose-sub-dashboard"
          className="w-100"
          allowClear={true}>
          {searchResults &&
            searchResults.map(q => {
              const disabled = q.slug === props.currentDashboard;
              return (
                <Select.Option
                  disabled={disabled}
                  value={q.id + "-" + q.slug}
                  key={q.id}
                  className="sub-dashboard-result">
                  {q.name}
                </Select.Option>
              );
            })}
        </Select>
      </div>
    </div>
  );
}

function VisualizationSelect({ query, visualization, onChange }) {
  const visualizationGroups = useMemo(() => {
    return query ? groupBy(query.visualizations, "type") : {};
  }, [query]);

  const handleChange = useCallback(
    visualizationId => {
      const selectedVisualization = query ? find(query.visualizations, { id: visualizationId }) : null;
      onChange(selectedVisualization || null);
    },
    [query, onChange]
  );

  if (!query) {
    return null;
  }

  return (
    <div>
      <div className="form-group">
        <label htmlFor="choose-visualization">Choose Visualization</label>
        <Select
          id="choose-visualization"
          className="w-100"
          value={visualization ? visualization.id : undefined}
          onChange={handleChange}>
          {map(visualizationGroups, (visualizations, groupKey) => (
            <Select.OptGroup key={groupKey} label={groupKey}>
              {map(visualizations, visualization => (
                <Select.Option key={`${visualization.id}`} value={visualization.id}>
                  {visualization.name}
                </Select.Option>
              ))}
            </Select.OptGroup>
          ))}
        </Select>
      </div>
    </div>
  );
}

VisualizationSelect.propTypes = {
  query: PropTypes.object,
  visualization: PropTypes.object,
  onChange: PropTypes.func,
};

VisualizationSelect.defaultProps = {
  query: null,
  visualization: null,
  onChange: () => {},
};

function AddWidgetDialog({ dialog, dashboard }) {
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [selectedVisualization, setSelectedVisualization] = useState(null);
  const [parameterMappings, setParameterMappings] = useState([]);
  const [selectedSubDashboard, setSelectedSubDashboard] = useState("");
  const [subDashboardSlug, setSubDashboardSlug] = useState("");

  const selectQuery = useCallback(
    queryId => {
      // Clear previously selected query (if any)
      setSelectedQuery(null);
      setSelectedVisualization(null);
      setParameterMappings([]);

      if (queryId) {
        Query.get({ id: queryId }).then(query => {
          if (query) {
            const existingParamNames = map(dashboard.getParametersDefs(), param => param.name);
            setSelectedQuery(query);
            setParameterMappings(
              map(query.getParametersDefs(), param => ({
                name: param.name,
                type: includes(existingParamNames, param.name)
                  ? MappingType.DashboardMapToExisting
                  : MappingType.DashboardAddNew,
                mapTo: param.name,
                value: param.normalizedValue,
                title: "",
                param,
              }))
            );
            if (query.visualizations.length > 0) {
              setSelectedVisualization(first(query.visualizations));
            }
          }
        });
      }
    },
    [dashboard]
  );

  const saveWidget = useCallback(() => {
    dialog.close({ visualization: selectedVisualization, parameterMappings, subDashboardSlug }).catch(() => {
      notification.error("Widget could not be added");
    });
  }, [dialog, selectedVisualization, parameterMappings, subDashboardSlug]);

  const existingParams = dashboard.getParametersDefs();

  // console.log(dashboard);
  const handleCheckBoxChange = e => {
    // console.log(e.target.checked);
    setSelectedSubDashboard(e.target.checked);
    if (!e.target.checked) {
      setSubDashboardSlug("");
    }
  };

  const selectSubDashboard = slug => {
    setSubDashboardSlug(slug ? slug : "");
  };

  const handleVizChange = item => {
    setSelectedVisualization(item);
    setSelectedSubDashboard(false);
    setSubDashboardSlug("");
  };

  return (
    <Modal
      {...dialog.props}
      title="Add Widget"
      onOk={saveWidget}
      okButtonProps={{
        ...dialog.props.okButtonProps,
        disabled: !selectedQuery || dialog.props.okButtonProps.disabled,
      }}
      okText="Add to Dashboard"
      width={700}>
      <div data-test="AddWidgetDialog">
        <QuerySelector onChange={query => selectQuery(query ? query.id : null)} />

        {selectedQuery && (
          <VisualizationSelect query={selectedQuery} visualization={selectedVisualization} onChange={handleVizChange} />
        )}

        {parameterMappings.length > 0 && [
          <label key="parameters-title" htmlFor="parameter-mappings">
            Parameters
          </label>,
          <ParameterMappingListInput
            key="parameters-list"
            id="parameter-mappings"
            mappings={parameterMappings}
            existingParams={existingParams}
            onChange={setParameterMappings}
          />,
        ]}

        {selectedQuery && selectedVisualization && selectedVisualization.type === "CHART" && (
          <Checkbox style={{ marginBottom: "10px" }} onChange={handleCheckBoxChange}>
            Select sub dashboard
          </Checkbox>
        )}

        {selectedSubDashboard && <SubDashboardSelect currentDashboard={dashboard.slug} onChange={selectSubDashboard} />}
      </div>
    </Modal>
  );
}

AddWidgetDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  dashboard: PropTypes.object.isRequired,
};

export default wrapDialog(AddWidgetDialog);
