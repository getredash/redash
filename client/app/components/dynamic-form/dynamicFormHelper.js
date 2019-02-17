import { each, includes } from 'lodash';

function orderedInputs(properties, order, targetOptions) {
  const inputs = new Array(order.length);
  Object.keys(properties).forEach((key) => {
    const position = order.indexOf(key);
    const input = {
      name: key,
      title: properties[key].title,
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

function getFields(configurationSchema, target) {
  normalizeSchema(configurationSchema);
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

function updateTargetWithValues(target, values) {
  target.name = values.name;
  Object.keys(values).forEach((key) => {
    if (key !== 'name') {
      target.options[key] = values[key];
    }
  });
}

function toHuman(text) {
  return text.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase());
}

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.substr(reader.result.indexOf(',') + 1));
    reader.onerror = error => reject(error);
  });
}

export default {
  getFields,
  updateTargetWithValues,
  toHuman,
  getBase64,
};
