import { debounce, each, values, map, includes, first, identity } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import Modal from 'antd/lib/modal';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import { BigMessage } from '@/components/BigMessage';
import highlight from '@/lib/highlight';
import {
  MappingType,
  ParameterMappingListInput,
  editableMappingsToParameterMappings,
  synchronizeWidgetTitles,
} from '@/components/ParameterMappingInput';
import { QueryTagsControl } from '@/components/tags-control/TagsControl';

import { toastr } from '@/services/ng';
import { Widget } from '@/services/widget';
import { Query } from '@/services/query';

const { Option, OptGroup } = Select;

class AddWidgetDialog extends React.Component {
  static propTypes = {
    dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    dialog: DialogPropType.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      saveInProgress: false,
      selectedQuery: null,
      searchTerm: '',
      highlightSearchTerm: false,
      recentQueries: [],
      queries: [],
      selectedVis: null,
      parameterMappings: [],
      isLoaded: false,
    };

    const searchQueries = debounce(this.searchQueries.bind(this), 200);
    this.onSearchTermChanged = (event) => {
      const searchTerm = event.target.value;
      this.setState({ searchTerm });
      searchQueries(searchTerm);
    };
  }

  componentDidMount() {
    Query.recent().$promise.then((items) => {
      // Don't show draft (unpublished) queries in recent queries.
      const results = items.filter(item => !item.is_draft);
      this.setState({
        recentQueries: results,
        queries: results,
        isLoaded: true,
        highlightSearchTerm: false,
      });
    });
  }

  selectQuery(queryId) {
    // Clear previously selected query (if any)
    this.setState({
      selectedQuery: null,
      selectedVis: null,
      parameterMappings: [],
    });

    if (queryId) {
      Query.get({ id: queryId }, (query) => {
        if (query) {
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
              title: '',
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
      this.setState(prevState => ({
        queries: prevState.recentQueries,
        isLoaded: true,
        highlightSearchTerm: false,
      }));
      return;
    }

    Query.query({ q: term }, (results) => {
      // If user will type too quick - it's possible that there will be
      // several requests running simultaneously. So we need to check
      // which results are matching current search term and ignore
      // outdated results.
      if (this.state.searchTerm === term) {
        this.setState({
          queries: results.results,
          isLoaded: true,
          highlightSearchTerm: true,
        });
      }
    });
  }

  selectVisualization(query, visualizationId) {
    each(query.visualizations, (visualization) => {
      if (visualization.id === visualizationId) {
        this.setState({ selectedVis: visualization });
        return false;
      }
    });
  }

  saveWidget() {
    const dashboard = this.props.dashboard;

    this.setState({ saveInProgress: true });

    const widget = new Widget({
      visualization_id: this.state.selectedVis && this.state.selectedVis.id,
      dashboard_id: dashboard.id,
      options: {
        isHidden: false,
        position: {},
        parameterMappings: editableMappingsToParameterMappings(this.state.parameterMappings),
      },
      visualization: this.state.selectedVis,
      text: '',
    });

    const position = dashboard.calculateNewWidgetPosition(widget);
    widget.options.position.col = position.col;
    widget.options.position.row = position.row;

    const widgetsToSave = [
      widget,
      ...synchronizeWidgetTitles(widget.options.parameterMappings, dashboard.widgets),
    ];

    Promise.all(map(widgetsToSave, w => w.save()))
      .then(() => {
        dashboard.widgets.push(widget);
        this.props.dialog.close();
      })
      .catch(() => {
        toastr.error('Widget can not be added');
      })
      .finally(() => {
        this.setState({ saveInProgress: false });
      });
  }

  updateParamMappings(parameterMappings) {
    this.setState({ parameterMappings });
  }

  renderQueryInput() {
    return (
      <div className="form-group">
        {!this.state.selectedQuery && (
          <input
            type="text"
            placeholder="Search a query by name"
            className="form-control"
            value={this.state.searchTerm}
            onChange={this.onSearchTermChanged}
          />
        )}
        {this.state.selectedQuery && (
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
        )}
      </div>
    );
  }

  renderSearchQueryResults() {
    const { isLoaded, queries, highlightSearchTerm, searchTerm } = this.state;

    const highlightSearchResult = highlightSearchTerm ? highlight : identity;

    return (
      <div className="scrollbox" style={{ maxHeight: '50vh' }}>
        {!isLoaded && (
          <div className="text-center">
            <BigMessage icon="fa-spinner fa-2x fa-pulse" message="Loading..." />
          </div>
        )}

        {isLoaded && (
          <div>
            {
              (queries.length === 0) &&
              <div className="text-muted">No results matching search term.</div>
            }
            {(queries.length > 0) && (
              <div className="list-group">
                {queries.map(query => (
                  <a
                    href="javascript:void(0)"
                    className={'list-group-item ' + (query.is_draft ? 'inactive' : '')}
                    key={query.id}
                    onClick={() => this.selectQuery(query.id)}
                  >
                    <div
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: highlightSearchResult(query.name, searchTerm) }}
                      style={{ display: 'inline-block' }}
                    />
                    {' '}
                    <QueryTagsControl isDraft={query.is_draft} tags={query.tags} className="inline-tags-control" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  renderVisualizationInput() {
    let visualizationGroups = {};
    if (this.state.selectedQuery) {
      each(this.state.selectedQuery.visualizations, (vis) => {
        visualizationGroups[vis.type] = visualizationGroups[vis.type] || [];
        visualizationGroups[vis.type].push(vis);
      });
    }
    visualizationGroups = values(visualizationGroups);
    return (
      <div>
        <div className="form-group">
          <label htmlFor="choose-visualization">Choose Visualization</label>
          <Select
            id="choose-visualization"
            className="w-100"
            defaultValue={first(this.state.selectedQuery.visualizations).id}
            onChange={visualizationId => this.selectVisualization(this.state.selectedQuery, visualizationId)}
            dropdownClassName="ant-dropdown-in-bootstrap-modal"
          >
            {visualizationGroups.map(visualizations => (
              <OptGroup label={visualizations[0].type} key={visualizations[0].type}>
                {visualizations.map(visualization => (
                  <Option value={visualization.id} key={visualization.id}>{visualization.name}</Option>
                ))}
              </OptGroup>
            ))}
          </Select>
        </div>
      </div>
    );
  }

  render() {
    const existingParams = this.props.dashboard.getParametersDefs();
    const { dialog } = this.props;

    return (
      <Modal
        {...dialog.props}
        title="Add Widget"
        onOk={() => this.saveWidget()}
        okButtonProps={{
          loading: this.state.saveInProgress,
          disabled: !this.state.selectedQuery,
        }}
        okText="Add to Dashboard"
        width={700}
      >
        {this.renderQueryInput()}
        {!this.state.selectedQuery && this.renderSearchQueryResults()}
        {this.state.selectedQuery && this.renderVisualizationInput()}

        {
          (this.state.parameterMappings.length > 0) && [
            <label key="parameters-title" htmlFor="parameter-mappings">Parameters</label>,
            <ParameterMappingListInput
              key="parameters-list"
              id="parameter-mappings"
              mappings={this.state.parameterMappings}
              existingParams={existingParams}
              onChange={mappings => this.updateParamMappings(mappings)}
            />,
          ]
        }
      </Modal>
    );
  }
}

export default wrapDialog(AddWidgetDialog);
