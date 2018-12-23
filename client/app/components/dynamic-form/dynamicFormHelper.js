import { isUndefined, each, includes } from 'lodash';

function orderedInputs(properties, order, targetOptions) {
  const inputs = new Array(order.length);
  Object.keys(properties).forEach((key) => {
    const position = order.indexOf(key);
    const input = {
      name: key,
      type: properties[key].type,
      placeholder: properties[key].default && properties[key].default.toString(),
      required: properties[key].required,
      initialValue: targetOptions[key],
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

    if (prop.type === 'string') {
      prop.type = 'text';
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

function getFields(configurationSchema, target) {
  normalizeSchema(configurationSchema);
  setDefaults(configurationSchema, target.options);
  const inputs = [
    {
      name: 'name',
      title: 'Name',
      type: 'text',
      required: true,
      initialValue: target.name,
    },
    ...orderedInputs(configurationSchema.properties, configurationSchema.order, target.options),
  ];

  return inputs;
}

function toHuman(text) {
  return text.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase());
}

export default {
  getFields,
  toHuman,
};
