import React, { useState } from "react";
import Card from "antd/lib/card";
import Button from "antd/lib/button";
import Typography from "antd/lib/typography";
import { clientConfig } from "@/services/auth";
import HelpTrigger from "@/components/HelpTrigger";
import DynamicComponent from "@/components/DynamicComponent";
import OrgSettings from "@/services/organizationSettings";

const Text = Typography.Text;

function BeaconConsent() {
  const [hide, setHide] = useState(false);

  if (!clientConfig.showBeaconConsentMessage || hide) {
    return null;
  }

  const hideConsentCard = () => {
    clientConfig.showBeaconConsentMessage = false;
    setHide(true);
  };

  const confirmConsent = confirm => {
    let message = "🙏 Thank you.";

    if (!confirm) {
      message = "Settings Saved.";
    }

    OrgSettings.save({ beacon_consent: confirm }, message)
      // .then(() => {
      //   // const settings = get(response, 'settings');
      //   // this.setState({ settings, formValues: { ...settings } });
      // })
      .finally(hideConsentCard);
  };

  return (
    <DynamicComponent name="BeaconConsent">
      <div className="m-t-10 tiled">
        <Card
          title={
            <>
              Would you be ok with sharing anonymous usage data with the Redash team?{" "}
              <HelpTrigger type="USAGE_DATA_SHARING" />
            </>
          }
          bordered={false}>
          <Text>Help Redash improve by automatically sending anonymous usage data:</Text>
          <div className="m-t-5">
            <ul>
              <li> Number of users, queries, dashboards, alerts, widgets and visualizations.</li>
              <li> Types of data sources, alert destinations and visualizations.</li>
            </ul>
          </div>
          <Text>All data is aggregated and will never include any sensitive or private data.</Text>
          <div className="m-t-5">
            <Button type="primary" className="m-r-5" onClick={() => confirmConsent(true)}>
              Yes
            </Button>
            <Button type="default" onClick={() => confirmConsent(false)}>
              No
            </Button>
          </div>
          <div className="m-t-15">
            <Text type="secondary">
              You can change this setting anytime from the <a href="settings/organization">Organization Settings</a>{" "}
              page.
            </Text>
          </div>
        </Card>
      </div>
    </DynamicComponent>
  );
}

export default BeaconConsent;
