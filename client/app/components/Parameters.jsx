import React from 'react';
import PropTypes from 'prop-types';
import { isEqual, size, filter, forEach, extend } from 'lodash';
import { react2angular } from 'react2angular';
import { sortableContainer, sortableElement, sortableHandle } from 'react-sortable-hoc';
import Button from 'antd/lib/button';
import { Parameter } from '@/services/query';
import { ParameterApplyButton } from '@/components/ParameterApplyButton';
import { ParameterValueInput } from '@/components/ParameterValueInput';
import EditParameterSettingsDialog from './EditParameterSettingsDialog';

import './Parameters.less';

const DragHandle = sortableHandle(() => <div className="drag-handle" />);

const SortableItem = sortableElement(({ disabled, children }) => (
  <div className="bg-white di-block m-r-10 m-b-10">
    {!disabled && <DragHandle />}
    {children}
  </div>
));
const SortableContainer = sortableContainer(({ children }) => children);

export class Parameters extends React.Component {
  static propTypes = {
    parameters: PropTypes.arrayOf(PropTypes.instanceOf(Parameter)),
    editable: PropTypes.bool,
    onUpdate: PropTypes.func,
    onValuesChange: PropTypes.func,
    onParameterEdited: PropTypes.func,
  };

  static defaultProps = {
    parameters: [],
    editable: false,
    onUpdate: () => {},
    onValuesChange: () => {},
    onParameterEdited: () => {},
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
    const { onUpdate } = this.props;
    this.setState(({ parameters }) => {
      parameters.splice(newIndex, 0, parameters.splice(oldIndex, 1)[0]);
      onUpdate(parameters);
      return { parameters };
    });
  };

  onSelect = (param, value, isDirty) => {
    const { onUpdate } = this.props;
    this.setState(({ parameters }) => {
      if (isDirty) {
        param.setPendingValue(value);
      } else {
        param.clearPendingValue();
      }
      onUpdate(parameters);
      return { parameters };
    });
  };

  applyChanges = () => {
    const { onUpdate, onValuesChange } = this.props;
    this.setState(({ parameters }) => {
      forEach(parameters, p => p.applyPendingValue());
      onUpdate(parameters);
      onValuesChange();
      return { parameters };
    });
  };

  showParameterSettings = (parameter, index) => {
    const { onParameterEdited } = this.props;
    EditParameterSettingsDialog
      .showModal({ parameter })
      .result.then((updated) => {
        this.setState(({ parameters }) => {
          parameters[index] = extend(parameter, updated);
          onParameterEdited(parameters[index]);
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
      <SortableContainer axis="xy" onSortEnd={this.onSortEnd} useDragHandle>
        <div className="parameter-container bg-white" onKeyDown={this.handleKeyDown}>
          {parameters.map((param, index) => (
            <SortableItem key={param.name} index={index} disabled={!editable}>
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
