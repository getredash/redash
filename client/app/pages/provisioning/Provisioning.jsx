import React, { useState } from "react";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import PageHeader from "@/components/PageHeader";
import * as Sidebar from "@/components/items-list/components/Sidebar";
import Layout from "@/components/layouts/ContentWithSidebar";
import recordEvent from "@/services/recordEvent";
import routes from "@/services/routes";
import SubmitButton from "./components/SubmitButton";
import CheckBox from "./components/CheckBox";
import DateRangePicker from "./components/DateRangePicker";
import SelectComponent from "./components/SelectComponent";
import axios from "axios";

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

    axios.post('http://vs-proddash-dat/api/provisioning', postData).then((response) => {
      // Handle response if needed
    });
  };

  return (
    <div className="provisioning-page">
      <div className="container">
        <PageHeader title="Provide Historical Data" />
        <Layout>
          <Layout.Sidebar className="m-b-0">
            <div className="selectcomponent selectionitem">
              <SelectComponent />
            </div>
            <div className="daterangecomponent selectionitem">
              <DateRangePicker selectedDate={selectedDate} onChange={handleDateChange} />
              <div />
              <div className="checkboxcomponent selectionitem">
                <CheckBox checked={isChecked} onChange={handleCheckboxChange} />
                {isChecked && <p style={{ color: 'red' }}>Warning: This option results in higher data usage and should only be considered if truly neccessary!</p>}
              </div>
              <div className="submitbutton selectionitem">
                <SubmitButton onClick={handleSubmit} />
              </div>
            </div>
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