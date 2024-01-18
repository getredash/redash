import React, { useEffect, useState } from "react";
import Table from "antd/lib/table";
import axios from "axios";
import { CloseOutlined, CheckOutlined, DeleteOutlined } from "@ant-design/icons";
import notification from "antd/lib/notification";
import Popconfirm from "antd/lib/popconfirm";

import 'antd/lib/notification/style/index.css';
import "./styles.css";

export default function QueueTable() {
 const [ queue, setQueue ] = useState([]);

 const openSuccessNotification = () => {
  notification.success({
    message: 'Success',
    placement: "bottomLeft",
    description: 'The queue has been successfully modified!',
    duration: 5, // Notification will hide after 5 seconds
  });
};

const openErrorNotification = () => {
  notification.error({
    message: 'Error',
    placement: "bottomLeft",
    description: 'There was an error submitting your data.',
    duration: 5, // Notification will hide after 5 seconds
  });
};
 useEffect(() => {
   const fetchdata = async () => {
       const response = await fetch(
         'https://vs-proddash-dat.ad.vetter-group.de/api/queue');
          const data = await response.json();
          setQueue(data);
   }
   fetchdata();
}, []);

const handleDelete = async (key) => {
  try {
    await axios.delete(`https://vs-proddash-dat.ad.vetter-group.de/api/queue/id=${key}`);
    // Refresh the table data after successful deletion
    const response = await fetch('https://vs-proddash-dat.ad.vetter-group.de/api/queue');
    const data = await response.json();
    setQueue(data);
    openSuccessNotification();
  } catch (error) {
    console.error('Error deleting data:', error);
    openErrorNotification();
  }
};

const columns = [
  {
    title: 'Equiptment',
    dataIndex: 'equiptment',
    key: 'equiptment',
  },
  {
    title: 'From',
    dataIndex: 'from',
    key: 'from',
  },
  {
    title: 'To',
    dataIndex: 'to',
    key: 'to',
  },
  {
    title: 'User',
    dataIndex: 'user',
    key: 'user',
  },
  {
    title: 'Database Name',
    dataIndex: 'dbName',
    key: 'dbName',
  },
  {
    title: 'State',
    dataIndex: 'state',
    key: 'state',
  },
  {
    title: 'Keep Updated',
    dataIndex: 'keepUpdated',
    key: 'keepUpdated',
    render: (keepUpdated) => (keepUpdated ? <CheckOutlined/> : <CloseOutlined/>),
  },
  {
    title: 'Edit',
    dataIndex: 'key',
    key: 'key',
    render: (key) => (
      <Popconfirm
      title="Are you sure to delete this item?"
      onConfirm={() => handleDelete(key)}
      okText="Yes"
      cancelText="No"
    >
      <button type="button" className="deletebutton">
        <DeleteOutlined />
        Delete
      </button>
    </Popconfirm>
    ),
  },
];
 
 return (
  <><div className="headinglabel">
     <h4>Currently available data:</h4>
   </div><div className="Table">
       <Table dataSource={queue} columns={columns} />
     </div></>
 );
}
