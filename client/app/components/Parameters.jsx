import React from 'react';
import PropTypes from 'prop-types';
import { isEqual, size, filter, forEach, extend } from 'lodash';
import { react2angular } from 'react2angular';
import { sortableContainer, sortableElement, sortableHandle } from 'react-sortable-hoc';
import Button from 'antd/lib/button';
import { Parameter } from '@/services/query';
import ParameterApplyButton from '@/components/ParameterApplyButton';
import ParameterValueInput from '@/components/ParameterValueInput';
import EditParameterSettingsDialog from './EditParameterSettingsDialog';

import './Parameters.less';

const DragHandle = sortableHandle(({ parameterName }) => (
  <div className="drag-handle" data-test={`DragHandle-${parameterName}`} />
));

const SortableItem = sortableElement(({ className, parameterName, disabled, children }) => (
  <div className={className}>
    {!disabled && <DragHandle parameterName={parameterName} />}
    {children}
  </div>
));
const SortableContainer = sortableContainer(({ children }) => children);

export class Parameters extends React.Component {
  static propTypes = {
    parameters: PropTypes.arrayOf(PropTypes.instanceOf(Parameter)),
    editable: PropTypes.bool,
    onValuesChange: PropTypes.func,
    onParametersEdit: PropTypes.func,
  };

  static defaultProps = {
    parameters: [],
    editable: false,
    onValuesChange: () => {},
    onParametersEdit: () => {},
  }

  constructor(props) {
    super(props);
    const { parameters } = props;
    this.state = { parameters };
  }

  componentDidUpdate = (prevProps) => {
    const { parameters } = this.props;
    if (!isEqual(prevProps.parameters, parameters)) {
      this.setState({ parameters });
    }
  };

  onSortEnd = ({ oldIndex, newIndex }) => {
    const { onParametersEdit } = this.props;
    if (oldIndex !== newIndex) {
      this.setState(({ parameters }) => {
        parameters.splice(newIndex, 0, parameters.splice(oldIndex, 1)[0]);
        onParametersEdit();
        return { parameters };
      });
    }
  };

  onSelect = (param, value, isDirty) => {
    this.setState(({ parameters }) => {
      if (isDirty) {
        param.setPendingValue(value);
      } else {
        param.clearPendingValue();
      }
      return { parameters };
    });
  };

  applyChanges = () => {
    const { onValuesChange } = this.props;
    this.setState(({ parameters }) => {
      forEach(parameters, p => p.applyPendingValue());
      onValuesChange();
      return { parameters };
    });
  };

  showParameterSettings = (parameter, index) => {
    const { onParametersEdit } = this.props;
    EditParameterSettingsDialog
      .showModal({ parameter })
      .result.then((updated) => {
        this.setState(({ parameters }) => {
          parameters[index] = extend(parameter, updated);
          onParametersEdit();
          return { parameters };
        });
      });
  };

  handleKeyDown = (e) => {
    const { parameters } = this.props;
    const dirtyParamCount = size(filter(parameters, 'hasPendingValue'));

    // Cmd/Ctrl + Enter
    if (dirtyParamCount > 0 && e.keyCode === 13 && (e.ctrlKey || e.metaKey || e.altKey)) {
      e.stopPropagation();
      this.applyChanges();
    }
  };

  renderParameter(param, index) {
    const { editable } = this.props;
    return (
      <div
        key={param.name}
        className="di-block"
        data-test={`ParameterName-${param.name}`}
      >
        <div className="d-flex">
          <label className="flex-fill">{param.title || param.name}</label>
          {editable && (
            <Button
              className="parameter-settings-button"
              type="link"
              size="small"
              onClick={() => this.showParameterSettings(param, index)}
              data-test={`ParameterSettings-${param.name}`}
            >
              <i className="zmdi zmdi-settings" />
            </Button>
          )}
        </div>
        <ParameterValueInput
          type={param.type}
          value={param.normalizedValue}
          parameter={param}
          enumOptions={param.enumOptions}
          queryI={param.queryId}
          onSelect={(value, isDirty) => this.onSelect(param, value, isDirty)}
        />
      </div>
    );
  }

  render() {
    const { parameters } = this.state;
    const { editable } = this.props;
    const dirtyParamCount = size(filter(parameters, 'hasPendingValue'));
    return (
      <SortableContainer axis="xy" onSortEnd={this.onSortEnd} lockToContainerEdges useDragHandle>
        <div className="parameter-container" onKeyDown={this.handleKeyDown}>
          {parameters.map((param, index) => (
            <SortableItem className="parameter" key={param.name} index={index} parameterName={param.name} disabled={!editable}>
              {this.renderParameter(param, index)}
            </SortableItem>
          ))}

          <ParameterApplyButton onClick={this.applyChanges} paramCount={dirtyParamCount} />
        </div>
      </SortableContainer>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('parameters', react2angular(Parameters));
}

init.init = true;
