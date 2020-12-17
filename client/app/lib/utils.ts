import moment from "moment";
import { clientConfig } from "@/services/auth";
export const IntervalEnum = {
    NEVER: "Never",
    SECONDS: "second",
    MINUTES: "minute",
    HOURS: "hour",
    DAYS: "day",
    WEEKS: "week",
    MILLISECONDS: "millisecond",
};
export const AbbreviatedTimeUnits = {
    SECONDS: "s",
    MINUTES: "m",
    HOURS: "h",
    DAYS: "d",
    WEEKS: "w",
    MILLISECONDS: "ms",
};
function formatDateTimeValue(value: any, format: any) {
    if (!value) {
        return "";
    }
    const parsed = moment(value);
    if (!parsed.isValid()) {
        return "-";
    }
    return parsed.format(format);
}
export function formatDateTime(value: any) {
    return formatDateTimeValue(value, (clientConfig as any).dateTimeFormat);
}
export function formatDateTimePrecise(value: any, withMilliseconds = false) {
    return formatDateTimeValue(value, (clientConfig as any).dateFormat + (withMilliseconds ? " HH:mm:ss.SSS" : " HH:mm:ss"));
}
export function formatDate(value: any) {
    return formatDateTimeValue(value, (clientConfig as any).dateFormat);
}
export function localizeTime(time: any) {
    const [hrs, mins] = time.split(":");
    return moment
        .utc()
        .hour(hrs)
        .minute(mins)
        .local()
        .format("HH:mm");
}
export function secondsToInterval(count: any) {
    if (!count) {
        return { interval: IntervalEnum.NEVER };
    }
    let interval = IntervalEnum.SECONDS;
    if (count >= 60) {
        count /= 60;
        interval = IntervalEnum.MINUTES;
    }
    if (count >= 60) {
        count /= 60;
        interval = IntervalEnum.HOURS;
    }
    if (count >= 24 && interval === IntervalEnum.HOURS) {
        count /= 24;
        interval = IntervalEnum.DAYS;
    }
    if (count >= 7 && !(count % 7) && interval === IntervalEnum.DAYS) {
        count /= 7;
        interval = IntervalEnum.WEEKS;
    }
    return { count, interval };
}
export function pluralize(text: any, count: any) {
    const should = count !== 1;
    return text + (should ? "s" : "");
}
export function durationHumanize(durationInSeconds: any, options = {}) {
    if (!durationInSeconds) {
        return "-";
    }
    let ret = "";
    const { interval, count } = secondsToInterval(durationInSeconds);
    const rounded = Math.round(count);
    if (rounded !== 1 || !(options as any).omitSingleValueNumber) {
        ret = `${rounded} `;
    }
    ret += pluralize(interval, rounded);
    return ret;
}
export function toHuman(text: any) {
    return text.replace(/_/g, " ").replace(/(?:^|\s)\S/g, (a: any) => a.toUpperCase());
}
export function remove(items: any, item: any) {
    if (items === undefined) {
        return items;
    }
    let notEquals;
    if (item instanceof Array) {
        notEquals = (other: any) => item.indexOf(other) === -1;
    }
    else {
        notEquals = (other: any) => item !== other;
    }
    const filtered = [];
    for (let i = 0; i < items.length; i += 1) {
        if (notEquals(items[i])) {
            filtered.push(items[i]);
        }
    }
    return filtered;
}
/**
 * Formats number to string
 * @param value {number}
 * @param [fractionDigits] {number}
 * @return {string}
 */
export function formatNumber(value: any, fractionDigits = 3) {
    return Math.round(value) !== value ? value.toFixed(fractionDigits) : value.toString();
}
/**
 * Formats any number using predefined units
 * @param value {string|number}
 * @param divisor {number}
 * @param [units] {Array<string>}
 * @param [fractionDigits] {number}
 * @return {{unit: string, value: string, divisor: number}}
 */
export function prettyNumberWithUnit(value: any, divisor: any, units = [], fractionDigits: any) {
    if (isNaN(parseFloat(value)) || !isFinite(value)) {
        return {
            value: "",
            unit: "",
            divisor: 1,
        };
    }
    let unit = 0;
    let greatestDivisor = 1;
    while (value >= divisor && unit < units.length - 1) {
        value /= divisor;
        greatestDivisor *= divisor;
        unit += 1;
    }
    return {
        value: formatNumber(value, fractionDigits),
        unit: units[unit],
        divisor: greatestDivisor,
    };
}
export function prettySizeWithUnit(bytes: any, fractionDigits: any) {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
    return prettyNumberWithUnit(bytes, 1024, ["bytes", "KB", "MB", "GB", "TB", "PB"], fractionDigits);
}
export function prettySize(bytes: any) {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    const { value, unit } = prettySizeWithUnit(bytes);
    if (!value) {
        return "?";
    }
    return value + " " + unit;
}
export function join(arr: any) {
    if (arr === undefined || arr === null) {
        return "";
    }
    return arr.join(" / ");
}
export function formatColumnValue(value: any, columnType = null) {
    if (moment.isMoment(value)) {
        if (columnType === "date") {
            return formatDate(value);
        }
        return formatDateTime(value);
    }
    if (typeof value === "boolean") {
        return value.toString();
    }
    return value;
}
