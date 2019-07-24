import React from 'react';
import PropTypes from 'prop-types';
import { isEqual, size, filter } from 'lodash';
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
    onSortUpdate: PropTypes.func,
    editable: PropTypes.bool,
  };

  static defaultProps = {
    parameters: [],
    onSortUpdate: () => {},
    editable: true,
  }

  constructor(props) {
    super(props);
    const { parameters } = props;
    this.state = { parameters, dirtyParamCount: size(filter(parameters, 'hasPendingValue')) };
  }

  componentDidUpdate = (prevProps) => {
    const { parameters } = this.props;
    if (!isEqual(prevProps.parameters, parameters)) {
      console.log(parameters);
      this.setState({ parameters, dirtyParamCount: size(filter(parameters, 'hasPendingValue')) });
    }
  }

  onSortEnd = ({ oldIndex, newIndex }) => {
    const { onSortUpdate } = this.props;
    this.setState(({ parameters }) => {
      parameters.splice(newIndex, 0, parameters.splice(oldIndex, 1)[0]);
      onSortUpdate(parameters);
      return { parameters };
    });
  }

  onSelect = (param, value) => {
    param.setPendingValue(value);
  };

  renderParameter(param) {
    return (
      <div
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
    const { parameters, dirtyParamCount } = this.state;
    const { editable } = this.props;
    return (
      <SortableContainer axis="xy" onSortEnd={this.onSortEnd} useDragHandle>
        <div className="parameter-container form-inline bg-white">
          {parameters.map((param, index) => (editable ? (
            <SortableItem key={param.name} index={index}>
              {this.renderParameter(param)}
            </SortableItem>
          ) : this.renderParameter(param)))}

          <ParameterApplyButton onClick={console.log} isApplying={false} paramCount={dirtyParamCount} />
        </div>
      </SortableContainer>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('parameters', {
    template: `
      <parameters-impl
        parameters="$ctrl.parameters"
        on-sort-update="$ctrl.onSortUpdate"
      ></parameters-impl>
    `,
    bindings: {
      parameters: '=',
    },
    controller($scope) {
      this.onSortUpdate = (parameters) => {
        this.parameters = parameters;
      };
      this.setValue = (value, isDirty) => {
        if (isDirty) {
          this.param.setPendingValue(value);
        } else {
          this.param.clearPendingValue();
        }
        $scope.$apply();
      };
    },
  });
  ngModule.component('parametersImpl', react2angular(Parameters));
}

init.init = true;
