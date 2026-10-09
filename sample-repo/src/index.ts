import { addMember } from "./store.js";
import { loadCatalog } from "./catalog.js";
import { lendBook, returnBook } from "./loans.js";
import { parseCommand } from "./parse.js";
import { buildReport } from "./report.js";
import { formatMoney } from "./format.js";

const today = new Date();

addMember({ id: "m1", name: "Camille", maxLoans: 2 });
addMember({ id: "m2", name: "Jules", maxLoans: 3 });

console.log(`${loadCatalog()} livres chargés`);

for (const line of process.argv.slice(2)) {
  const command = parseCommand(line);
  if (command.action === "lend") {
    lendBook(command.bookId, command.memberId, today);
  } else {
    console.log(`Frais : ${formatMoney(returnBook(command.bookId, command.memberId, today))}`);
  }
}

console.log(buildReport(today));
