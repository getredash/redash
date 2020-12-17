import PropTypes from "prop-types";
import { wrap } from "lodash";
import moment from "moment";
type DataSource = {
    syntax?: string;
    options?: {
        doc?: string;
        doc_url?: string;
    };
    type_name?: string;
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ syntax: Requireable... Remove this comment to see the full error message
const DataSource: PropTypes.Requireable<DataSource> = PropTypes.shape({
    syntax: PropTypes.string,
    options: PropTypes.shape({
        doc: PropTypes.string,
        doc_url: PropTypes.string,
    }),
    type_name: PropTypes.string,
});
export { DataSource };
type Table = {
    columns: string[];
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ columns: Validator<... Remove this comment to see the full error message
const Table: PropTypes.Requireable<Table> = PropTypes.shape({
    columns: PropTypes.arrayOf(PropTypes.string).isRequired,
});
export { Table };
export const Schema = PropTypes.arrayOf(Table);
type RefreshScheduleType = {
    interval?: number;
    time?: string;
    day_of_week?: string;
    until?: string;
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ interval: Requireab... Remove this comment to see the full error message
const RefreshScheduleType: PropTypes.Requireable<RefreshScheduleType> = PropTypes.shape({
    interval: PropTypes.number,
    time: PropTypes.string,
    day_of_week: PropTypes.string,
    until: PropTypes.string,
});
export { RefreshScheduleType };
export const RefreshScheduleDefault = {
    interval: null,
    time: null,
    day_of_week: null,
    until: null,
};
type UserProfile = {
    id: number;
    name: string;
    email: string;
    profileImageUrl?: string;
    apiKey?: string;
    isDisabled?: boolean;
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ id: Validator<numbe... Remove this comment to see the full error message
const UserProfile: PropTypes.Requireable<UserProfile> = PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    profileImageUrl: PropTypes.string,
    apiKey: PropTypes.string,
    isDisabled: PropTypes.bool,
});
export { UserProfile };
type Destination = {
    id: number;
    name: string;
    icon: string;
    type: string;
};
const Destination: PropTypes.Requireable<Destination> = PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
});
export { Destination };
type Query = {
    id: any;
    name: string;
    description?: string;
    data_source_id: any;
    created_at: string;
    updated_at?: string;
    user?: UserProfile;
    query?: string;
    queryHash?: string;
    is_safe: boolean;
    is_draft: boolean;
    is_archived: boolean;
    api_key: string;
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ id: Validator<any>;... Remove this comment to see the full error message
const Query: PropTypes.Requireable<Query> = PropTypes.shape({
    id: PropTypes.any.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    data_source_id: PropTypes.any.isRequired,
    created_at: PropTypes.string.isRequired,
    updated_at: PropTypes.string,
    user: UserProfile,
    query: PropTypes.string,
    queryHash: PropTypes.string,
    is_safe: PropTypes.bool.isRequired,
    is_draft: PropTypes.bool.isRequired,
    is_archived: PropTypes.bool.isRequired,
    api_key: PropTypes.string.isRequired,
});
export { Query };
type AlertOptions = {
    column?: string;
    op?: ">" | ">=" | "<" | "<=" | "==" | "!=";
    value?: string | number;
    custom_subject?: string;
    custom_body?: string;
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ column: Requireable... Remove this comment to see the full error message
const AlertOptions: PropTypes.Requireable<AlertOptions> = PropTypes.shape({
    column: PropTypes.string,
    op: PropTypes.oneOf([">", ">=", "<", "<=", "==", "!="]),
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    custom_subject: PropTypes.string,
    custom_body: PropTypes.string,
});
export { AlertOptions };
type Alert = {
    id?: any;
    name?: string;
    created_at?: string;
    last_triggered_at?: string;
    updated_at?: string;
    rearm?: number;
    state?: "ok" | "triggered" | "unknown";
    user?: UserProfile;
    query?: Query;
    options: {
        column?: string;
        op?: string;
        value?: string | number;
    };
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ id: Requireable<any... Remove this comment to see the full error message
const Alert: PropTypes.Requireable<Alert> = PropTypes.shape({
    id: PropTypes.any,
    name: PropTypes.string,
    created_at: PropTypes.string,
    last_triggered_at: PropTypes.string,
    updated_at: PropTypes.string,
    rearm: PropTypes.number,
    state: PropTypes.oneOf(["ok", "triggered", "unknown"]),
    user: UserProfile,
    query: Query,
    options: PropTypes.shape({
        column: PropTypes.string,
        op: PropTypes.string,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }).isRequired,
});
export { Alert };
function checkMoment(isRequired: any, props: any, propName: any, componentName: any) {
    const value = props[propName];
    const isRequiredValid = isRequired && value !== null && value !== undefined && moment.isMoment(value);
    const isOptionalValid = !isRequired && (value === null || value === undefined || moment.isMoment(value));
    if (!isRequiredValid && !isOptionalValid) {
        return new Error("Prop `" + propName + "` supplied to `" + componentName + "` should be a Moment.js instance.");
    }
}
export const Moment = wrap(false, checkMoment);
(Moment as any).isRequired = wrap(true, checkMoment);
