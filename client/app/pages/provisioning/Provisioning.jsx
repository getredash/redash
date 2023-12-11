import React, { useEffect, useState } from "react";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import PageHeader from "@/components/PageHeader";
import { SearchBar } from "@/components/searchbar/SearchBar";
import { SearchResultsList } from "@/components/searchbar/SearchResultsList";
import recordEvent from "@/services/recordEvent";
import routes from "@/services/routes";
import DateRangeInput from "@/components/DateRangeInput";


import "./Provisioning.less";

const ProvideData = () => {
  const [results, setResults] = useState([]);
  const [checked, setChecked] = React.useState(false);

  const handleChange = () => {
    setChecked(!checked);
  };
  useEffect(() => {
    recordEvent("view", "page", "personal_homepage");
  }, []);

  return (
    <div className="provisioning-page">
      <div className="container">
        <PageHeader title="Provide Historical Data" />
        <form>
          <div className="form-group">
            <label htmlFor="searchInput">Search for Desired Machine:</label>
            <SearchBar id="searchInput" setResults={setResults} />
          </div>
          {results.length > 0 && <SearchResultsList results={results} />}
          <div className="form-group">
          <label htmlFor="dateRangeInput">Select Date Range:</label>
          <DateRangeInput id="dateRangeInput" />
          </div>
          <div class="form-group">
            <label htmlFor="keepdata">Keep data up to date</label>
            <input name="keepdata" id="keepdata" type="checkbox" checked={checked} onChange={handleChange}/>
          </div>
        </form>
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