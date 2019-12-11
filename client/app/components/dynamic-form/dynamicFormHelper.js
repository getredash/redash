import React from "react";
import { each, includes, isUndefined, isEmpty, map } from "lodash";

function orderedInputs(properties, order, targetOptions) {
  const inputs = new Array(order.length);
  Object.keys(properties).forEach(key => {
    const position = order.indexOf(key);
    const input = {
      name: key,
      title: properties[key].title,
      type: properties[key].type,
      placeholder: properties[key].default && properties[key].default.toString(),
      required: properties[key].required,
      extra: properties[key].extra,
      initialValue: targetOptions[key],
    };

    if (input.type === "select") {
      input.placeholder = "Select an option";
      input.options = properties[key].options;
    }

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
    if (name === "password" || name === "passwd") {
      prop.type = "password";
    }

    if (name.endsWith("File")) {
      prop.type = "file";
    }

    if (prop.type === "boolean") {
      prop.type = "checkbox";
    }

    if (prop.type === "string") {
      prop.type = "text";
    }

    if (!isEmpty(prop.enum)) {
      prop.type = "select";
      prop.options = map(prop.enum, value => ({ value, name: value }));
    }

    if (!isEmpty(prop.extendedEnum)) {
      prop.type = "select";
      prop.options = prop.extendedEnum;
    }

    prop.required = includes(configurationSchema.required, name);
    prop.extra = includes(configurationSchema.extra_options, name);
  });

  configurationSchema.order = configurationSchema.order || [];
}

function setDefaultValueToFields(configurationSchema, options = {}) {
  const properties = configurationSchema.properties;
  Object.keys(properties).forEach(key => {
    const property = properties[key];
    // set default value for checkboxes
    if (!isUndefined(property.default) && property.type === "checkbox") {
      options[key] = property.default;
    }
    // set default or first value when value has predefined options
    if (property.type === "select") {
      const optionValues = map(property.options, option => option.value);
      options[key] = includes(optionValues, property.default) ? property.default : optionValues[0];
    }
  });
}

function getFields(type = {}, target = { options: {} }) {
  const configurationSchema = type.configuration_schema;
  normalizeSchema(configurationSchema);
  const hasTargetObject = Object.keys(target.options).length > 0;
  if (!hasTargetObject) {
    setDefaultValueToFields(configurationSchema, target.options);
  }

  const isNewTarget = !target.id;
  const inputs = [
    {
      name: "name",
      title: "Name",
      type: "text",
      required: true,
      initialValue: target.name,
      contentAfter: React.createElement("hr"),
      placeholder: `My ${type.name}`,
      autoFocus: isNewTarget,
    },
    ...orderedInputs(configurationSchema.properties, configurationSchema.order, target.options),
  ];

  return inputs;
}

function updateTargetWithValues(target, values) {
  target.name = values.name;
  Object.keys(values).forEach(key => {
    if (key !== "name") {
      target.options[key] = values[key];
    }
  });
}

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.substr(reader.result.indexOf(",") + 1));
    reader.onerror = error => reject(error);
  });
}

export default {
  getFields,
  updateTargetWithValues,
  getBase64,
};
