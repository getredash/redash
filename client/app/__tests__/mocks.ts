// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'mock... Remove this comment to see the full error message
import MockDate from "mockdate";

const date = new Date("2000-01-01T02:00:00.000");

MockDate.set(date);
