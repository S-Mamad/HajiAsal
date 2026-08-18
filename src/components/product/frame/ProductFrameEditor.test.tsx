/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { ProductFrameEditor } from "./ProductFrameEditor";
import { DEFAULT_IMAGE_FIT } from "@/lib/product-image";

afterEach(() => {
  cleanup();
});

describe("ProductFrameEditor", () => {
  it("does not crash with an empty image list src", () => {
    const onChange = () => undefined;
    render(<ProductFrameEditor src="" value={undefined} onChange={onChange} />);
    expect(screen.getByText("تصویری نیست")).toBeInTheDocument();
  });

  it("resets to the default auto frame", () => {
    const calls: unknown[] = [];
    render(
      <ProductFrameEditor
        src="/uploads/jar.webp"
        value={{ scale: 1.8, x: 12, y: -8 }}
        onChange={(next) => calls.push(next)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "بازنشانی قاب" }));
    expect(calls.at(-1)).toEqual(DEFAULT_IMAGE_FIT);
  });

  it("zooms in with the plus control", () => {
    const calls: Array<{ scale: number }> = [];
    render(
      <ProductFrameEditor
        src="/uploads/jar.webp"
        value={DEFAULT_IMAGE_FIT}
        onChange={(next) => calls.push(next)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "بزرگ‌تر" }));
    expect(calls.at(-1)?.scale).toBeGreaterThan(1);
  });

  it("does not crop on a click without a real drag", () => {
    const calls: unknown[] = [];
    render(
      <ProductFrameEditor
        src="/uploads/jar.webp"
        value={DEFAULT_IMAGE_FIT}
        onChange={(next) => calls.push(next)}
      />,
    );
    const frame = document.querySelector(".gallery-frame");
    expect(frame).toBeTruthy();
    fireEvent.pointerDown(frame as Element, {
      button: 0,
      clientX: 40,
      clientY: 40,
      pointerId: 1,
    });
    fireEvent.pointerMove(frame as Element, {
      clientX: 42,
      clientY: 41,
      pointerId: 1,
    });
    fireEvent.pointerUp(frame as Element, { pointerId: 1 });
    expect(calls).toEqual([]);
  });

  it("commits pan after the drag threshold", () => {
    const calls: Array<{ x: number; y: number }> = [];
    render(
      <ProductFrameEditor
        src="/uploads/jar.webp"
        value={DEFAULT_IMAGE_FIT}
        onChange={(next) => calls.push(next)}
      />,
    );
    const frame = document.querySelector(".gallery-frame") as HTMLElement;
    frame.getBoundingClientRect = () =>
      ({
        width: 200,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    fireEvent.pointerDown(frame, {
      button: 0,
      clientX: 40,
      clientY: 40,
      pointerId: 1,
    });
    fireEvent.pointerMove(frame, { clientX: 52, clientY: 40, pointerId: 1 });
    fireEvent.pointerMove(frame, { clientX: 72, clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(frame, { pointerId: 1 });
    expect(calls.at(-1)?.x).toBeGreaterThan(0);
  });
});
