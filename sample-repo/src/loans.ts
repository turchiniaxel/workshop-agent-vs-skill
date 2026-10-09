import type { Loan } from "./types.js";
import { activeLoansOf, books, loans, members } from "./store.js";
import { LATE_FEE_PER_DAY, LOAN_DAYS } from "./config.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export function lendBook(bookId: string, memberId: string, today: Date): Loan {
  const book = books.get(bookId);
  const member = members.get(memberId);
  if (!book || !member) {
    throw new Error(`Prêt impossible : livre ${bookId} ou adhérent ${memberId} inconnu`);
  }
  const lent = loans.filter((l) => l.bookId === bookId && !l.returned).length;
  if (lent >= book.copies) {
    throw new Error(`Aucun exemplaire disponible pour « ${book.title} »`);
  }
  if (activeLoansOf(memberId).length >= member.maxLoans) {
    throw new Error(`${member.name} a atteint sa limite de prêts`);
  }
  const loan: Loan = {
    bookId,
    memberId,
    dueDate: new Date(today.getTime() + LOAN_DAYS * DAY_MS),
    returned: false,
  };
  loans.push(loan);
  return loan;
}

export function returnBook(bookId: string, memberId: string, today: Date): number {
  const loan = loans.find((l) => l.bookId === bookId && l.memberId === memberId && !l.returned);
  if (!loan) {
    throw new Error("Aucun prêt en cours pour ce livre et cet adhérent");
  }
  loan.returned = true;
  const lateDays = Math.max(0, Math.ceil((today.getTime() - loan.dueDate.getTime()) / DAY_MS));
  return lateDays * LATE_FEE_PER_DAY;
}
