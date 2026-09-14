import React from "react";
import PropTypes from "prop-types";

import Link from "@/components/Link";
import PageHeader from "@/components/PageHeader";

import "./DeploymentGuide.less";

const steps = [
  {
    title: "Prepare the template organization",
    body:
      "Build each sub-dashboard in the template org and publish it — a draft or archived dashboard " +
      "never reaches the Sub-Dashboards list. Every data source its queries use needs a data source " +
      "identifier that each target organization also carries, including the one behind an " +
      "allowed-widgets query. Every sub-dashboard in a composition must name that same " +
      "allowed-widgets query: nothing enforces it, and a mismatch deploys a dashboard showing " +
      "every widget.",
    note: "Done in the template org's own Redash, not here.",
  },
  {
    title: "Assign sub-dashboards",
    body:
      "Say which organizations each sub-dashboard belongs to. Assignment is what makes an " +
      "organization a deployment target, unless the organization is excluded from deployment " +
      "— an org with nothing assigned receives nothing.",
    href: "sub-dashboards",
    linkLabel: "Sub-Dashboards",
  },
  {
    title: "Compose the dashboard",
    body:
      "Create a composed dashboard and add the sub-dashboards in the order they should stack, " +
      "leaving out any that no organization is assigned. The name and URL identifier here " +
      "become the deployed dashboard's.",
    href: "composed-dashboards",
    linkLabel: "Composed Dashboards",
  },
  {
    title: "Deploy and check the run",
    body:
      "Deploy from the composed dashboards list, with an optional comment. Deployment is all or " +
      "nothing: if one organization fails, nothing is deployed. Every run is kept in the history.",
    href: "composed-dashboards",
    linkLabel: "Composed Dashboards",
  },
];

function Step({ index, step }) {
  const body = (
    <React.Fragment>
      <span className="deployment-guide-step-number">{index + 1}</span>
      <h4 className="deployment-guide-step-title">{step.title}</h4>
      <p className="deployment-guide-step-body">{step.body}</p>
      {step.href ? (
        <span className="deployment-guide-step-link">Go to {step.linkLabel} &rarr;</span>
      ) : (
        <span className="deployment-guide-step-note">{step.note}</span>
      )}
    </React.Fragment>
  );

  if (!step.href) {
    return <div className="deployment-guide-step">{body}</div>;
  }

  return (
    <Link className="deployment-guide-step deployment-guide-step-clickable" href={step.href}>
      {body}
    </Link>
  );
}

Step.propTypes = {
  index: PropTypes.number.isRequired,
  step: PropTypes.object.isRequired,
};

export default function DeploymentGuide() {
  return (
    <div className="container deployment-guide">
      <PageHeader title="Deploying a composed dashboard" />
      <p className="text-muted m-b-20">
        A composed dashboard is an ordered set of template dashboards. Deploying it gives each target
        organization one dashboard built from the sub-dashboards assigned to that organization.
      </p>
      <div className="deployment-guide-steps">
        {steps.map((step, index) => (
          <Step key={step.title} index={index} step={step} />
        ))}
      </div>
      <div className="bg-white tiled deployment-guide-notes">
        <h4>What a deployment handles on its own</h4>
        <ul>
          <li>Maps each template data source to the target organization&apos;s data source with the same identifier.</li>
          <li>Copies the queries, and on a redeploy updates those copies instead of duplicating them.</li>
          <li>
            Copies the allowed-widgets query once for the whole composition, not once per sub-dashboard,
            and points the deployed dashboard at that copy.
          </li>
          <li>Stacks the widgets of each sub-dashboard in the composition&apos;s order.</li>
          <li>
            Creates the dashboard <strong>unpublished</strong>, so it stays out of the target
            organization&apos;s list until someone there publishes it. A redeploy never changes that.
          </li>
          <li>Validates data sources, allowed-widgets queries and parameter types before writing anything.</li>
          <li>Deletes visualizations, and the queries behind them, that the templates no longer reference.</li>
          <li>
            Runs the allowed-widgets query and every dropdown-dependency query after the deployment
            commits, so those parameters populate the first time the dashboard is opened.
          </li>
        </ul>
      </div>
    </div>
  );
}
