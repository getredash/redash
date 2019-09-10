import React from 'react';
import { react2angular } from 'react2angular';
import Card from 'antd/lib/card';
import Button from 'antd/lib/button';
import Typography from 'antd/lib/typography';
import { clientConfig } from '@/services/auth';

const Text = Typography.Text;

export function BeaconConsent() {
  if (!clientConfig.showBeaconConsentMessage) {
    return;
  }

  // import OrgSettings from '@/services/organizationSettings';
  // OrgSettings.save(this.state.formValues)
  //   .then((response) => {
  //     const settings = get(response, 'settings');
  //     this.setState({ settings, formValues: { ...settings } });
  //   })
  //   .finally(() => this.setState({ submitting: false }));

  return (
    <div className="m-t-10 tiled">
      <Card title="Would you be ok with sharing anonymous usage data with the Redash team?" bordered={false}>
        <Text>Help Redash improve by automatically sending anonymous usage data:</Text>
        <div className="m-t-5">
          <ul>
            <li> Number of users, queries, dashboards, alerts, widgets and visualizations.</li>
            <li> Types of data sources, alert destinations and visualizations.</li>
          </ul>
        </div>
        <Text>All data is aggregated and will never include any sensitive or private data.</Text>
        <div className="m-t-5">
          <Button type="primary" className="m-r-5">
            Yes
          </Button>
          <Button type="default">No</Button>
        </div>
        <div className="m-t-15">
          <Text type="secondary">
            You can change this setting anytime from the <a href="settings/organization">Organization Settings</a> page.
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
