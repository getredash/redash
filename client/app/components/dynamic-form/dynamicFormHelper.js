import { isUndefined, each, includes } from 'lodash';

function orderedInputs(properties, order) {
  const inputs = new Array(order.length);
  Object.keys(properties).forEach((key) => {
    const position = order.indexOf(key);
    const input = {
      name: key,
      property: properties[key],
    };

    if (position > -1) {
      inputs[position] = input;
    } else {
      inputs.push(input);
    }
  });
  return inputs;
}

function normalizeSchema(configurationSchema) {
  each(configurationSchema.properties, (prop, name) => {
    if (name === 'password' || name === 'passwd') {
      prop.type = 'password';
    }

    if (name.endsWith('File')) {
      prop.type = 'file';
    }

    if (prop.type === 'boolean') {
      prop.type = 'checkbox';
    }

    prop.required = includes(configurationSchema.required, name);
  });

  configurationSchema.order = configurationSchema.order || [];
}

function setDefaults(configurationSchema, options) {
  if (Object.keys(options).length === 0) {
    const properties = configurationSchema.properties;
    Object.keys(properties).forEach((property) => {
      if (!isUndefined(properties[property].default)) {
        options[property] = properties[property].default;
      }
    });
  }
}

function getInputs(configurationSchema, targetOptions) {
  normalizeSchema(configurationSchema);
  setDefaults(configurationSchema, targetOptions);
  const inputs = orderedInputs(configurationSchema.properties, configurationSchema.order);

  inputs.forEach((input) => {
    input.hasErrors = input.property.required && !targetOptions[input.name];
  });

  return inputs;
}

function toHuman(text) {
  return text.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase());
}

const updateFieldState = (fieldName, value, hasErrors) => {
  if (!this) return;

  const fields = this.state.fields
    .map(field => (
      field.name === fieldName ? { ...field, value, hasErrors } : field
    ));

  const nameErrors = fieldName === 'name' ? hasErrors : this.state.nameErrors;

  this.setState({
    target: {
      ...this.state.target,
      options: {
        ...this.state.target.options,
        [fieldName]: value,
      },
    },
    nameErrors,
    fields,
  });
};

const setActionInProgress = (actionName, inProgress) => {
  if (!this) return;

  this.setState({
    inProgressActions: {
      ...this.state.inProgressActions,
      [actionName]: inProgress,
    },
  });
};

export default {
  getInputs,
  updateFieldState,
  setActionInProgress,
  toHuman,
};
