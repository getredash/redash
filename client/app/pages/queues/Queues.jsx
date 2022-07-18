import Select from "antd/lib/select";
import React, { useState } from "react";

import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import PageHeader from "@/components/PageHeader";

import routes from "@/services/routes";

function Queues() {
  let _queues = [
    "periodic",
    "emails",
    "default",
    "scheduled_queries",
    "queries",
    "schemas",
    "long_queries"
  ]

const [option, setOption] = useState("Queues")


  return (
    <div className="page-queries-list">
      <div className="container">
        <PageHeader title="Queues" actions={

          <Select
            className="w-100"
            defaultValue="Choose a queue..."
            optionLabelProp={option}
            onSelect={event => setOption(event)}
          >
            {
              _queues.map(queue_name => (
                <Select.Option key={`queue-${queue_name}`} value={queue_name} />
              ))
            }
          </Select>}
        />
      </div>
    </div>
  );
}


routes.register(
  "Queues",
  routeWithUserSession({
    path: "/queues",
    title: "Queues",
    render: pageProps => <Queues {...pageProps} />,
  })
);