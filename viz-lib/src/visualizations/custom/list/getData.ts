import { isNil, isObject, each, forOwn, sortBy, values } from "lodash";

export default function getData(data: any, options: any) {
  const output = [];

  const mappings = options.columnMapping;

  each(data, row => {
    let point = { $raw: row };
    let xValue = 0;
    const yValues = {};

    forOwn(row, (value, definition) => {
      definition = "" + definition;
      const definitionParts = definition.split("::") || definition.split("__");
      const name = definitionParts[0];
      const type = mappings ? mappings[definition] : definitionParts[1];

      if (type === "unused") {
        return;
      }

      if (type === "x") {
        xValue = value;
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        point[type] = value;
      }
      if (type === "y") {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        yValues[name] = value;
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        point[type] = value;
      }

      if (type === "thumbnail") {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        point[type] = value;
      }
    });

    output.push(point);
  });

  return output;
}
