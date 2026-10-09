export interface Command {
  action: "lend" | "return";
  bookId: string;
  memberId: string;
}

// Lit une commande saisie par l'utilisateur, par exemple « lend b1 m1 ».
export function parseCommand(line: string): Command {
  const [action, bookId, memberId] = line.trim().split(" ");
  return { action: action as Command["action"], bookId: bookId!, memberId: memberId! };
}
