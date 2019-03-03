import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Destination } from '@/services/destination';
import DynamicForm from '@/components/dynamic-form/DynamicForm';
import helper from '@/components/dynamic-form/dynamicFormHelper';

export default function EditDestinationForm({ destination, type, onSuccess, ...props }) {
  const selectedType = type.type;
  const fields = helper.getFields(type.configuration_schema, destination);

  const handleSubmit = (values, successCallback, errorCallback) => {
    helper.updateTargetWithValues(destination, values);
    destination.$save(
      (data) => {
        successCallback('Saved.');
        onSuccess(data);
      },
      (error) => {
        const message = get(error, 'data.message', 'Failed saving.');
        errorCallback(message);
      },
    );
  };

  return (
    <div className="row">
      <div className="text-center">
        <img src={`${Destination.IMG_ROOT}/${selectedType}.png`} alt={type.name} width="64" />
        <h3>{type.name}</h3>
      </div>
      <div className="col-md-4 col-md-offset-4 m-b-10">
        <DynamicForm {...props} fields={fields} onSubmit={handleSubmit} feedbackIcons />
      </div>
    </div>
  );
}

EditDestinationForm.propTypes = {
  destination: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  type: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  onSuccess: PropTypes.func,
};

EditDestinationForm.defaultProps = {
  onSuccess: () => {},
};
