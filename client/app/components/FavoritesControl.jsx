import React from "react";
import PropTypes from "prop-types";
import { $rootScope } from "@/services/ng";

export default class FavoritesControl extends React.Component {
  static propTypes = {
    item: PropTypes.shape({
      is_favorite: PropTypes.bool.isRequired,
    }).isRequired,
    onChange: PropTypes.func,
  };

  static defaultProps = {
    onChange: () => {},
  };

  toggleItem(event, item, callback) {
    const action = item.is_favorite ? item.$unfavorite.bind(item) : item.$favorite.bind(item);
    const savedIsFavorite = item.is_favorite;

    action().then(() => {
      item.is_favorite = !savedIsFavorite;
      this.forceUpdate();
      $rootScope.$broadcast("reloadFavorites");
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
