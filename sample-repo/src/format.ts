export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatMoney(amount: number): string {
  return `${amount.toFixed(2)} €`;
}
