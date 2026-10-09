import { books, loans, members } from "./store.js";
import { formatDate, formatMoney } from "./format.js";
import { LATE_FEE_PER_DAY } from "./config.js";

export function buildReport(today: Date): string {
  const lines: string[] = [];
  lines.push("=== Rapport de la bibliothèque ===");
  lines.push(`Date : ${formatDate(today)}`);
  let totalFees = 0;
  let lateCount = 0;
  for (const book of books.values()) {
    const bookLoans = loans.filter((l) => l.bookId === book.id);
    const out = bookLoans.filter((l) => !l.returned);
    lines.push(`- ${book.title} (${book.author}) : ${out.length}/${book.copies} sorti(s)`);
    for (const loan of out) {
      const member = members.get(loan.memberId);
      const name = member ? member.name : "inconnu";
      if (loan.dueDate < today) {
        const days = Math.ceil((today.getTime() - loan.dueDate.getTime()) / 86400000);
        const fee = days * LATE_FEE_PER_DAY;
        totalFees += fee;
        lateCount++;
        lines.push(`    EN RETARD : ${name}, ${days} jour(s), ${formatMoney(fee)}`);
      } else {
        lines.push(`    ${name}, retour prévu le ${formatDate(loan.dueDate)}`);
      }
    }
    if (out.length === 0 && bookLoans.length === 0) {
      lines.push("    jamais emprunté");
    } else if (out.length === 0) {
      lines.push("    tous les exemplaires sont rentrés");
    }
  }
  lines.push("--- Adhérents ---");
  for (const member of members.values()) {
    const active = loans.filter((l) => l.memberId === member.id && !l.returned);
    const history = loans.filter((l) => l.memberId === member.id);
    if (active.length >= member.maxLoans) {
      lines.push(`${member.name} : limite atteinte (${active.length}/${member.maxLoans})`);
    } else if (history.length === 0) {
      lines.push(`${member.name} : aucun prêt`);
    } else {
      lines.push(`${member.name} : ${active.length} en cours, ${history.length} au total`);
    }
  }
  lines.push(`Retards : ${lateCount}`);
  lines.push(`Frais à encaisser : ${formatMoney(totalFees)}`);
  return lines.join("\n");
}
