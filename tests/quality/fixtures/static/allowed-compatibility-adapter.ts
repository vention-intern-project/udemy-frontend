// quality-exception: TS-TYPE-002 RequestAdapter SessionActions.requestPublic exact compatibility adapter.
export interface SessionActions {
  requestPublic(): void;
}

export type RequestAdapter = SessionActions['requestPublic'];
