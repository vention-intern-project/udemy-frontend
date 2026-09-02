export interface ExclusiveDisclosureControl {
  readonly closeRequested: boolean;
  readonly requestOpen: () => void;
}
