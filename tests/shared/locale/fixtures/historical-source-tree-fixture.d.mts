export interface HistoricalSourceTreeRequest {
  readonly repositoryRoot: string;
  readonly commit: string;
}

export interface HistoricalSourceTreeMaterialization {
  readonly directory: string;
  readonly sourceRoot: string;
}

export interface HistoricalSourceTreeEntry {
  readonly blobId: string;
  readonly mode: '100644' | '100755';
  readonly relativePath: string;
}

export function parseHistoricalSourceTree(treeOutput: Buffer): readonly HistoricalSourceTreeEntry[];

export function parseHistoricalBlobBatch(
  batchOutput: Buffer,
  expectedEntries: readonly HistoricalSourceTreeEntry[],
): readonly Buffer[];

export function materializeHistoricalSourceTree(
  request: HistoricalSourceTreeRequest,
): Promise<HistoricalSourceTreeMaterialization>;
