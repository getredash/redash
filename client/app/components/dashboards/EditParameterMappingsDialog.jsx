import { map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import { react2angular } from 'react2angular';
import {
  ParameterMappingListInput,
  parameterMappingsToEditableMappings,
  editableMappingsToParameterMappings,
} from '@/components/ParameterMappingInput';

class EditParameterMappingsDialog extends React.Component {
  static propTypes = {
    dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    onClose: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
  };
  constructor(props) {
    super(props);
    this.state = {
      saveInProgress: false,
      parameterMappings: parameterMappingsToEditableMappings(
        props.widget.options.parameterMappings,
        props.widget.query.getParametersDefs(),
        map(this.props.dashboard.getParametersDefs(), p => p.name),
      ),
      showModal: true,
    };
  }

  saveWidget() {
    const toastr = this.props.toastr; // eslint-disable-line react/prop-types
    const widget = this.props.widget;

    this.setState({ saveInProgress: true });

    widget.options.parameterMappings = editableMappingsToParameterMappings(this.state.parameterMappings);
    widget
      .save()
      .then(() => {
        this.props.onChange();
        this.close();
      })
      .catch(() => {
        toastr.error('Widget cannot be updated');
      })
      .finally(() => {
        this.setState({ saveInProgress: false });
      });
  }

  close = () => {
    this.setState({ showModal: false });
  }

  updateParamMappings(parameterMappings) {
    this.setState({ parameterMappings });
  }

  render() {
    const existingParams = map(
      this.props.dashboard.getParametersDefs(),
      ({ name, type }) => ({ name, type }),
    );

    return (
      <Modal
        visible={this.state.showModal}
        afterClose={this.props.onClose}
        title="Parameters"
        onOk={() => this.saveWidget()}
        okButtonProps={{ loading: this.state.saveInProgress }}
        onCancel={this.close}
      >
        {(this.state.parameterMappings.length > 0) && (
          <ParameterMappingListInput
            mappings={this.state.parameterMappings}
            existingParams={existingParams}
            onChange={mappings => this.updateParamMappings(mappings)}
          />
        )}
      </Modal>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('editParameterMappingsDialog', react2angular(EditParameterMappingsDialog));
}

init.init = true;
