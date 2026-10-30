import { fireEvent } from "@testing-library/react";

// Helpers for tests of components that mark their elements with `data-test`.

// The last element with this `data-test`, if there's one. The last one, because antd renders dropdowns (and their
// options) at the end of the document.
export function queryByTestID(testId: string): any {
  const elements = document.querySelectorAll(`[data-test="${testId}"]`);
  return elements[elements.length - 1];
}

export function elementExists(testId: string) {
  return !!queryByTestID(testId);
}

export function findByTestID(testId: string): any {
  const element = queryByTestID(testId);
  if (!element) {
    throw new Error(`Found no element with data-test="${testId}"`);
  }
  return element;
}

// antd passes `data-test` either to a wrapper or to the <input> itself
export function findInput(element: Element, selector = "input"): any {
  const input = element.matches(selector) ? element : element.querySelector(selector);
  if (!input) {
    throw new Error(`Found no "${selector}" in ${element.outerHTML.slice(0, 200)}`);
  }
  return input;
}

// antd's Select opens on mousedown on its selector element
export function openSelect(testId: string) {
  const element = findByTestID(testId);
  fireEvent.mouseDown(element.querySelector(".ant-select-selector") || element);
}

export function setChecked(input: HTMLInputElement, checked: boolean) {
  if (input.checked !== checked) {
    fireEvent.click(input);
  }
}
