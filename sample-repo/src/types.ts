export interface Book {
  id: string;
  title: string;
  author: string;
  copies: number;
}

export interface Member {
  id: string;
  name: string;
  maxLoans: number;
}

export interface Loan {
  bookId: string;
  memberId: string;
  dueDate: Date;
  returned: boolean;
}
