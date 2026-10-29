import { act, renderHook } from "@testing-library/react";
import useTypedValue from "./useTypedValue";

function render(value) {
  return renderHook(({ value }) => useTypedValue(value), { initialProps: { value } });
}

describe("useTypedValue", () => {
  test("an older typed value coming back as the prop doesn't overwrite newer typing", () => {
    const { result, rerender } = render("");
    act(() => result.current[1]("o"));
    act(() => result.current[1]("or"));
    act(() => result.current[1]("ord"));
    rerender({ value: "o" });
    expect(result.current[0]).toBe("ord");
    rerender({ value: "ord" });
    expect(result.current[0]).toBe("ord");
  });

  test("a value changed from outside replaces the typed one", () => {
    const { result, rerender } = render("select 1");
    act(() => result.current[1]("select 12"));
    rerender({ value: "SELECT 12" });
    expect(result.current[0]).toBe("SELECT 12");
  });

  test("after the prop has caught up, the same value set from outside again is applied", () => {
    const { result, rerender } = render("a");
    act(() => result.current[1]("ab"));
    rerender({ value: "ab" });
    act(() => result.current[1]("abc"));
    rerender({ value: "abc" });
    rerender({ value: "ab" });
    expect(result.current[0]).toBe("ab");
  });
});
