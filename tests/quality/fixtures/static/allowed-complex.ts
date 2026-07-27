export type ApiEnvelope<TPayload extends object> = {
  data: TPayload;
  meta: { cursor: string | null; next: boolean };
};

export type VisiblePayload<TRecord extends object> = Pick<ApiEnvelope<TRecord>, 'data' | 'meta'>;
