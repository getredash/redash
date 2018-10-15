import { debounce, each, extend, values, map, fromPairs, includes } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import highlight from '@/lib/highlight';
import { ParameterValueInput } from '@/components/ParameterValueInput';

class AddWidgetDialog extends React.Component {
  static MappingType = {
    DashboardAddNew: 'dashboard-add-new',
    DashboardMapToExisting: 'dashboard-map-to-existing',
    WidgetLevel: 'widget-level',
    StaticValue: 'static-value',
  };

  static propTypes = {
    dashboard: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    close: PropTypes.func,
    dismiss: PropTypes.func,
  };

  static defaultProps = {
    dashboard: null,
    close: () => {},
    dismiss: () => {},
  };

  constructor(props) {
    super(props);
    this.state = {
      saveInProgress: false,
      selectedQuery: null,
      searchTerm: '',
      recentQueries: [],
      searchedQueries: [],
      selectedVis: null,
      parameterMappings: [],
    };

    // Don't show draft (unpublished) queries
    const Query = this.props.Query; // eslint-disable-line react/prop-types
    Query.recent().$promise.then((items) => {
      this.setState({
        recentQueries: items.filter(item => !item.is_draft),
      });
    });

    const searchQueries = debounce(this.searchQueries.bind(this), 200);
    this.onSearchTermChanged = (event) => {
      const searchTerm = event.target.value;
      this.setState({ searchTerm });
      searchQueries(searchTerm);
    };
  }

  selectQuery(queryId) {
    // Clear previously selected query (if any)
    this.setState({
      selectedQuery: null,
      selectedVis: null,
      parameterMappings: [],
    });

    if (queryId) {
      const Query = this.props.Query; // eslint-disable-line react/prop-types
      Query.get({ id: queryId }, (query) => {
        if (query) {
          const MappingType = AddWidgetDialog.MappingType;
          const existingParamNames = map(
            this.props.dashboard.getParametersDefs(),
            param => param.name,
          );
          this.setState({
            selectedQuery: query,
            parameterMappings: map(query.getParametersDefs(), param => ({
              name: param.name,
              type: includes(existingParamNames, param.name)
                ? MappingType.DashboardMapToExisting : MappingType.DashboardAddNew,
              mapTo: param.name,
              value: param.normalizedValue,
              param,
            })),
          });
          if (query.visualizations.length) {
            this.setState({ selectedVis: query.visualizations[0] });
          }
        }
      });
    }
  }

  searchQueries(term) {
    if (!term || term.length === 0) {
      this.setState({ searchedQueries: [] });
      return;
    }

    const Query = this.props.Query; // eslint-disable-line react/prop-types
    Query.query({ q: term }, (results) => {
      // If user will type too quick - it's possible that there will be
      // several requests running simultaneously. So we need to check
      // which results are matching current search term and ignore
      // outdated results.
      if (this.state.searchTerm === term) {
        this.setState({ searchedQueries: results.results });
      }
    });
  }

  selectVisualization(query, visualizationId) {
    visualizationId = '' + visualizationId;
    each(query.visualizations, (visualization) => {
      if ('' + visualization.id === visualizationId) {
        this.setState({ selectedVis: visualization });
        return false;
      }
    });
  }

