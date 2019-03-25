import { isEqual, extend, map, findIndex, cloneDeep } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import * as Grid from 'antd/lib/grid';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import notification from '@/services/notification';
import { Visualization } from '@/services/visualization';
import recordEvent from '@/services/recordEvent';

// ANGULAR_REMOVE_ME Remove when all visualizations will be migrated to React
import { cleanAngularProps, createPromiseHandler } from '@/lib/utils';

import {
  VisualizationType, registeredVisualizations,
  getDefaultVisualization, newVisualization,
} from './index';

class EditVisualizationDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    visualization: VisualizationType,
    queryResult: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    visualization: null,
  };

  handleQueryResult = createPromiseHandler(
    queryResult => queryResult.toPromise(),
    () => {
      this.setState(({ isNew, type }) => {
        const config = registeredVisualizations[type];

        const { queryResult, visualization } = this.props;
        const data = {
          columns: queryResult ? queryResult.getColumns() : [],
          rows: queryResult ? queryResult.getData() : [],
        };

        const options = config.getOptions(isNew ? {} : visualization.options, data);

        this._originalOptions = cloneDeep(options);

        return { isLoading: false, data, options };
      });
    },
  );

  constructor(props) {
    super(props);

    const { visualization } = this.props;

    const isNew = !visualization;

    const config = isNew ? getDefaultVisualization()
      : registeredVisualizations[visualization.type];

    this.state = {
      isLoading: true,

      isNew, // eslint-disable-line
      data: { columns: [], rows: [] },
      options: {},

      type: config.type,
      canChangeType: isNew, // cannot change type when editing existing visualization
      name: isNew ? config.name : visualization.name,
      nameChanged: false,

      saveInProgress: false,
    };
  }

  componentWillUnmount() {
    this.handleQueryResult.cancel();
  }

  setVisualizationType(type) {
    this.setState(({ isNew, name, nameChanged, data }) => {
      const { visualization } = this.props;
      const config = registeredVisualizations[type];
      const options = config.getOptions(isNew ? {} : visualization.options, data);
      return {
        type,
        name: nameChanged ? name : config.name,
        options,
      };
    });
  }

  setVisualizationName(name) {
    this.setState({
      name,
      nameChanged: true,
    });
  }

  setVisualizationOptions = (options) => {
    this.setState(({ type, data }) => {
      const config = registeredVisualizations[type];
      return {
        options: config.getOptions(options, data),
      };
    });
  };

  dismiss() {
    const { nameChanged, options } = this.state;

    const optionsChanged = !isEqual(cleanAngularProps(options), this._originalOptions);
    if (nameChanged || optionsChanged) {
      Modal.confirm({
        title: 'Visualization Editor',
        content: 'Are you sure you want to close the editor without saving?',
        okText: 'Yes',
        cancelText: 'No',
        onOk: () => {
          this.props.dialog.dismiss();
        },
      });
    } else {
      this.props.dialog.dismiss();
    }
  }

  save() {
    const { query } = this.props;
    const { type, name, options } = this.state;

    const visualization = extend({}, newVisualization(type), this.props.visualization);

    visualization.name = name;
    visualization.options = options;
    visualization.query_id = query.id;

    if (visualization.id) {
      recordEvent('update', 'visualization', visualization.id, { type: visualization.type });
    } else {
      recordEvent('create', 'visualization', null, { type: visualization.type });
    }

    this.setState({ saveInProgress: true });

    Visualization.save(visualization).$promise
      .then((result) => {
        notification.success('Visualization saved');

        const index = findIndex(query.visualizations, v => v.id === result.id);
        if (index > -1) {
          query.visualizations[index] = result;
        } else {
          // new visualization
          query.visualizations.push(result);
        }
        this.props.dialog.close(result);
      })
      .catch(() => {
        notification.error('Visualization could not be saved');
        this.setState({ saveInProgress: false });
      });
  }

  render() {
    this.handleQueryResult(this.props.queryResult);

    if (this.state.isLoading) {
      return null;
    }

    const { dialog } = this.props;
    const { type, name, data, options, canChangeType, saveInProgress } = this.state;

    const { Renderer, Editor } = registeredVisualizations[type];

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
        onOk={() => this.save()}
        onCancel={() => this.dismiss()}
      >
        <div data-test="EditVisualizationDialog">
          <Grid.Row gutter={24}>
            <Grid.Col span={24} md={10}>
              <div className="m-b-15">
                <label htmlFor="visualization-type">Visualization Type</label>
                <Select
                  data-test="VisualizationType"
                  id="visualization-type"
                  className="w-100"
                  disabled={!canChangeType}
                  value={type}
                  onChange={t => this.setVisualizationType(t)}
                >
                  {map(
                    registeredVisualizations,
                    vis => <Select.Option key={vis.type}>{vis.name}</Select.Option>,
                  )}
                </Select>
              </div>
              <div className="m-b-15">
                <label htmlFor="visualization-name">Visualization Name</label>
                <Input
                  data-test="VisualizationName"
                  id="visualization-name"
                  className="w-100"
                  value={name}
                  onChange={event => this.setVisualizationName(event.target.value)}
                />
              </div>
              <div>
                <Editor
                  data={data}
                  options={options}
                  visualizationName={name}
                  onOptionsChange={this.setVisualizationOptions}
                />
              </div>
            </Grid.Col>
            <Grid.Col span={24} md={14}>
              <label htmlFor="visualization-preview" className="invisible hidden-xs">Preview</label>
              <div className="scrollbox">
                <Renderer
                  data={data}
                  options={options}
                  visualizationName={name}
                  onOptionsChange={this.setVisualizationOptions}
                />
              </div>
            </Grid.Col>
          </Grid.Row>
        </div>
      </Modal>
    );
  }
}

export default wrapDialog(EditVisualizationDialog);
