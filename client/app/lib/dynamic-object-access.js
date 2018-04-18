import { _ } from 'underscore';
import { isNullOrUndefined } from 'util';

// Taken from https://github.com/joshuacc/drabs

/* _obj: the target object.
   _props: the (nested) target property of _obj. Accepts a string in dot notation or an array of properties.
   _errorValue: value to return if the property is not found. Defaults to undefined if not provided. */
export function dynamicGet(_obj, _props, _errorValue) {
  // Make sure props is defined and not empty
  if (isNullOrUndefined(_props) || _props.length === 0) {
    return;
  }

  // If the property list is in dot notation, convert to array
  if (_.isString(_props)) {
    _props = _props.split('.');
  }

  function dynamicGetByArray(obj, propsArray, errorValue) {
    // Parent properties are invalid... exit with error message
    if (isNullOrUndefined(obj)) {
      return errorValue;
    }

    // the path array has only 1 more element (the target property)
    if (propsArray.length === 1) {
      return obj[propsArray[0]];
    }

    // Prepare our found property and path array for recursion
    const foundSoFar = obj[propsArray[0]];
    const remainingProps = _.rest(propsArray);

    return dynamicGetByArray(foundSoFar, remainingProps, errorValue);
  }

  return dynamicGetByArray(_obj, _props, _errorValue);
}

/* Same as get but updates the property with _newValue.
   Returns the updated property. */
export function dynamicSet(_obj, _props, _newValue, _errorValue) {
  // Make sure props is defined and not empty
  if (isNullOrUndefined(_props) || _props.length === 0) {
    return;
  }

  // If the property list is in dot notation, convert to array
  if (_.isString(_props)) {
    _props = _props.split('.');
  }

  function dynamicSetByArray(obj, propsArray, newValue, errorValue) {
    // Parent properties are invalid... exit with error message
    if (isNullOrUndefined(obj)) {
      return errorValue;
    }

    // the path array has only 1 more element (the target property)
    if (propsArray.length === 1) {
      // Update property
      obj[propsArray[0]] = newValue;
      return obj[propsArray[0]];
    }

    // Prepare our found property and path array for recursion
    const foundSoFar = obj[propsArray[0]];
    const remainingProps = _.rest(propsArray);

    return dynamicSetByArray(foundSoFar, remainingProps, newValue, errorValue);
  }

  return dynamicSetByArray(_obj, _props, _newValue, _errorValue);
}
