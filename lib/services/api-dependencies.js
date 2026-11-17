import { verifyTurnstile } from "../turnstile.js";
import { createApplication } from "./applications.js";
import { getActiveGovernorates } from "./governorates.js";

export const apiDependencies = {
  createApplication,
  getActiveGovernorates,
  verifyTurnstile,
};
