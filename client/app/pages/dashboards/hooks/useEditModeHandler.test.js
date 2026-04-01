import { act, renderHook } from "@testing-library/react";
import useEditModeHandler, { DashboardStatusEnum } from "./useEditModeHandler";
import location from "@/services/location";
import notification from "@/services/notification";

jest.mock("@/services/location", () => ({
  __esModule: true,
  default: {
    search: { edit: true },
    setSearch: jest.fn(),
  },
}));

jest.mock("@/services/notification", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

function createWidget() {
  return {
    id: 1,
    options: {
      position: {
        col: 0,
        row: 0,
        sizeX: 1,
        sizeY: 1,
      },
    },
    save: jest.fn().mockResolvedValue({}),
  };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("useEditModeHandler", () => {
  beforeEach(() => {
    location.search = { edit: true };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("marks dashboard as saving immediately while layout changes are debounced", async () => {
    jest.useFakeTimers();

    const widget = createWidget();
    const positions = {
      1: {
        col: 1,
        row: 0,
        sizeX: 1,
        sizeY: 1,
      },
    };

    const { result } = renderHook(() => useEditModeHandler(true, [widget]));

    act(() => {
      result.current.saveDashboardLayout(positions);
    });

    expect(result.current.dashboardStatus).toBe(DashboardStatusEnum.SAVING);
    expect(result.current.doneBtnClickedWhileSaving).toBe(false);
    expect(widget.save).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(2000);
      await flushAsyncWork();
    });

    expect(widget.save).toHaveBeenCalledWith("options", { position: positions[1] });
    expect(result.current.dashboardStatus).toBe(DashboardStatusEnum.SAVED);
    expect(notification.error).not.toHaveBeenCalled();
  });

  test("flushes a pending layout save when leaving edit mode", async () => {
    jest.useFakeTimers();

    const widget = createWidget();
    const positions = {
      1: {
        col: 2,
        row: 0,
        sizeX: 1,
        sizeY: 1,
      },
    };

    const { result } = renderHook(() => useEditModeHandler(true, [widget]));

    act(() => {
      result.current.saveDashboardLayout(positions);
    });

    act(() => {
      result.current.setEditingLayout(false);
    });

    expect(result.current.doneBtnClickedWhileSaving).toBe(true);
    expect(widget.save).toHaveBeenCalledWith("options", { position: positions[1] });

    await act(async () => {
      await flushAsyncWork();
    });

    expect(result.current.dashboardStatus).toBe(DashboardStatusEnum.SAVED);
    expect(result.current.doneBtnClickedWhileSaving).toBe(false);
    expect(result.current.editingLayout).toBe(false);
  });

  test("cancels pending layout saves on unmount", () => {
    jest.useFakeTimers();

    const widget = createWidget();
    const positions = {
      1: {
        col: 3,
        row: 0,
        sizeX: 1,
        sizeY: 1,
      },
    };

    const { result, unmount } = renderHook(() => useEditModeHandler(true, [widget]));

    act(() => {
      result.current.saveDashboardLayout(positions);
    });

    unmount();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(widget.save).not.toHaveBeenCalled();
  });
});
