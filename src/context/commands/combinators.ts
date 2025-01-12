export type EditorCommand = () => Promise<boolean>;

export const execSeq = async (...commands: EditorCommand[]) => {
  for (const command of commands) {
    if (await command()) return;
  }
};
