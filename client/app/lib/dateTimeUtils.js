import moment from "moment";

function isDateLikeObject(value) {
  return (
    !!value && typeof value === "object" && typeof value.isValid === "function" && typeof value.toDate === "function"
  );
}

export function toMoment(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (moment.isMoment(value)) {
    return value.isValid() ? value : null;
  }

  if (isDateLikeObject(value)) {
    const normalizedValue = moment(value.toDate());
    return normalizedValue.isValid() ? normalizedValue : null;
  }

  const normalizedValue = moment(value, moment.ISO_8601, true);
  return normalizedValue.isValid() ? normalizedValue : null;
}

export function toMomentRange(value) {
  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }

  const normalizedValue = value.map(toMoment);
  if (normalizedValue[0] && normalizedValue[1]) {
    return normalizedValue;
  }

  return null;
}
