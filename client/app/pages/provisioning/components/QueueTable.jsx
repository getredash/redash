import React, { useEffect, useState } from "react";
import Table from "antd/lib/table";
import axios from "axios";
import { CloseOutlined, CheckOutlined, DeleteOutlined } from "@ant-design/icons";

import "./styles.css";

export default function QueueTable() {
 const [ queue, setQueue ] = useState([]);
 
 useEffect(() => {
   const fetchdata = async () => {
       const response = await fetch(
         'http://vs-proddash-dat/api/queue');
          const data = await response.json();
          setQueue(data);
   }
   fetchdata();
}, []);

const handleDelete = async (id) => {
  try {
    await axios.delete(`http://vs-proddash-dat/api/queue/${id}`);
    // Refresh the table data after successful deletion
    const response = await fetch('http://vs-proddash-dat/api/queue');
    const data = await response.json();
    setQueue(data);
  } catch (error) {
    console.error('Error deleting data:', error);
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
    dataIndex: 'id',
    key: 'id',
    render: (id) => (
      <button type="button" className="deletebutton" onClick={() => handleDelete(id)}>
        <DeleteOutlined />
        Delete
      </button>
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