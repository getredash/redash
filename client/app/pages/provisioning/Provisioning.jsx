import React, { useEffect, useState } from "react";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import PageHeader from "@/components/PageHeader";
import * as Sidebar from "@/components/items-list/components/Sidebar";
import Layout from "@/components/layouts/ContentWithSidebar";
import Checkbox from "./components/CheckBox"
import recordEvent from "@/services/recordEvent";
import routes from "@/services/routes";
import DateRangeInput from "@/components/DateRangeInput";
import Select from 'antd/lib/select';
import axios from "axios";


import "./Provisioning.less";

const baseURL = "http://vs-proddash-dat/api/objects";

const onChange = (value) => {
  //console.log(`selected ${value}`);
};
const onSearch = (value) => {
  //console.log('search:', value);
};

// Filter `option.label` match the user type `input`
const filterOption = (input, option) =>
  (option?.label ?? '').toLowerCase().includes(input.toLowerCase());
const ProvideData = () => {
  const [post, setPost] = React.useState(null);

  useEffect(() => {
    axios.get(baseURL).then((response) => {
      setPost(response.data);
    });
  }, []);

  useEffect(() => {
    recordEvent("view", "page", "personal_homepage");
  }, []);

  return (
    <div className="provisioning-page">
      <div className="container">
        <PageHeader title="Provide Historical Data" />
        <Layout>
          <Layout.Sidebar className="m-b-0">
            <form>
              <Select
                showSearch
                placeholder="Select a person"
                optionFilterProp="children"
                onChange={onChange}
                onSearch={onSearch}
                filterOption={filterOption}
                options={post}
              />
              <label htmlFor="dateRangeInput">Select Date Range:</label>
              <DateRangeInput id="dateRangeInput" />
              <Checkbox />
            </form>
          </Layout.Sidebar>
        </Layout>
      </div>
    </div>
  );
};

routes.register(
  "Provisioning",
  routeWithUserSession({
    path: "/provisioning",
    title: "Provide Data",
    render: pageProps => <ProvideData {...pageProps} currentPage="all" />,
  })
);