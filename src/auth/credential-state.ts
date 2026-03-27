export interface CredentialFieldState {
  envVar: string;
  present: boolean;
}

export function createCredentialFieldState(
  envVar: string,
  value: string | undefined,
): CredentialFieldState {
  return {
    envVar,
    present: value !== undefined && value.trim().length > 0,
  };
}
