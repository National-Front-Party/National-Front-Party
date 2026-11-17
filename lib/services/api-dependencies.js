import { verifyTurnstile } from "../turnstile.js";
import { createApplication } from "./applications.js";
import { getActiveGovernorates } from "./governorates.js";
import {
  createServiceRequest,
  getActiveMinistries,
  getActiveRequestSectors,
} from "./service-requests.js";

export const apiDependencies = {
  createApplication,
  createServiceRequest,
  getActiveMinistries,
  getActiveGovernorates,
  getActiveRequestSectors,
  verifyTurnstile,
};
