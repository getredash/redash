import { useState, useEffect, useRef, useCallback } from "react";
import { currentUser, clientConfig } from "@/services/auth";
import notification from "@/services/notification";

export default function useRefreshCooldown(retrievedAt) {
  const cooldownSeconds = currentUser.isAdmin ? 0 : (clientConfig.nonAdminRefreshCooldown || 0);
  const [remainingTime, setRemainingTime] = useState(0);
  const timerRef = useRef(null);

  const calculateRemaining = useCallback(() => {
    if (cooldownSeconds <= 0 || !retrievedAt) return 0;
    const retrievedTime = new Date(retrievedAt).getTime();
    if (!retrievedTime) return 0;
    const elapsed = Math.floor((Date.now() - retrievedTime) / 1000);
    return Math.max(0, cooldownSeconds - elapsed);
  }, [cooldownSeconds, retrievedAt]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const remaining = calculateRemaining();
    setRemainingTime(remaining);

    if (remaining > 0) {
      timerRef.current = setInterval(() => {
        const r = calculateRemaining();
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
  }, [calculateRemaining]);

  const isCooldownActive = remainingTime > 0;

  const notifyCooldown = useCallback(() => {
    if (isCooldownActive) {
      notification.warning(
        `Refresh is on cooldown. Please wait ${remainingTime} seconds.`,
        null,
        { duration: 3 }
      );
    }
  }, [isCooldownActive, remainingTime]);

  return {
    isCooldownActive,
    remainingTime,
    notifyCooldown,
  };
}
