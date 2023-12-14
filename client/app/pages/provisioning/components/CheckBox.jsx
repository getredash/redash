import React from 'react';

const CheckBox = ({ checked, onChange }) => {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={onChange} />
      Keep data up-to-date
    </label>
  );
};


export default CheckBox;