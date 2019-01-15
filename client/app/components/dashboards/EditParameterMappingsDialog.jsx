import { map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import {
  ParameterMappingListInput,
  parameterMappingsToEditableMappings,
  editableMappingsToParameterMappings,
} from '@/components/ParameterMappingInput';

class EditParameterMappingsDialog extends React.Component {
  static propTypes = {
    dashboard: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    widget: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    close: PropTypes.func,
    dismiss: PropTypes.func,
  };

  static defaultProps = {
    dashboard: null,
    widget: null,
    close: () => {},
    dismiss: () => {},
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
        this.props.close();
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
    const clientConfig = this.props.clientConfig; // eslint-disable-line react/prop-types
    const Query = this.props.Query; // eslint-disable-line react/prop-types

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
          <h4 className="modal-title">Parameters</h4>
        </div>
        <div className="modal-body">
          {
            (this.state.parameterMappings.length > 0) &&
            <ParameterMappingListInput
              mappings={this.state.parameterMappings}
              existingParamNames={existingParamNames}
              onChange={mappings => this.updateParamMappings(mappings)}
              clientConfig={clientConfig}
              Query={Query}
            />
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
            Save
          </button>
        </div>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('editParameterMappingsDialog', {
    template: `
      <edit-parameter-mappings-dialog-impl
        dashboard="$ctrl.resolve.dashboard"
        widget="$ctrl.resolve.widget"
        close="$ctrl.close"
        dismiss="$ctrl.dismiss"
      ></edit-parameter-mappings-dialog-impl>
    `,
    bindings: {
      resolve: '<',
      close: '&',
      dismiss: '&',
    },
  });
  ngModule.component('editParameterMappingsDialogImpl', react2angular(EditParameterMappingsDialog, null, [
    'Query', 'clientConfig']));
}

init.init = true;
