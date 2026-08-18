import { describe, expect, it } from "vitest";
import {
  numberToPersianWords,
  tomanAmountInWords,
} from "@/lib/persian-words";

describe("numberToPersianWords", () => {
  it("handles zero and small numbers", () => {
    expect(numberToPersianWords(0)).toBe("صفر");
    expect(numberToPersianWords(7)).toBe("هفت");
    expect(numberToPersianWords(12)).toBe("دوازده");
    expect(numberToPersianWords(25)).toBe("بیست و پنج");
  });

  it("handles hundreds and thousands", () => {
    expect(numberToPersianWords(100)).toBe("یکصد");
    expect(numberToPersianWords(1000)).toBe("یک هزار");
    expect(numberToPersianWords(2024)).toBe("دو هزار و بیست و چهار");
  });

  it("handles millions used on invoices", () => {
    expect(numberToPersianWords(1_250_000)).toBe(
      "یک میلیون و دویست و پنجاه هزار",
    );
  });
});

describe("tomanAmountInWords", () => {
  it("adds the toman suffix", () => {
    expect(tomanAmountInWords(450_000)).toBe(
      "چهارصد و پنجاه هزار تومان تمام",
    );
  });
});
