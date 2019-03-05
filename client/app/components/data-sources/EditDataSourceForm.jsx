import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { DataSource } from '@/services/data-source';
import DynamicForm from '@/components/dynamic-form/DynamicForm';
import helper from '@/components/dynamic-form/dynamicFormHelper';

export default function EditDataSourceForm({ dataSource, type, onSuccess, ...props }) {
  const selectedType = type.type;
  const fields = helper.getFields(type.configuration_schema, dataSource);

  const handleSubmit = (values, successCallback, errorCallback) => {
    helper.updateTargetWithValues(dataSource, values);
    dataSource.$save(
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
    <div className="row" data-test="DataSource">
      <div className="col-sm-offset-4 col-sm-4 text-center">
        <img src={`${DataSource.IMG_ROOT}/${selectedType}.png`} alt={type.name} width="64" />
        <h3>{type.name}</h3>
      </div>
      <div className="col-sm-4">
        {DataSource.HELP_LINKS[selectedType] && (
          <p className="needhelp text-right text-center-xs">
            {/* eslint-disable-next-line react/jsx-no-target-blank */}
            <a href={DataSource.HELP_LINKS[selectedType]} target="_blank" rel="noopener">
              Help <span className="hidden-xs">setting up {type.name}</span> <i className="fa fa-external-link" aria-hidden="true" />
            </a>
          </p>
        )}
      </div>
      <div className="col-md-4 col-md-offset-4 m-b-10">
        <DynamicForm {...props} fields={fields} onSubmit={handleSubmit} feedbackIcons />
      </div>
    </div>
  );
}

EditDataSourceForm.propTypes = {
  dataSource: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  type: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  onSuccess: PropTypes.func,
};

EditDataSourceForm.defaultProps = {
  onSuccess: () => {},
};
