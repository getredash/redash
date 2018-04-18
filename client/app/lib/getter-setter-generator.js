import { _ } from 'underscore';
import { dynamicGet, dynamicSet } from '@/lib/dynamic-object-access';

function getterSetterGenerator(generatorBlueprints, parentObject) {
  const getterSetters = {};

  _.each(generatorBlueprints, (blueprint) => {
    const getterSetter = (newValue) => {
      let option = dynamicGet(parentObject, blueprint.property);

      // Called as a setter
      // TODO: Use arguments.length instead to allow setting to undefined.
      if (!_.isUndefined(newValue)) {
        // Switch null to custom empty value
        const finalValue = _.isNull(newValue) ? blueprint.emptyValue : newValue;

        option = dynamicSet(parentObject, blueprint.property, finalValue);
      }

      return option;
    };

    // Save getter/setter in result object
    getterSetters[blueprint.property] = getterSetter;
  });

  return getterSetters;
}

export default getterSetterGenerator;
