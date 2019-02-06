import { map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import {
  ParameterMappingListInput,
  parameterMappingsToEditableMappings,
  editableMappingsToParameterMappings,
} from '@/components/ParameterMappingInput';

class EditParameterMappingsDialog extends React.Component {
  static propTypes = {
    dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    dialog: DialogPropType.isRequired,
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
        this.props.dialog.close();
      })
      .catch(() => {
        toastr.error('Widget cannot be updated');
      })
      .finally(() => {
        this.setState({ saveInProgress: false });
      });
  }

  updateParamMappings(parameterMappings) {
    this.setState({ parameterMappings });
  }

  render() {
    const { dialog } = this.props;
    return (
      <Modal
        {...dialog.props}
        title="Parameters"
        onOk={() => this.saveWidget()}
        okButtonProps={{ loading: this.state.saveInProgress }}
        width={700}
      >
        {(this.state.parameterMappings.length > 0) && (
          <ParameterMappingListInput
            mappings={this.state.parameterMappings}
            existingParams={this.props.dashboard.getParametersDefs()}
            onChange={mappings => this.updateParamMappings(mappings)}
          />
        )}
      </Modal>
    );
  }
}

export default wrapDialog(EditParameterMappingsDialog);
