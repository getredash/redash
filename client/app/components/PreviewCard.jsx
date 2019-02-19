import React from 'react';
import PropTypes from 'prop-types';

// PreviewCard

export function PreviewCard({ imageUrl, title, body, children }) {
  return (
    <div className="w-100 d-flex align-items-center">
      <img src={imageUrl} height="32" className="profile__image--settings m-r-5" alt="Logo/Avatar" />
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
  children: PropTypes.node,
};

PreviewCard.defaultProps = {
  body: null,
  children: null,
};

// UserPreviewCard

export function UserPreviewCard({ user, withLink, children }) {
  const title = withLink ? <a href={'users/' + user.id}>{user.name}</a> : user.name;
  return (
    <PreviewCard imageUrl={user.profile_image_url} title={title} body={user.email}>
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

export function DataSourcePreviewCard({ dataSource, withLink, children }) {
  const imageUrl = `/static/images/db-logos/${dataSource.type}.png`;
  const title = withLink ? <a href={'data_sources/' + dataSource.id}>{dataSource.name}</a> : dataSource.name;
  return <PreviewCard imageUrl={imageUrl} title={title}>{children}</PreviewCard>;
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
