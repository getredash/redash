import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";

export default class FavoritesControl extends React.Component {
  static propTypes = {
    item: PropTypes.shape({
      is_favorite: PropTypes.bool.isRequired,
    }).isRequired,
    readOnly: PropTypes.bool,
    onChange: PropTypes.func,
    className: PropTypes.string,
  };

  static defaultProps = {
    readOnly: false,
    onChange: () => {},
    className: null,
  };

  toggleItem(event, item, callback) {
    const action = item.is_favorite ? item.unfavorite.bind(item) : item.favorite.bind(item);
    const savedIsFavorite = item.is_favorite;

    action().then(() => {
      item.is_favorite = !savedIsFavorite;
      this.forceUpdate();
      callback();
    });
  }

  render() {
    const { item, readOnly, onChange, className, ...props } = this.props;
    const icon = item.is_favorite ? "fa fa-star" : "fa fa-star-o";
    const title = item.is_favorite ? "Remove from favorites" : "Add to favorites";

    if (readOnly) {
      return (
        <span {...props} className={cx("favorites-control btn-favourite", className)}>
          <i className={icon} aria-hidden="true" />
        </span>
      );
    }

    return (
      <a
        {...props}
        title={title}
        className={cx("favorites-control btn-favourite", className)}
        onClick={event => this.toggleItem(event, item, onChange)}>
        <i className={icon} aria-hidden="true" />
      </a>
    );
  }
}
