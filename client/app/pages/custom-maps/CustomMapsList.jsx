import { get } from "lodash";
import React from "react";

import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import Paginator from "@/components/Paginator";
import CustomMapDialog from "@/pages/custom-maps/CustomMapDialog";

import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { StateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import wrapSettingsTab from "@/components/SettingsWrapper";
import PlainButton from "@/components/PlainButton";

import CustomMap from "@/services/custom-map";
import { currentUser } from "@/services/auth";
import notification from "@/services/notification";
import routes from "@/services/routes";

class CustomMapsList extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  listColumns = [
    Columns.custom.sortable(
      (text, customMap) => (
        <PlainButton type="link" className="table-main-title" onClick={() => this.showMapDialog(customMap)}>
          {customMap.name}
        </PlainButton>
      ),
      {
        title: "Name",
        field: "name",
        className: "text-nowrap",
      }
    ),
    Columns.avatar({ field: "user", className: "p-l-0 p-r-0" }, (name) => `Created by ${name}`),
    Columns.date.sortable({
      title: "Created At",
      field: "created_at",
      className: "text-nowrap",
      width: "1%",
    }),
    Columns.custom(
      (text, customMap) =>
        currentUser.isAdmin && (
          <Button type="danger" className="w-100" onClick={(e) => this.deleteCustomMap(e, customMap)}>
            Delete
          </Button>
        ),
      {
        width: "1%",
      }
    ),
  ];

  componentDidMount() {
    const { isNewOrEditPage, customMapId } = this.props.controller.params;

    if (isNewOrEditPage) {
      if (customMapId === "new") {
        if (currentUser.isAdmin) {
          this.showMapDialog();
        } else {
          navigateTo("custom_maps", true);
        }
      } else {
        CustomMap.get({ id: customMapId })
          .then(this.showMapDialog)
          .catch((error) => {
            this.props.controller.handleError(error);
          });
      }
    }
  }

  saveCustomMap = (customMap) => {
    const saveFn = customMap.id ? CustomMap.save : CustomMap.create;
    return saveFn(customMap);
  };

  deleteCustomMap = (event, customMap) => {
    Modal.confirm({
      title: "Delete Custom Map",
      content: "Are you sure you want to delete this custom map?",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk: () => {
        CustomMap.delete(customMap)
          .then(() => {
            notification.success("Custom map deleted successfully.");
            this.props.controller.update();
          })
          .catch(() => {
            notification.error("Failed deleting custom map.");
          });
      },
    });
  };

  showMapDialog = (customMap = null) => {
    const canSave = !customMap || currentUser.isAdmin;
    navigateTo("custom_maps/" + get(customMap, "id", "new"), true);
    const goToMapsList = () => navigateTo("custom_maps", true);
    CustomMapDialog.showModal({
      customMap,
      readOnly: !canSave,
    })
      .onClose((customMap) =>
        this.saveCustomMap(customMap).then(() => {
          this.props.controller.update();
          goToMapsList();
        })
      )
      .onDismiss(goToMapsList);
  };

  render() {
    const { controller } = this.props;

    return (
      <div>
        <div className="m-b-15">
          <Button type="primary" onClick={() => this.showMapDialog()} disabled={!currentUser.isAdmin}>
            <i className="fa fa-plus m-r-5" aria-hidden="true" />
            New Custom Map
          </Button>
        </div>

        {!controller.isLoaded && <LoadingState className="" />}
        {controller.isLoaded && controller.isEmpty && (
          <div className="text-center">
            There are no custom maps yet.
            {currentUser.isAdmin && (
              <div className="m-t-5">
                <PlainButton type="link" onClick={() => this.showMapDialog()}>
                  Click here
                </PlainButton>{" "}
                to add one.
              </div>
            )}
          </div>
        )}
        {controller.isLoaded && !controller.isEmpty && (
          <div className="table-responsive">
            <ItemsTable
              items={controller.pageItems}
              columns={this.listColumns}
              context={this.actions}
              orderByField={controller.orderByField}
              orderByReverse={controller.orderByReverse}
              toggleSorting={controller.toggleSorting}
            />
            <Paginator
              showPageSizeSelect
              totalCount={controller.totalItemsCount}
              pageSize={controller.itemsPerPage}
              onPageSizeChange={(itemsPerPage) => controller.updatePagination({ itemsPerPage })}
              page={controller.page}
              onChange={(page) => controller.updatePagination({ page })}
            />
          </div>
        )}
      </div>
    );
  }
}

const CustomMapsListPage = wrapSettingsTab(
  "CustomMaps.List",
  {
    permission: "admin",
    title: "Custom Maps",
    path: "custom_maps",
    order: 6,
  },
  itemsList(
    CustomMapsList,
    () =>
      new ResourceItemsSource({
        isPlainList: true,
        getRequest() {
          return {};
        },
        getResource() {
          return CustomMap.query.bind(CustomMap);
        },
      }),
    () => new StateStorage({ orderByField: "name", itemsPerPage: 10 })
  )
);

routes.register(
  "CustomMaps.List",
  routeWithUserSession({
    path: "/custom_maps",
    title: "Custom Maps",
    render: (pageProps) => <CustomMapsListPage {...pageProps} currentPage="custom_maps" />,
  })
);
routes.register(
  "CustomMaps.NewOrEdit",
  routeWithUserSession({
    path: "/custom_maps/:customMapId",
    title: "Custom Maps",
    render: (pageProps) => <CustomMapsListPage {...pageProps} currentPage="custom_maps" isNewOrEditPage />,
  })
);
