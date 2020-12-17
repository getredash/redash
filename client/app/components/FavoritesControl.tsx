import React from "react";

type OwnProps = {
    item: {
        is_favorite: boolean;
    };
    onChange?: (...args: any[]) => any;
};

type Props = OwnProps & typeof FavoritesControl.defaultProps;

export default class FavoritesControl extends React.Component<Props> {

  static defaultProps = {
    onChange: () => {},
  };

  toggleItem(event: any, item: any, callback: any) {
    const action = item.is_favorite ? item.unfavorite.bind(item) : item.favorite.bind(item);
    const savedIsFavorite = item.is_favorite;

    action().then(() => {
      item.is_favorite = !savedIsFavorite;
      this.forceUpdate();
      callback();
    });
  }

  render() {
    const { item, onChange } = this.props;
    const icon = item.is_favorite ? "fa fa-star" : "fa fa-star-o";
    const title = item.is_favorite ? "Remove from favorites" : "Add to favorites";
    return (
      <a
        title={title}
        className="favorites-control btn-favourite"
        onClick={event => this.toggleItem(event, item, onChange)}>
        <i className={icon} aria-hidden="true" />
      </a>
    );
  }
}
