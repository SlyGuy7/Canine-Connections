import React, { useEffect } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const sendMessage = vi.hoisted(() => vi.fn());
vi.mock("../services/messaging", () => ({ sendMessage }));

import { ToastProvider } from "./ToastContext";
import { useToast } from "./toast";
import { DataCacheProvider } from "./DataCacheContext";
import { useDataCache } from "./dataCache";

describe("toasts", () => {
  function TwoToasts() {
    const { addToast } = useToast();
    return <button onClick={() => { addToast("first"); addToast("second"); }}>notify</button>;
  }

  it("dismissing one of two toasts raised together leaves the other", () => {
    render(<ToastProvider><TwoToasts /></ToastProvider>);
    fireEvent.click(screen.getByText("notify"));

    fireEvent.click(screen.getAllByLabelText("Dismiss notification")[0]);

    expect(screen.queryByText("first")).not.toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
  });

  it("disappears on its own after a few seconds", () => {
    vi.useFakeTimers();
    render(<ToastProvider><TwoToasts /></ToastProvider>);
    fireEvent.click(screen.getByText("notify"));

    act(() => vi.advanceTimersByTime(3000));

    expect(screen.queryByText("first")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe("data cache", () => {
  let cache;
  // Hands the context value to the test after each render.
  function Grab() {
    const value = useDataCache();
    useEffect(() => { cache = value; });
    return null;
  }

  it("callers arriving during a fetch share it instead of getting an empty list", async () => {
    let finish;
    sendMessage.mockReset().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<DataCacheProvider><Grab /></DataCacheProvider>);

    const first = cache.getDogs();
    const second = cache.getDogs();
    await act(async () => finish({ success: true, dogs: [{ dog_id: 1, photos: "a.jpg, b.jpg" }] }));

    const [a, b] = await Promise.all([first, second]);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(b).toEqual(a);
    expect(a[0]).toMatchObject({ dog_id: 1, image: "a.jpg", photoList: ["a.jpg", "b.jpg"] });
  });

  it("serves later calls from the cache and refetches after invalidation", async () => {
    sendMessage.mockReset().mockResolvedValue({ success: true, shelters: [{ shelter_id: 1 }] });
    render(<DataCacheProvider><Grab /></DataCacheProvider>);

    await act(() => cache.getShelters());
    await act(() => cache.getShelters());
    expect(sendMessage).toHaveBeenCalledTimes(1);

    act(() => cache.invalidateShelters());
    await act(() => cache.getShelters());
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed fetch", async () => {
    sendMessage.mockReset()
      .mockResolvedValueOnce({ success: false })
      .mockResolvedValueOnce({ success: true, questions: [{ question_id: 1 }] });
    render(<DataCacheProvider><Grab /></DataCacheProvider>);

    expect(await act(() => cache.getQuizQuestions())).toEqual([]);
    expect(await act(() => cache.getQuizQuestions())).toEqual([{ question_id: 1 }]);
  });
});
