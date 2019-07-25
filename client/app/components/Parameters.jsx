import React from 'react';
import PropTypes from 'prop-types';
import { isEqual, size, filter, forEach } from 'lodash';
import { react2angular } from 'react2angular';
import { sortableContainer, sortableElement, sortableHandle } from 'react-sortable-hoc';
import { Parameter } from '@/services/query';
import { ParameterApplyButton } from '@/components/ParameterApplyButton';
import { ParameterValueInput } from '@/components/ParameterValueInput';

import './Parameters.less';

const DragHandle = sortableHandle(() => <div className="drag-handle" />);

const SortableItem = sortableElement(({ children }) => (
  <div className="di-block">
    <DragHandle />
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
  };

  static defaultProps = {
    parameters: [],
    editable: false,
    onUpdate: () => {},
    onValuesChange: () => {},
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
  }

  onSortEnd = ({ oldIndex, newIndex }) => {
    const { onUpdate } = this.props;
    this.setState(({ parameters }) => {
      parameters.splice(newIndex, 0, parameters.splice(oldIndex, 1)[0]);
      onUpdate(parameters);
      return { parameters };
    });
  }

  onSelect = (param, value) => {
    const { onUpdate } = this.props;
    this.setState(({ parameters }) => {
      param.setPendingValue(value);
      onUpdate(parameters);
      return { parameters };
    });
  };

  onApply = () => {
    const { onUpdate, onValuesChange } = this.props;
    this.setState(({ parameters }) => {
      forEach(parameters, p => p.applyPendingValue());
      onUpdate(parameters);
      onValuesChange();
      return { parameters };
    });
  }

  renderParameter(param) {
    return (
      <div
        key={param.name}
        className="di-block m-r-10"
        data-test={`ParameterName-${param.name}`}
      >
        <label className="parameter-label">{param.title || param.name}</label>
        <ParameterValueInput
          type={param.type}
          value={param.normalizedValue}
          parameter={param}
          enumOptions={param.enumOptions}
          queryI={param.queryId}
          onSelect={value => this.onSelect(param, value)}
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
        <div className="parameter-container form-inline bg-white">
          {parameters.map((param, index) => (editable ? (
            <SortableItem key={param.name} index={index}>
              {this.renderParameter(param)}
            </SortableItem>
          ) : this.renderParameter(param)))}

          <ParameterApplyButton onClick={this.onApply} isApplying={false} paramCount={dirtyParamCount} />
        </div>
      </SortableContainer>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('parameters', react2angular(Parameters));
}

init.init = true;
