import React from "react";
import PropTypes from "prop-types";
import useRefreshCooldown from "@/lib/hooks/useRefreshCooldown";

// Button label that appends a live `(Ns)` countdown while a refresh cooldown is active.
// It owns the per-second countdown state, so during cooldown only this label re-renders —
// the surrounding page (editor, visualizations) stays off the 1Hz render path.
export default function RefreshCooldownLabel({ retrievedAt, label, children }) {
  const { isCooldownActive, remainingTime } = useRefreshCooldown(retrievedAt);
  return <React.Fragment>{isCooldownActive ? `${label} (${remainingTime}s)` : children}</React.Fragment>;
}

RefreshCooldownLabel.propTypes = {
  retrievedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

RefreshCooldownLabel.defaultProps = {
  retrievedAt: null,
};
