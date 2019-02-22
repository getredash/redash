import React from 'react';
import PropTypes from 'prop-types';
import { DataSource } from '@/services/data-source';
import { DynamicForm } from '@/components/dynamic-form/DynamicForm';
import helper from '@/components/dynamic-form/dynamicFormHelper';

const HELP_LINKS = {
  athena: 'https://redash.io/help/data-sources/amazon-athena-setup',
  bigquery: 'https://redash.io/help/data-sources/bigquery-setup',
  url: 'https://redash.io/help/data-sources/querying-urls',
  mongodb: 'https://redash.io/help/data-sources/mongodb-setup',
  google_spreadsheets: 'https://redash.io/help/data-sources/querying-a-google-spreadsheet',
  google_analytics: 'https://redash.io/help/data-sources/google-analytics-setup',
  axibasetsd: 'https://redash.io/help/data-sources/axibase-time-series-database',
  results: 'https://redash.io/help/user-guide/querying/query-results-data-source',
};

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
        if (error.status === 400 && 'message' in error.data) {
          errorCallback(error.data.message);
        } else {
          errorCallback('Failed saving.');
        }
      },
    );
  };

  return (
    <div>
      <div className="col-sm-offset-4 col-sm-4 text-center">
        <img src={`${DataSource.IMG_ROOT}/${selectedType}.png`} alt={type.name} width="64" />
        <h3>{type.name}</h3>
      </div>
      <div className="col-sm-4">
        {HELP_LINKS[selectedType] && (
          <p className="needhelp text-right text-center-xs">
            {/* eslint-disable-next-line react/jsx-no-target-blank */}
            <a href={HELP_LINKS[selectedType]} target="_blank" rel="noopener">
              Help <span className="hidden-xs">setting up {type.name}</span> <i className="fa fa-external-link" aria-hidden="true" />
            </a>
          </p>
        )}
      </div>
      <div className="col-md-4 col-md-offset-4">
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
