import { noop, extend, pick } from "lodash";
import { useCallback, useState } from "react";
import url from "url";
import qs from "query-string";
import { Dashboard } from "@/services/dashboard";

function keepCurrentUrlParams(targetUrl) {
  const currentUrlParams = qs.parse(window.location.search);
  targetUrl = url.parse(targetUrl);
  const targetUrlParams = qs.parse(targetUrl.search);
  return url.format(
    extend(pick(targetUrl, ["protocol", "auth", "host", "pathname"]), {
      search: qs.stringify(extend(currentUrlParams, targetUrlParams)),
    })
  );
}

export default function useDuplicateDashboard(dashboard) {
  const [isDuplicating, setIsDuplicating] = useState(false);

  const duplicateDashboard = useCallback(() => {
    // To prevent opening the same tab, name must be unique for each browser
    const tabName = `duplicatedDashboardTab/${Math.random().toString()}`;

    // We should open tab here because this moment is a part of user interaction;
    // later browser will block such attempts
    const tab = window.open("", tabName);

    setIsDuplicating(true);
    Dashboard.fork({ id: dashboard.id })
      .then(newDashboard => {
        tab.location = keepCurrentUrlParams(newDashboard.getUrl());
      })
      .finally(() => {
        setIsDuplicating(false);
      });
  }, [dashboard.id]);

  return [isDuplicating, isDuplicating ? noop : duplicateDashboard];
}
