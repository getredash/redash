import React from 'react';
import { react2angular } from 'react2angular';
import Card from 'antd/lib/card';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography';

export function BeaconConsent() {
  //   if (!clientConfig.showBeaconConsentMessage) {
  //     return;
  //   }

  return (
    <div className="m-t-10 tiled">
      <Card title="Would you like to share aggregated usage information with the Redash team?" bordered={false}>
        <Text type="secondary">
          Shared data includes: number of users, queries, dashboards, alerts, widgets and visulizations. Also types of
          data sources, alert destination and visualizations.
        </Text>
        <Text>All the data is aggregated and does not include anything sensitive or private.</Text>
        <div className="m-t-15">
          <Button type="primary" className="m-r-5">
            Yes
          </Button>
          <Button type="default">No</Button>
        </div>
        <div className="m-t-15">
          <Text type="secondary">
            You can always change your descision from the <a href="">Organization Settings</a> screen.
          </Text>
        </div>
      </Card>
    </div>
  );
}

export default function init(ngModule) {
  ngModule.component('beaconConsent', react2angular(BeaconConsent));
}

init.init = true;
