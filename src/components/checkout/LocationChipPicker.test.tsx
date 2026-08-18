/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { LocationChipPicker } from "./LocationChipPicker";

afterEach(() => {
  cleanup();
});

describe("LocationChipPicker", () => {
  const cities = ["یزد", "میبد", "اردکان", "تفت"];

  it("keeps the list collapsed until the field is opened", () => {
    render(
      <LocationChipPicker
        label="شهر"
        options={cities}
        value=""
        onChange={() => undefined}
      />,
    );
    expect(screen.queryByRole("option", { name: "یزد" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "شهر" }));
    expect(screen.getByRole("option", { name: "یزد" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "میبد" })).toBeInTheDocument();
  });

  it("filters options from search", () => {
    render(
      <LocationChipPicker
        label="شهر"
        options={cities}
        value=""
        onChange={() => undefined}
        searchPlaceholder="جستجوی شهر"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "شهر" }));
    fireEvent.change(screen.getByPlaceholderText("جستجوی شهر"), {
      target: { value: "می" },
    });
    expect(screen.getByRole("option", { name: "میبد" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "یزد" })).not.toBeInTheDocument();
  });

  it("selects an option", () => {
    const onChange = vi.fn();
    render(
      <LocationChipPicker
        label="شهر"
        options={cities}
        value=""
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "شهر" }));
    fireEvent.click(screen.getByRole("option", { name: "اردکان" }));
    expect(onChange).toHaveBeenCalledWith("اردکان");
  });
});
