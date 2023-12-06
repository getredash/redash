import React,{ useState } from "react";
import SearchOutlined from "@ant-design/icons/SearchOutlined";
import "./SearchBar.css";

export const SearchBar = ({ setResults }) => {
  const [input, setInput] = useState("");

  const fetchData = (value) => {
    fetch("http://vs-proddash-dat/api/objects")
      .then((response) => response.json())
      .then((json) => {
        
        const results = json.filter((equiptment) => {
          return (
            value &&
            equiptment &&
            equiptment.name &&
            equiptment.name.toLowerCase().includes(value)
          );
        });
        setResults(results);
      });
  };

  const handleChange = (value) => {
    setInput(value);
    fetchData(value);
  };

  return (
    <div className="input-wrapper">
        <SearchOutlined/>
      <input
        placeholder="SAP Number, Name or Object..."
        value={input}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
};
