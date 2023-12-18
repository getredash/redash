import React, { useEffect, useState } from "react";

export default function QueueTable() {
 const [ queue, setQueue ] = useState([]);
 
 useEffect(() => {
   const fetchdata = async () => {
 
       const response = await fetch(
         'http://vs-proddash-dat/api/queue');
          const data = await response.json();

          //use only 3 sample data
          setQueue( data.slice( 0,3) )
      
   }
 
   // Call the function
   fetchdata();
}, []);
 
 return (
   <div className="Table">
     <h1>Current Queue</h1>
     <table>
       <thead>
         <tr>
           <th>Equiptment</th>
           <th>From Date</th>
           <th>To Date</th>
           <th>User</th>
           <th>Database</th>
         </tr>   
       </thead>   
       <tbody>
         {
         queue.map( (queue,key) =>
         <tr key={key}>
             <td className='table-data'>{queue.equiptment}</td>
             <td className='table-data'>{queue.from }</td>
             <td className='table-data'>{queue.to }</td>
             <td className='table-data'>{queue.user }</td>
             <td className='table-data'>{queue.dbName }</td>
         </tr>
         )
       }
       </tbody>
     </table>
   </div>
 );
}