  saveWidget() {
    const Widget = this.props.Widget; // eslint-disable-line react/prop-types
    const toastr = this.props.toastr; // eslint-disable-line react/prop-types
    const dashboard = this.props.dashboard;

    this.setState({ saveInProgress: true });

    const widget = new Widget({
      visualization_id: this.state.selectedVis && this.state.selectedVis.id,
      dashboard_id: dashboard.id,
      options: {
        isHidden: false,
        position: {},
        parameterMappings: fromPairs(map( // convert to map
          this.state.parameterMappings,
          (mapping) => {
            const result = extend({}, mapping);
            switch (mapping.type) {
              case AddWidgetDialog.MappingType.DashboardAddNew:
                result.type = Widget.MappingType.DashboardLevel;
                result.value = null;
                break;
              case AddWidgetDialog.MappingType.DashboardMapToExisting:
                result.type = Widget.MappingType.DashboardLevel;
                result.value = null;
                break;
              case AddWidgetDialog.MappingType.StaticValue:
                result.type = Widget.MappingType.StaticValue;
                result.param = mapping.param.clone();
                result.param.setValue(result.value);
                result.value = result.param.value;
                break;
              case AddWidgetDialog.MappingType.WidgetLevel:
                result.type = Widget.MappingType.WidgetLevel;
                result.value = null;
                break;
              // no default
            }
            delete result.param;
            return [result.name, result];
          },
        )),
      },
      visualization: this.state.selectedVis,
      text: '',
    });

    const position = dashboard.calculateNewWidgetPosition(widget);
    widget.options.position.col = position.col;
    widget.options.position.row = position.row;

    widget
      .save()
      .then(() => {
        dashboard.widgets.push(widget);
        this.props.close();
      })
      .catch(() => {
        toastr.error('Widget can not be added');
      })
      .finally(() => {
        this.setState({ saveInProgress: false });
      });
  }

  updateParamMapping(mapping, updates) {
    extend(mapping, updates);
    this.forceUpdate();
  }

  renderMapping(mapping, existingParamNames, isFirst) {
    const MappingType = AddWidgetDialog.MappingType;
    const alreadyExists = includes(existingParamNames, mapping.mapTo);
    return (
      <div key={mapping.name} className={'row' + (isFirst ? '' : ' m-t-15')}>
        <div className="col-xs-5">
          <div className="form-control-static">{'{{ ' + mapping.name + ' }}'}</div>
        </div>
        <div className="col-xs-7">
          <div>
            <select
              className="form-control"
              value={mapping.type}
              onChange={event => this.updateParamMapping(mapping, { type: event.target.value })}
            >
              <option value={MappingType.DashboardAddNew}>Add the parameter to the dashboard</option>
              {
                (existingParamNames.length > 0) &&
                <option value={MappingType.DashboardMapToExisting}>Map to existing parameter</option>
              }
              <option value={MappingType.StaticValue}>Use static value for the parameter</option>
              <option value={MappingType.WidgetLevel}>Keep the parameter at the widget level</option>
            </select>
          </div>
          {
            (mapping.type === MappingType.DashboardAddNew) &&
            <div className={'m-t-10' + (alreadyExists ? ' has-error' : '')}>
              <input
                type="text"
                className="form-control"
                value={mapping.mapTo}
                onChange={event => this.updateParamMapping(mapping, { mapTo: event.target.value })}
              />
              { alreadyExists &&
                <div className="help-block">
                  Dashboard parameter with this name already exists
                </div>
              }
            </div>
          }
          {
            (mapping.type === MappingType.DashboardMapToExisting) &&
            <div className="m-t-10">
              <select
                className="form-control"
                value={mapping.mapTo}
                onChange={event => this.updateParamMapping(mapping, { mapTo: event.target.value })}
                disabled={existingParamNames.length === 0}
              >
                {map(existingParamNames, name => (
                  <option value={name} key={name}>{ name }</option>
                ))}
              </select>
            </div>
          }
          {
            (mapping.type === MappingType.StaticValue) &&
            <div className="m-t-10">
              <ParameterValueInput
                type={mapping.param.type}
                value={mapping.value}
                enumOptions={mapping.param.enumOptions}
                queryId={mapping.param.queryId}
                onSelect={value => this.updateParamMapping(mapping, { value })}
                clientConfig={this.props.clientConfig} // eslint-disable-line react/prop-types
                Query={this.props.Query} // eslint-disable-line react/prop-types
              />
            </div>
          }
        </div>
      </div>
    );
  }

