import { HTMLAttributes } from "react";

interface SrNotifyProps {
  text: string;
  expiry: number;
  container: HTMLElement;
  politeness: HTMLAttributes<HTMLDivElement>["aria-live"];
}

export function srNotify({ text, expiry = 1000, container = document.body, politeness = "polite" }: SrNotifyProps) {
  const element = document.createElement("div");
  const id = `speak-${Date.now()}`;

  element.id = id;
  element.className = "sr-only";
  element.textContent = text;

  element.setAttribute("role", "alert");
  element.setAttribute("aria-live", politeness);

  container.appendChild(element);

  let timer: null | number = null;
  let isDone = false;
  const cleanupFn = () => {
    if (isDone) {
      return;
    }
    isDone = true;

    try {
      container.removeChild(element);
    } catch (e) {
      console.error(e);
    }

    if (timer) {
      window.clearTimeout(timer);
    }
  };

  timer = window.setTimeout(cleanupFn, expiry);

  return cleanupFn;
}
