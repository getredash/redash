import React, { useState } from 'react';
import Checkbox from 'antd/lib/checkbox/Checkbox';

import "./checkbox.css";


const CheckBox = () => {
  const [checked, setChecked] = useState(false); // Set the initial state to false
  const [disabled, setDisabled] = useState(false);

  const toggleChecked = () => {
    setChecked(!checked);
  };

  const toggleDisable = () => {
    setDisabled(!disabled);
  };

  const onChange = (e) => {
    setChecked(e.target.checked);
  };

  const label = `Keep data up-to-date periodically`;

  return (
    <div>
        <div className='check'>
            <Checkbox checked={checked} disabled={disabled} onChange={onChange}>
                {label}
            </Checkbox>
        </div>
        <div className='warning'>
            {checked && <p>Warning: This option results in higher storage usage and should only be used if neccessary!</p>}
        </div>
    </div>
  );
};

export default CheckBox;
