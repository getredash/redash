import { useState, useEffect, useRef, useCallback } from "react";
import { currentUser, clientConfig } from "@/services/auth";
import notification from "@/services/notification";

function getCooldownSeconds() {
  return currentUser.isAdmin ? 0 : clientConfig.nonAdminRefreshCooldown || 0;
}

function warnCooldown(seconds) {
  notification.warning(`Refresh is on cooldown. Please wait ${seconds} seconds.`, null, { duration: 3 });
}

// Remaining cooldown in seconds for a given retrieval time. Pure — no React state — so the
// execution/refresh path can gate on click without subscribing to a per-second timer.
export function getRefreshCooldownRemaining(retrievedAt) {
  const cooldownSeconds = getCooldownSeconds();
  if (cooldownSeconds <= 0 || !retrievedAt) return 0;
  const retrievedTime = new Date(retrievedAt).getTime();
  if (!retrievedTime) return 0;
  const elapsed = Math.floor((Date.now() - retrievedTime) / 1000);
  return Math.max(0, cooldownSeconds - elapsed);
}

// Shows the cooldown notification when active. Returns true if on cooldown (caller should abort).
export function notifyRefreshCooldown(retrievedAt) {
  const remaining = getRefreshCooldownRemaining(retrievedAt);
  if (remaining > 0) {
    warnCooldown(remaining);
    return true;
  }
  return false;
}

// Ticking countdown for display. Mount inside a small leaf component (see RefreshCooldownLabel)
// so the per-second state update only re-renders that label, not the whole page.
export default function useRefreshCooldown(retrievedAt) {
  const [remainingTime, setRemainingTime] = useState(() => getRefreshCooldownRemaining(retrievedAt));
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const remaining = getRefreshCooldownRemaining(retrievedAt);
    setRemainingTime(remaining);

    if (remaining > 0) {
      timerRef.current = setInterval(() => {
        const r = getRefreshCooldownRemaining(retrievedAt);
        setRemainingTime(r);
        if (r <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [retrievedAt]);

  const isCooldownActive = remainingTime > 0;

  const notifyCooldown = useCallback(() => {
    if (isCooldownActive) {
      warnCooldown(remainingTime);
    }
  }, [isCooldownActive, remainingTime]);

  return {
    isCooldownActive,
    remainingTime,
    notifyCooldown,
  };
}
