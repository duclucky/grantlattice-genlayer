import type { GrantLatticeAdapter } from "./contract";

const message = "GrantLattice contract is not configured";

function unavailable(): never {
  throw new Error(message);
}

export const unconfiguredContract: GrantLatticeAdapter = {
  async listGrants() {
    return unavailable();
  },
  async getGrant() {
    return unavailable();
  },
  async getReview() {
    return unavailable();
  },
  async canInvoke() {
    return unavailable();
  },
  async createRoot() {
    return unavailable();
  },
  async proposeChild() {
    return unavailable();
  },
  async reviewChild() {
    return unavailable();
  },
  async revokeGrant() {
    return unavailable();
  },
};
