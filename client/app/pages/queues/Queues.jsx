import Select from "antd/lib/select";
import Table from 'antd/lib/table';
import Button from 'antd/lib/button'
import Col from 'antd/lib/col';
import Row from 'antd/lib/row';
import Checkbox from 'antd/lib/checkbox'

import React, { useEffect, useState } from "react";

import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import PageHeader from "@/components/PageHeader";

import { axios } from "@/services/axios";
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

  function secondsToHms(d) {
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours ") : "";
    var mDisplay = m > 0 ? m + (m === 1 ? " minute " : " minutes ") : "";
    var sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
    return hDisplay + mDisplay + sDisplay;
  }

  const renderTimeEnqueue = (e) => {
    let timeNow = new Date(Date.now());

    // Server sends time in GMT.
    let timeEnqueued = new Date(e + "+00:00");

    let timeElapsed = Math.floor((timeNow - timeEnqueued) / 1000)

    return secondsToHms(timeElapsed)
  }

  const columns = [
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order'
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: 'Data Source',
      dataIndex: 'data_source',
      key: 'data_source',
    },
    {
      title: 'Time Enqueued',
      dataIndex: 'enqueued_at',
      key: 'enqueued_at',
      render: e => renderTimeEnqueue(e)
    },
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query',
      render: e => {
        return (<Button
          shape="circle"
          type="link"
          href={`/queries/${e["query_id"]}/`}>
            {e["query_name"]}
        </Button>
        )
      }
    }
  ]

  const [option, setOption] = useState("long_queries")
  const [dataSource, setDataSource] = useState([])
  const [onlyMyQueries, setOnlyMyQueries] = useState(false)


  const fetchJobData = async (event, onlyMyQueries) => {

    let jobs = await axios.get(`/api/queue/${event}?onlyMy=${onlyMyQueries}`)
    setDataSource(jobs);
  }

  useEffect(() => {
    fetchJobData(option, onlyMyQueries);
  }, [option, onlyMyQueries]);

  return (
    <div className="page-queries-list">
      <div className="container">
        <PageHeader title="Queues" actions={
          <Row align='middle'>
            <Col span={12}>

              <Checkbox
                style={{
                  "margin": "auto 10px"
                }}
                onClick={() => setOnlyMyQueries(!onlyMyQueries)}
              >
                My queries only
              </Checkbox>
            </Col>
            <Col span={12}>
              <Button
                type="primary"
                style={{
                  "margin": "auto 10px",
                  "width": "100%"
                }}
                onClick={e => fetchJobData(option, onlyMyQueries)}
              >
                Refresh
              </Button>
            </Col>
            <Col span={24}>
              <Select
                className="w-100"
                defaultValue={option}
                optionLabelProp={option}
                style={{
                  "margin": "10px 10px",
                  "padding": "10px auto"
                }}
                onSelect={event => {
                  setOption(event);
                }
                }
              >
                {
                  _queues.map(queue_name => (
                    <Select.Option key={`queue-${queue_name}`} value={queue_name} />
                  ))
                }
              </Select>
            </Col>
          </Row>
        }
        />
      </div>
      <div style={{ margin: "20px" }} className="bg-white tiled table-responsive">
        <Table dataSource={dataSource} columns={columns} pagination={false} rowKey={'enqueued_at'} />
      </div>
    </div >
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