  render() {
    let visualizationGroups = {};
    if (this.state.selectedQuery) {
      each(this.state.selectedQuery.visualizations, (vis) => {
        visualizationGroups[vis.type] = visualizationGroups[vis.type] || [];
        visualizationGroups[vis.type].push(vis);
      });
    }
    visualizationGroups = values(visualizationGroups);

    const existingParamNames = map(
      this.props.dashboard.getParametersDefs(),
      param => param.name,
    );

    return (
      <div>
        <div className="modal-header">
          <button
            type="button"
            className="close"
            disabled={this.state.saveInProgress}
            aria-hidden="true"
            onClick={this.props.dismiss}
          >
            &times;
          </button>
          <h4 className="modal-title">Add Widget</h4>
        </div>
        <div className="modal-body">
          <div className="form-group">
            {!this.state.selectedQuery && <input
              type="text"
              placeholder="Search a query by name"
              className="form-control"
              value={this.state.searchTerm}
              onChange={this.onSearchTermChanged}
            />}
            {
              this.state.selectedQuery &&
              <div className="p-relative">
                <input type="text" className="form-control bg-white" value={this.state.selectedQuery.name} readOnly />
                <a
                  href="javascript:void(0)"
                  onClick={() => this.selectQuery(null)}
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    position: 'absolute',
                    right: '1px',
                    top: '1px',
                    bottom: '1px',
                    width: '30px',
                    background: '#fff',
                    borderRadius: '3px',
                  }}
                >
                  <i className="text-muted fa fa-times" />
                </a>
              </div>
            }
          </div>

          {
            !this.state.selectedQuery &&
            <div className="scrollbox" style={{ maxHeight: '50vh' }}>
              {
                (this.state.searchTerm === '') &&
                <div>
                  {
                    this.state.recentQueries.length > 0 &&
                    <div className="list-group">
                      {this.state.recentQueries.map(query => (
                        <a
                          href="javascript:void(0)"
                          className="list-group-item"
                          key={query.id}
                          onClick={() => this.selectQuery(query.id)}
                        >
                          {query.name}
                        </a>
                      ))}
                    </div>
                  }
                </div>
              }

              {
                (this.state.searchTerm !== '') &&
                <div>
                  {
                    (this.state.searchedQueries.length === 0) &&
                    <div className="text-muted">No results matching search term.</div>
                  }
                  {
                    (this.state.searchedQueries.length > 0) &&
                    <div className="list-group">
                      {this.state.searchedQueries.map(query => (
                        <a
                          href="javascript:void(0)"
                          className="list-group-item"
                          key={query.id}
                          onClick={() => this.selectQuery(query.id)}
                          // eslint-disable-next-line react/no-danger
                          dangerouslySetInnerHTML={{ __html: highlight(query.name, this.state.searchTerm) }}
                        />
                      ))}
                    </div>
                  }
                </div>
              }
            </div>
          }

          {
            this.state.selectedQuery &&
            <div>
              <div className="form-group">
                <label>Choose Visualization</label>
                <select
                  className="form-control"
                  onChange={event => this.selectVisualization(this.state.selectedQuery, event.target.value)}
                >
                  {visualizationGroups.map(visualizations => (
                    <optgroup label={visualizations[0].type} key={visualizations[0].type}>
                      {visualizations.map(visualization => (
                        <option value={visualization.id} key={visualization.id}>{visualization.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          }

          {
            (this.state.parameterMappings.length > 0) &&
            <div>
              <label>Parameters</label>
              {this.state.parameterMappings.map((mapping, index) =>
                this.renderMapping(mapping, existingParamNames, index === 0))}
            </div>
          }
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-default"
            disabled={this.state.saveInProgress}
            onClick={this.props.dismiss}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={this.state.saveInProgress}
            onClick={() => this.saveWidget()}
          >
            Add to Dashboard
          </button>
        </div>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('addWidgetDialog', {
    template: `
      <add-widget-dialog-impl 
        dashboard="$ctrl.resolve.dashboard"
        close="$ctrl.close"
        dismiss="$ctrl.dismiss"
      ></add-widget-dialog-impl>
    `,
    bindings: {
      resolve: '<',
      close: '&',
      dismiss: '&',
    },
  });
  ngModule.component('addWidgetDialogImpl', react2angular(AddWidgetDialog, null, [
    'toastr', 'Widget', 'Query', 'clientConfig']));
}
