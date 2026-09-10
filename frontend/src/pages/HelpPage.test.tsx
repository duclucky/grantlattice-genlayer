import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HelpPage } from "./HelpPage";

describe("HelpPage", () => {
  it("separates terminal semantic ambiguity from retryable technical failure", () => {
    render(<HelpPage />);

    expect(screen.getByText(/semantic ambiguity is terminal/iu)).toBeInTheDocument();
    expect(screen.getByText(/technical or unverifiable failure is retryable/iu)).toBeInTheDocument();
  });
});
