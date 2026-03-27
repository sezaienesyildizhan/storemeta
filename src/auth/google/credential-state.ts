import {
  createCredentialFieldState,
  type CredentialFieldState,
} from "../credential-state.js";
import { loadGoogleCredentials } from "./load-credentials.js";
import type { GoogleCredentialsSettings } from "../../config/types.js";

export interface GoogleCredentialState {
  serviceAccountPath: CredentialFieldState;
  allPresent: boolean;
}

export function getGoogleCredentialState(
  credentials: GoogleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): GoogleCredentialState {
  const loaded = loadGoogleCredentials(credentials, env);
  const serviceAccountPath = createCredentialFieldState(
    credentials.serviceAccountPathEnv,
    loaded.serviceAccountPath,
  );

  return {
    serviceAccountPath,
    allPresent: serviceAccountPath.present,
  };
}
