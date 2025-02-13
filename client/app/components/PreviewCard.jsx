import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import Link from "@/components/Link";

// PreviewCard

export function PreviewCard({ imageUrl, roundedImage, title, body, children, className, ...props }) {
  return (
    <div {...props} className={className + " w-100 d-flex align-items-center"}>
      <img
        src={imageUrl}
        width="32"
        height="32"
        className={classNames({ "profile__image--settings": roundedImage }, "m-r-5")}
        alt="Logo/Avatar"
      />
      <div className="flex-fill">
        <div>{title}</div>
        {body && <div className="text-muted">{body}</div>}
      </div>
      {children}
    </div>
  );
}

PreviewCard.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  title: PropTypes.node.isRequired,
  body: PropTypes.node,
  roundedImage: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

PreviewCard.defaultProps = {
  body: null,
  roundedImage: true,
  className: "",
  children: null,
};

// UserPreviewCard

export function UserPreviewCard({ user, withLink, children, ...props }) {
  const title = withLink ? <Link href={"users/" + user.id}>{user.name}</Link> : user.name;
  return (
    <PreviewCard {...props} imageUrl={user.profile_image_url} title={title} body={user.email}>
      {children}
    </PreviewCard>
  );
}

UserPreviewCard.propTypes = {
  user: PropTypes.shape({
    profile_image_url: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  withLink: PropTypes.bool,
  children: PropTypes.node,
};

UserPreviewCard.defaultProps = {
  withLink: false,
  children: null,
};

// DataSourcePreviewCard

export function DataSourcePreviewCard({ dataSource, withLink, children, ...props }) {
  const imageUrl = `/static/images/db-logos/${dataSource.type}.png`;
  const title = withLink ? <Link href={"data_sources/" + dataSource.id}>{dataSource.name}</Link> : dataSource.name;
  return (
    <PreviewCard {...props} imageUrl={imageUrl} title={title}>
      {children}
    </PreviewCard>
  );
}

DataSourcePreviewCard.propTypes = {
  dataSource: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
  }).isRequired,
  withLink: PropTypes.bool,
  children: PropTypes.node,
};

DataSourcePreviewCard.defaultProps = {
  withLink: false,
  children: null,
};
