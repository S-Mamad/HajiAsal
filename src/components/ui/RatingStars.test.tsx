/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { RatingStars } from "./RatingStars";

afterEach(() => {
  cleanup();
});

describe("RatingStars", () => {
  it("clips the last star at 50% for a 4.5 rating", () => {
    const { container } = render(
      <RatingStars rating={4.5} showValue={false} />,
    );
    const fills = [...container.querySelectorAll("[data-fill]")].map((el) =>
      el.getAttribute("data-fill"),
    );
    expect(fills).toEqual(["100", "100", "100", "100", "50"]);
    const clip = container.querySelector('[data-fill="50"] [data-clip]');
    expect(clip?.getAttribute("style")).toContain("50%");
    expect(
      screen.getByRole("img", { name: "امتیاز ۴٫۵ از ۵" }),
    ).toBeInTheDocument();
  });

  it("does not crash on a non-numeric rating", () => {
    render(<RatingStars rating={Number.NaN} showValue />);
    expect(
      screen.getByRole("img", { name: "امتیاز ۰ از ۵" }),
    ).toBeInTheDocument();
  });
});
