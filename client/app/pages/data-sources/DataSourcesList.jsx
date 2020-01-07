import React from "react";
import Button from "antd/lib/button";
import { react2angular } from "react2angular";
import { isEmpty, get } from "lodash";
import { DataSource, IMG_ROOT } from "@/services/data-source";
import { policy } from "@/services/policy";
import navigateTo from "@/services/navigateTo";
import { $route } from "@/services/ng";
import { routesToAngularRoutes } from "@/lib/utils";
import CardsList from "@/components/cards-list/CardsList";
import LoadingState from "@/components/items-list/components/LoadingState";
import CreateSourceDialog from "@/components/CreateSourceDialog";
import DynamicComponent from "@/components/DynamicComponent";
import helper from "@/components/dynamic-form/dynamicFormHelper";
import wrapSettingsTab from "@/components/SettingsWrapper";
import recordEvent from "@/services/recordEvent";

class DataSourcesList extends React.Component {
  state = {
    dataSourceTypes: [],
    dataSources: [],
    loading: true,
  };

  newDataSourceDialog = null;

  componentDidMount() {
    Promise.all([DataSource.query().$promise, DataSource.types().$promise]).then(values =>
      this.setState(
        {
          dataSources: values[0],
          dataSourceTypes: values[1],
          loading: false,
        },
        () => {
          // all resources are loaded in state
          if ($route.current.locals.isNewDataSourcePage) {
            if (policy.canCreateDataSource()) {
              this.showCreateSourceDialog();
            } else {
              navigateTo("/data_sources");
            }
          }
        }
      )
    );
  }

  componentWillUnmount() {
    if (this.newDataSourceDialog) {
      this.newDataSourceDialog.dismiss();
    }
  }

  createDataSource = (selectedType, values) => {
    const target = { options: {}, type: selectedType.type };
    helper.updateTargetWithValues(target, values);

    return DataSource.save(target)
      .$promise.then(dataSource => {
        this.setState({ loading: true });
        DataSource.query(dataSources => this.setState({ dataSources, loading: false }));
        return dataSource;
      })
      .catch(error => {
        if (!(error instanceof Error)) {
          error = new Error(get(error, "data.message", "Failed saving."));
        }
        return Promise.reject(error);
      });
  };

  showCreateSourceDialog = () => {
    recordEvent("view", "page", "data_sources/new");
    this.newDataSourceDialog = CreateSourceDialog.showModal({
      types: this.state.dataSourceTypes,
      sourceType: "Data Source",
      imageFolder: IMG_ROOT,
      helpTriggerPrefix: "DS_",
      onCreate: this.createDataSource,
    });

    this.newDataSourceDialog.result
      .then((result = {}) => {
        this.newDataSourceDialog = null;
        if (result.success) {
          navigateTo(`data_sources/${result.data.id}`);
        }
      })
      .catch(() => {
        this.newDataSourceDialog = null;
      });
  };

  renderDataSources() {
    const { dataSources } = this.state;
    const items = dataSources.map(dataSource => ({
      title: dataSource.name,
      imgSrc: `${IMG_ROOT}/${dataSource.type}.png`,
      href: `data_sources/${dataSource.id}`,
    }));

    return isEmpty(dataSources) ? (
      <div className="text-center">
        There are no data sources yet.
        {policy.isCreateDataSourceEnabled() && (
          <div className="m-t-5">
            <a className="clickable" onClick={this.showCreateSourceDialog}>
              Click here
            </a>{" "}
            to add one.
          </div>
        )}
      </div>
    ) : (
      <CardsList items={items} />
    );
  }

  render() {
    const newDataSourceProps = {
      type: "primary",
      onClick: policy.isCreateDataSourceEnabled() ? this.showCreateSourceDialog : null,
      disabled: !policy.isCreateDataSourceEnabled(),
    };

    return (
      <div>
        <div className="m-b-15">
          <Button {...newDataSourceProps}>
            <i className="fa fa-plus m-r-5" />
            New Data Source
          </Button>
          <DynamicComponent name="DataSourcesListExtra" />
        </div>
        {this.state.loading ? <LoadingState className="" /> : this.renderDataSources()}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component(
    "pageDataSourcesList",
    react2angular(
      wrapSettingsTab(
        {
          permission: "admin",
          title: "Data Sources",
          path: "data_sources",
          order: 1,
        },
        DataSourcesList
      )
    )
  );

  return routesToAngularRoutes(
    [
      {
        path: "/data_sources",
        title: "Data Sources",
        key: "data_sources",
      },
      {
        path: "/data_sources/new",
        title: "Data Sources",
        key: "data_sources",
        isNewDataSourcePage: true,
      },
    ],
    {
      template: "<page-data-sources-list></page-data-sources-list>",
      controller($scope, $exceptionHandler) {
        "ngInject";

        $scope.handleError = $exceptionHandler;
      },
    }
  );
}

init.init = true;
