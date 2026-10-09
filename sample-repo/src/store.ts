import type { Book, Loan, Member } from "./types.js";

export const books = new Map<string, Book>();
export const members = new Map<string, Member>();
export const loans: Loan[] = [];

export function addBook(book: Book): void {
  books.set(book.id, book);
}

export function addMember(member: Member): void {
  members.set(member.id, member);
}

export function activeLoansOf(memberId: string): Loan[] {
  return loans.filter((loan) => loan.memberId === memberId && !loan.returned);
}
