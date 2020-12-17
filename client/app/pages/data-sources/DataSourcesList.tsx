import { isEmpty, reject } from "lodash";
import React from "react";
import Button from "antd/lib/button";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import CardsList from "@/components/cards-list/CardsList";
import LoadingState from "@/components/items-list/components/LoadingState";
import CreateSourceDialog from "@/components/CreateSourceDialog";
import DynamicComponent, { registerComponent } from "@/components/DynamicComponent";
import helper from "@/components/dynamic-form/dynamicFormHelper";
import wrapSettingsTab from "@/components/SettingsWrapper";
import DataSource, { IMG_ROOT } from "@/services/data-source";
import { policy } from "@/services/policy";
import recordEvent from "@/services/recordEvent";
import routes from "@/services/routes";
export function DataSourcesListComponent({ dataSources, onClickCreate }: any) {
    const items = dataSources.map((dataSource: any) => ({
        title: dataSource.name,
        imgSrc: `${IMG_ROOT}/${dataSource.type}.png`,
        href: `data_sources/${dataSource.id}`
    }));
    return isEmpty(dataSources) ? (<div className="text-center">
      There are no data sources yet.
      {policy.isCreateDataSourceEnabled() && (<div className="m-t-5">
          <a className="clickable" onClick={onClickCreate} data-test="CreateDataSourceLink">
            Click here
          </a>{" "}
          to add one.
        </div>)}
    </div>) : (<CardsList items={items}/>);
}
registerComponent("DataSourcesListComponent", DataSourcesListComponent);
type OwnDataSourcesListProps = {
    isNewDataSourcePage?: boolean;
    onError?: (...args: any[]) => any;
};
type DataSourcesListState = any;
type DataSourcesListProps = OwnDataSourcesListProps & typeof DataSourcesList.defaultProps;
class DataSourcesList extends React.Component<DataSourcesListProps, DataSourcesListState> {
    static defaultProps = {
        isNewDataSourcePage: false,
        onError: () => { },
    };
    state = {
        dataSourceTypes: [],
        dataSources: [],
        loading: true,
    };
    newDataSourceDialog = null;
    componentDidMount() {
        Promise.all([DataSource.query(), DataSource.types()])
            .then(values => this.setState({
            dataSources: values[0],
            dataSourceTypes: values[1],
            loading: false,
        }, () => {
            // all resources are loaded in state
            if (this.props.isNewDataSourcePage) {
                if (policy.canCreateDataSource()) {
                    this.showCreateSourceDialog();
                }
                else {
                    navigateTo("data_sources", true);
                }
            }
        }))
            .catch(error => this.props.onError(error));
    }
    componentWillUnmount() {
        if (this.newDataSourceDialog) {
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            this.newDataSourceDialog.dismiss();
        }
    }
    createDataSource = (selectedType: any, values: any) => {
        const target = { options: {}, type: selectedType.type };
        helper.updateTargetWithValues(target, values);
        return DataSource.create(target).then(dataSource => {
            this.setState({ loading: true });
            DataSource.query().then(dataSources => this.setState({ dataSources, loading: false }));
            return dataSource;
        });
    };
    showCreateSourceDialog = () => {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
        recordEvent("view", "page", "data_sources/new");
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ close: (result: any) => any; dismiss: (res... Remove this comment to see the full error message
        this.newDataSourceDialog = CreateSourceDialog.showModal({
            types: reject(this.state.dataSourceTypes, "deprecated"),
            sourceType: "Data Source",
            imageFolder: IMG_ROOT,
            helpTriggerPrefix: "DS_",
            onCreate: this.createDataSource,
        });
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        this.newDataSourceDialog
            .onClose((result = {}) => {
            this.newDataSourceDialog = null;
            if ((result as any).success) {
                navigateTo(`data_sources/${(result as any).data.id}`);
            }
        })
            .onDismiss(() => {
            this.newDataSourceDialog = null;
            navigateTo("data_sources", true);
        });
    };
    render() {
        const newDataSourceProps = {
            type: "primary",
            onClick: policy.isCreateDataSourceEnabled() ? this.showCreateSourceDialog : null,
            disabled: !policy.isCreateDataSourceEnabled(),
            "data-test": "CreateDataSourceButton",
        };
        return (<div>
        <div className="m-b-15">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: (string | Element)[]; type: stri... Remove this comment to see the full error message */}
          <Button {...newDataSourceProps}>
            <i className="fa fa-plus m-r-5"/>
            New Data Source
          </Button>
          <DynamicComponent name="DataSourcesListExtra"/>
        </div>
        {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
        {this.state.loading ? (<LoadingState className=""/>) : (<DynamicComponent name="DataSourcesListComponent" dataSources={this.state.dataSources} onClickCreate={this.showCreateSourceDialog}/>)}
      </div>);
    }
}
const DataSourcesListPage = wrapSettingsTab("DataSources.List", {
    permission: "admin",
    title: "Data Sources",
    path: "data_sources",
    order: 1,
}, DataSourcesList);
routes.register("DataSources.List", routeWithUserSession({
    path: "/data_sources",
    title: "Data Sources",
    render: pageProps => <DataSourcesListPage {...pageProps}/>,
}));
routes.register("DataSources.New", routeWithUserSession({
    path: "/data_sources/new",
    title: "Data Sources",
    render: pageProps => <DataSourcesListPage {...pageProps} isNewDataSourcePage/>,
}));
