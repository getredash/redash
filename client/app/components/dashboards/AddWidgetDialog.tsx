import { map, includes, groupBy, first, find } from "lodash";
import React, { useState, useMemo, useCallback } from "react";
import Select from "antd/lib/select";
import Modal from "antd/lib/modal";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import { MappingType, ParameterMappingListInput } from "@/components/ParameterMappingInput";
import QuerySelector from "@/components/QuerySelector";
import notification from "@/services/notification";
import { Query } from "@/services/query";
type OwnVisualizationSelectProps = {
    query?: any;
    visualization?: any;
    onChange?: (...args: any[]) => any;
};
type VisualizationSelectProps = OwnVisualizationSelectProps & typeof VisualizationSelect.defaultProps;
function VisualizationSelect({ query, visualization, onChange }: VisualizationSelectProps) {
    const visualizationGroups = useMemo(() => {
        return query ? groupBy(query.visualizations, "type") : {};
    }, [query]);
    const handleChange = useCallback(visualizationId => {
        const selectedVisualization = query ? find(query.visualizations, { id: visualizationId }) : null;
        onChange(selectedVisualization || null);
    }, [query, onChange]);
    if (!query) {
        return null;
    }
    return (<div>
      <div className="form-group">
        <label htmlFor="choose-visualization">Choose Visualization</label>
        <Select id="choose-visualization" className="w-100" value={visualization ? visualization.id : undefined} onChange={handleChange}>
          {map(visualizationGroups, (visualizations, groupKey) => (<Select.OptGroup key={groupKey} label={groupKey}>
              {map(visualizations, visualization => (<Select.Option key={`${visualization.id}`} value={visualization.id}>
                  {visualization.name}
                </Select.Option>))}
            </Select.OptGroup>))}
        </Select>
      </div>
    </div>);
}
VisualizationSelect.defaultProps = {
    query: null,
    visualization: null,
    onChange: () => { },
};
type AddWidgetDialogProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    dashboard: any;
};
function AddWidgetDialog({ dialog, dashboard }: AddWidgetDialogProps) {
    const [selectedQuery, setSelectedQuery] = useState(null);
    const [selectedVisualization, setSelectedVisualization] = useState(null);
    const [parameterMappings, setParameterMappings] = useState([]);
    const selectQuery = useCallback(queryId => {
        // Clear previously selected query (if any)
        setSelectedQuery(null);
        setSelectedVisualization(null);
        setParameterMappings([]);
        if (queryId) {
            (Query as any).get({ id: queryId }).then((query: any) => {
                if (query) {
                    const existingParamNames = map(dashboard.getParametersDefs(), param => param.name);
                    setSelectedQuery(query);
                    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ name: any; type: string; mapTo... Remove this comment to see the full error message
                    setParameterMappings(map(query.getParametersDefs(), param => ({
                        name: param.name,
                        type: includes(existingParamNames, param.name)
                            ? MappingType.DashboardMapToExisting
                            : MappingType.DashboardAddNew,
                        mapTo: param.name,
                        value: param.normalizedValue,
                        title: "",
                        param,
                    })));
                    if (query.visualizations.length > 0) {
                        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '((prevState: null) => null) | nu... Remove this comment to see the full error message
                        setSelectedVisualization(first(query.visualizations));
                    }
                }
            });
        }
    }, [dashboard]);
    const saveWidget = useCallback(() => {
        dialog.close({ visualization: selectedVisualization, parameterMappings }).catch(() => {
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
            notification.error("Widget could not be added");
        });
    }, [dialog, selectedVisualization, parameterMappings]);
    const existingParams = dashboard.getParametersDefs();
    return (<Modal {...dialog.props} title="Add Widget" onOk={saveWidget} okButtonProps={{
        ...dialog.props.okButtonProps,
        disabled: !selectedQuery || dialog.props.okButtonProps.disabled,
    }} okText="Add to Dashboard" width={700}>
      <div data-test="AddWidgetDialog">
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(query: any) => void' is not assignable to t... Remove this comment to see the full error message */}
        <QuerySelector onChange={(query: any) => selectQuery(query ? query.id : null)}/>

        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message */}
        {selectedQuery && (<VisualizationSelect query={selectedQuery} visualization={selectedVisualization} onChange={setSelectedVisualization}/>)}

        {parameterMappings.length > 0 && [
        <label key="parameters-title" htmlFor="parameter-mappings">
            Parameters
          </label>,
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
        <ParameterMappingListInput key="parameters-list" id="parameter-mappings" mappings={parameterMappings} existingParams={existingParams} onChange={setParameterMappings}/>,
    ]}
      </div>
    </Modal>);
}
export default wrapDialog(AddWidgetDialog);
