import React, { useState } from "react";
import "./SearchBar.css";

export const SearchBox = ({ setResults }) => {
  const [input, setInput] = useState("");

  const fetchData = (value) => {
    fetch("http://vs-proddash-dat/api/objects")
      .then((response) => response.json())
      .then((json) => {
        const results = json.filter((data) => {
          return (
            data.description.toLowerCase().includes(value)
          );
        });
        setResults(results);
      });
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setInput(value);
    fetchData(value);
  };

  return (
    <div className="input-wrapper">
      <input
        placeholder="SAP Number, Name or Object..."
        value={input}
        onChange={handleChange}
      />
    </div>
  );
};
