import {
  createCredentialFieldState,
  type CredentialFieldState,
} from "../credential-state.js";
import { loadAppleCredentials } from "./load-credentials.js";
import type { AppleCredentialsSettings } from "../../config/types.js";

export interface AppleCredentialState {
  issuerId: CredentialFieldState;
  keyId: CredentialFieldState;
  privateKeyPath: CredentialFieldState;
  allPresent: boolean;
}

export function getAppleCredentialState(
  credentials: AppleCredentialsSettings,
  env: NodeJS.ProcessEnv = process.env,
): AppleCredentialState {
  const loaded = loadAppleCredentials(credentials, env);
  const issuerId = createCredentialFieldState(
    credentials.issuerIdEnv,
    loaded.issuerId,
  );
  const keyId = createCredentialFieldState(credentials.keyIdEnv, loaded.keyId);
  const privateKeyPath = createCredentialFieldState(
    credentials.privateKeyPathEnv,
    loaded.privateKeyPath,
  );

  return {
    issuerId,
    keyId,
    privateKeyPath,
    allPresent: issuerId.present && keyId.present && privateKeyPath.present,
  };
}
