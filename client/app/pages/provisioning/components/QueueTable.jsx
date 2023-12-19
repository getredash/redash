import React, { useEffect, useState } from "react";
import Table from "antd/lib/table";

export default function QueueTable() {
 const [ queue, setQueue ] = useState([]);
 
 useEffect(() => {
   const fetchdata = async () => {
       const response = await fetch(
         'http://vs-proddash-dat/api/queue');
          const data = await response.json();
          setQueue(data )
   }
   fetchdata();
}, []);

const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
  },
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
    title: 'Action',
    dataIndex: '',
    key: 'id',
    render: () => <a>Delete</a>,
  },
];
 
 return (
   <div className="Table">
      <Table dataSource={queue} columns={columns} />
   </div>
 );
}