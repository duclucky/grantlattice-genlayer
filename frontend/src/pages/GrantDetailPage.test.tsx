import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { canonicalTestAdapter } from "../test/canonicalTestAdapter";
import { renderApp } from "../test/renderApp";

describe("GrantDetailPage", () => {
  it("does not request an impossible review for a root grant", async () => {
    const getReview = vi.fn(async () => {
      throw new Error("GenLayer RPC error (gen_call): execution failed");
    });

    renderApp("/grants/root-1", { ...canonicalTestAdapter, getReview });

    expect(await screen.findByText("Authority is effective")).toBeInTheDocument();
    expect(getReview).not.toHaveBeenCalled();
  });

  it("does not request a review before a child reaches a reviewed state", async () => {
    const getReview = vi.fn(async () => {
      throw new Error("GenLayer RPC error (gen_call): execution failed");
    });

    renderApp("/grants/child-1", { ...canonicalTestAdapter, getReview });

    expect(await screen.findByText("Authority is not effective")).toBeInTheDocument();
    expect(getReview).not.toHaveBeenCalled();
  });
});
