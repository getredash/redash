import React, { useState } from "react";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import PageHeader from "@/components/PageHeader";
// import * as Sidebar from "@/components/items-list/components/Sidebar";
import Layout from "@/components/layouts/ContentWithSidebar";
// import recordEvent from "@/services/recordEvent";
import routes from "@/services/routes";
import Button from "antd/lib/button";
import CheckBox from "./components/CheckBox";
import DateRangePicker from "./components/DateRangePicker";
import SelectComponent from "./components/SelectComponent";
import axios from "axios";
import QueueTable from "./components/QueueTable";

import "./provisioning.css";


const ProvideData = () => {

  const [selectedValue, setSelectedValue] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isChecked, setIsChecked] = useState(false);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };

  const handleSubmit = () => {
    // Post data to API
    const postData = {
      selectValue: selectedValue,
      dateValue: selectedDate,
      isChecked: isChecked,
    };
    const schema = {
      "equiptment_ID": 2004755,
      "from": "2023-12-19",
      "to": "2023-12-23",
      "user": "Max Muster",
      "dbName": "GTXX",
      "state": "Pending..."
    }
    console.log(schema);
    axios.post('http://vs-proddash-dat/api/queue', schema).then((response) => {
      console.log(response);
    });
  };

  return (
    <div className="provisioning-page">
      <div className="container">
        <PageHeader title="Provide Historical Data" />
        <Layout>
          <Layout.Sidebar className="m-b-0">
            <div className="selectcomponent selectionitem">
              <h5>Add equiptment and date range to queue: </h5>
              <SelectComponent />
            </div>
            <div className="daterangecomponent selectionitem">
              <DateRangePicker selectedDate={selectedDate} onChange={handleDateChange} />
              <div />
              <div className="checkboxcomponent selectionitem">
                <CheckBox checked={isChecked} onChange={handleCheckboxChange} />
                {isChecked && <p style={{ color: 'red' }}>Warning: This option results in higher data usage and should only be considered if neccessary!</p>}
              </div>
              <div className="submitbutton selectionitem">
                <Button block type="primary" onClick={handleSubmit}>
                <i className="fa fa-plus m-r-5" aria-hidden="true" />
                Submit
              </Button>
              </div>
            </div>
          </Layout.Sidebar>
          <Layout.Content>
            <QueueTable/>
          </Layout.Content>
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