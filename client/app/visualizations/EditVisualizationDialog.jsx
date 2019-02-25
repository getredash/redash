import { isEqual, extend, map, findIndex, cloneDeep } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import { Visualization, registeredVisualizations, getDefaultVisualization, newVisualization } from './index';

import { toastr } from '@/services/ng';
import recordEvent from '@/services/recordEvent';

// ANGULAR_REMOVE_ME Remove when all visualizations will be migrated to React
import { cleanAngularProps } from '@/lib/utils';

class EditVisualizationDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    visualization: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    queryResult: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    visualization: null,
  };

  constructor(props) {
    super(props);

    const { visualization, queryResult } = this.props;

    const isNew = !visualization;

    const config = isNew ? getDefaultVisualization()
      : registeredVisualizations[visualization.type];

    // it's safe to use queryResult right here because while query is running -
    // all UI to access this dialog is hidden/disabled
    const data = {
      columns: queryResult.getColumns(),
      rows: queryResult.getData(),
    };

    const options = config.getOptions(isNew ? {} : visualization.options, data);

    this.state = {
      isNew, // eslint-disable-line
      data,

      type: config.type,
      canChangeType: isNew, // cannot change type when editing existing visualization
      name: isNew ? config.name : visualization.name,
      nameChanged: false,
      originalOptions: cloneDeep(options),
      options,

      saveInProgress: false,
    };
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
    const { nameChanged, options, originalOptions } = this.state;

    const optionsChanged = !isEqual(cleanAngularProps(options), originalOptions);
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

    const visualization = {
      ...extend({}, this.props.visualization),
      ...newVisualization(type),
    };

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
            <Renderer data={data} options={previewOptions} visualizationName={name} />
          </div>
        </div>
      </Modal>
    );
  }
}

export default wrapDialog(EditVisualizationDialog);
