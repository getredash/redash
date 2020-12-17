import React from "react";
import classNames from "classnames";
import Link from "@/components/Link";
type OwnPreviewCardProps = {
    imageUrl: string;
    title: React.ReactNode;
    body?: React.ReactNode;
    roundedImage?: boolean;
    className?: string;
    children?: React.ReactNode;
};
type PreviewCardProps = OwnPreviewCardProps & typeof PreviewCard.defaultProps;
// PreviewCard
export function PreviewCard({ imageUrl, roundedImage, title, body, children, className, ...props }: PreviewCardProps) {
    return (<div {...props} className={className + " w-100 d-flex align-items-center"}>
      <img src={imageUrl} width="32" height="32" className={classNames({ "profile__image--settings": roundedImage }, "m-r-5")} alt="Logo/Avatar"/>
      <div className="flex-fill">
        <div>{title}</div>
        {body && <div className="text-muted">{body}</div>}
      </div>
      {children}
    </div>);
}
PreviewCard.defaultProps = {
    body: null,
    roundedImage: true,
    className: "",
    children: null,
};
type OwnUserPreviewCardProps = {
    user: {
        profile_image_url: string;
        name: string;
        email: string;
    };
    withLink?: boolean;
    children?: React.ReactNode;
};
type UserPreviewCardProps = OwnUserPreviewCardProps & typeof UserPreviewCard.defaultProps;
// UserPreviewCard
export function UserPreviewCard({ user, withLink, children, ...props }: UserPreviewCardProps) {
    const title = withLink ? <Link href={"users/" + (user as any).id}>{user.name}</Link> : user.name;
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null | un... Remove this comment to see the full error message
    return (<PreviewCard {...props} imageUrl={user.profile_image_url} title={title} body={user.email}>
      {children}
    </PreviewCard>);
}
UserPreviewCard.defaultProps = {
    withLink: false,
    children: null,
};
type OwnDataSourcePreviewCardProps = {
    dataSource: {
        name: string;
        type: string;
    };
    withLink?: boolean;
    children?: React.ReactNode;
};
type DataSourcePreviewCardProps = OwnDataSourcePreviewCardProps & typeof DataSourcePreviewCard.defaultProps;
// DataSourcePreviewCard
export function DataSourcePreviewCard({ dataSource, withLink, children, ...props }: DataSourcePreviewCardProps) {
    const imageUrl = `static/images/db-logos/${dataSource.type}.png`;
    const title = withLink ? <Link href={"data_sources/" + (dataSource as any).id}>{dataSource.name}</Link> : dataSource.name;
    return (<PreviewCard {...props} imageUrl={imageUrl} title={title}>
      {children}
    </PreviewCard>);
}
DataSourcePreviewCard.defaultProps = {
    withLink: false,
    children: null,
};
