import { get, find, toUpper } from "lodash";
import React from "react";
import Modal from "antd/lib/modal";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import LoadingState from "@/components/items-list/components/LoadingState";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import helper from "@/components/dynamic-form/dynamicFormHelper";
import HelpTrigger, { TYPES as HELP_TRIGGER_TYPES } from "@/components/HelpTrigger";
import wrapSettingsTab from "@/components/SettingsWrapper";
import DataSource, { IMG_ROOT } from "@/services/data-source";
import notification from "@/services/notification";
import routes from "@/services/routes";
type OwnProps = {
    dataSourceId: string;
    onError?: (...args: any[]) => any;
};
type State = any;
type Props = OwnProps & typeof EditDataSource.defaultProps;
class EditDataSource extends React.Component<Props, State> {
    static defaultProps = {
        onError: () => { },
    };
    state = {
        dataSource: null,
        type: null,
        loading: true,
    };
    componentDidMount() {
        DataSource.get({ id: this.props.dataSourceId })
            .then(dataSource => {
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'AxiosRespo... Remove this comment to see the full error message
            const { type } = dataSource;
            this.setState({ dataSource });
            DataSource.types().then(types => this.setState({ type: find(types, { type }), loading: false }));
        })
            .catch(error => this.props.onError(error));
    }
    saveDataSource = (values: any, successCallback: any, errorCallback: any) => {
        const { dataSource } = this.state;
        helper.updateTargetWithValues(dataSource, values);
        DataSource.save(dataSource)
            .then(() => successCallback("Saved."))
            .catch(error => {
            const message = get(error, "response.data.message", "Failed saving.");
            errorCallback(message);
        });
    };
    deleteDataSource = (callback: any) => {
        const { dataSource } = this.state;
        const doDelete = () => {
            DataSource.delete(dataSource)
                .then(() => {
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
                notification.success("Data source deleted successfully.");
                navigateTo("data_sources");
            })
                .catch(() => {
                callback();
            });
        };
        Modal.confirm({
            title: "Delete Data Source",
            content: "Are you sure you want to delete this data source?",
            okText: "Delete",
            okType: "danger",
            onOk: doDelete,
            onCancel: callback,
            maskClosable: true,
            autoFocusButton: null,
        });
    };
    testConnection = (callback: any) => {
        const { dataSource } = this.state;
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        DataSource.test({ id: dataSource.id })
            .then(httpResponse => {
            if ((httpResponse as any).ok) {
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
                notification.success("Success");
            }
            else {
                // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 3.
                notification.error("Connection Test Failed:", (httpResponse as any).message, { duration: 10 });
            }
            callback();
        })
            .catch(() => {
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 3.
            notification.error("Connection Test Failed:", "Unknown error occurred while performing connection test. Please try again later.", { duration: 10 });
            callback();
        });
    };
    renderForm() {
        const { dataSource, type } = this.state;
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
        const fields = helper.getFields(type, dataSource);
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        const helpTriggerType = `DS_${toUpper(type.type)}`;
        const formProps = {
            fields,
            type,
            actions: [
                { name: "Delete", type: "danger", callback: this.deleteDataSource },
                { name: "Test Connection", pullRight: true, callback: this.testConnection, disableWhenDirty: true },
            ],
            onSubmit: this.saveDataSource,
            feedbackIcons: true,
            defaultShowExtraFields: helper.hasFilledExtraField(type, dataSource),
        };
        return (<div className="row" data-test="DataSource">
        <div className="text-right m-r-10">
          {/* @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
          {HELP_TRIGGER_TYPES[helpTriggerType] && (<HelpTrigger className="f-13" type={helpTriggerType}>
              Setup Instructions <i className="fa fa-question-circle"/>
            </HelpTrigger>)}
        </div>
        <div className="text-center m-b-10">
          {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
          <img className="p-5" src={`${IMG_ROOT}/${type.type}.png`} alt={type.name} width="64"/>
          {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
          <h3 className="m-0">{type.name}</h3>
        </div>
        <div className="col-md-4 col-md-offset-4 m-b-10">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ fields: any[]; type: null; actions: ({ nam... Remove this comment to see the full error message */}
          <DynamicForm {...formProps}/>
        </div>
      </div>);
    }
    render() {
        return this.state.loading ? <LoadingState className=""/> : this.renderForm();
    }
}
const EditDataSourcePage = wrapSettingsTab("DataSources.Edit", null, EditDataSource);
routes.register("DataSources.Edit", routeWithUserSession({
    path: "/data_sources/:dataSourceId",
    title: "Data Sources",
    render: pageProps => <EditDataSourcePage {...pageProps}/>,
}));
