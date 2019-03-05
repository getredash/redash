import { isEqual, extend, map, findIndex, cloneDeep } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import {
  VisualizationType, registeredVisualizations,
  getDefaultVisualization, newVisualization,
} from './index';

import { toastr } from '@/services/ng';
import { Visualization } from '@/services/visualization';
import recordEvent from '@/services/recordEvent';

// ANGULAR_REMOVE_ME Remove when all visualizations will be migrated to React
import { cleanAngularProps, createPromiseHandler } from '@/lib/utils';

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
    this.setState({ options: extend({}, options) });
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
        toastr.success('Visualization saved');

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
        toastr.error('Visualization could not be saved');
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

    const { Renderer, Editor, getOptions } = registeredVisualizations[type];

    const previewOptions = getOptions(options, data);

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
        <div className="row">
          <div className="col-md-5">
            <div className="m-b-15">
              <label htmlFor="visualization-type">Visualization Type</label>
              <Select
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
          </div>
          <div className="col-md-7">
            <label htmlFor="visualization-preview" className="invisible">Preview</label>
            <Renderer
              data={data}
              options={previewOptions}
              visualizationName={name}
              onOptionsChange={this.setVisualizationOptions}
            />
          </div>
        </div>
      </Modal>
    );
  }
}

export default wrapDialog(EditVisualizationDialog);
