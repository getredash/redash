import React from 'react';
import Button from "antd/lib/button"


const SubmitButton = ({ onClick }) => {
  return <Button data-test="ExecuteButton" onClick={onClick}>
</Button>
};


export default SubmitButton;