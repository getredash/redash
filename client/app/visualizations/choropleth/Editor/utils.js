/* eslint-disable import/prefer-default-export */

import _ from "lodash";

export function inferCountryCodeType(mapType, data, countryCodeField) {
  const regexMap = {
    countries: {
      iso_a2: /^[a-z]{2}$/i,
      iso_a3: /^[a-z]{3}$/i,
      iso_n3: /^[0-9]{3}$/i,
    },
    subdiv_japan: {
      name: /^[a-z]+$/i,
      name_local: /^[\u3400-\u9FFF\uF900-\uFAFF]|[\uD840-\uD87F][\uDC00-\uDFFF]+$/i,
      iso_3166_2: /^JP-[0-9]{2}$/i,
    },
  };

  const regex = regexMap[mapType];

  const initState = _.mapValues(regex, () => 0);

  const result = _.chain(data)
    .reduce((memo, item) => {
      const value = item[countryCodeField];
      if (_.isString(value)) {
        _.each(regex, (r, k) => {
          memo[k] += r.test(value) ? 1 : 0;
        });
      }
      return memo;
    }, initState)
    .toPairs()
    .reduce((memo, item) => (item[1] > memo[1] ? item : memo))
    .value();

  return result[1] / data.length >= 0.9 ? result[0] : null;
}
