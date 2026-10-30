export type ComposerState = { dirty: boolean; busy: boolean };
export type ComposerProps = {
  onStateChange: (state: ComposerState) => void;
  onSaved: () => void;
  onDone: () => void;
};
