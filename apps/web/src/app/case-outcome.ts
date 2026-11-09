import type { TransactionReport } from '@pei/perps-adapter';

export function caseOutcome(report: Extract<TransactionReport, { state: 'mined' }>) {
  const remainderUnknown = report.orderRead && !report.orderRead.ok;
  if (report.transactionStatus === 'reverted') return {
    title: 'The transaction reverted', tone: 'warning',
    observed: 'The canonical receipt reports a revert. No execution from this transaction is established.',
    unknown: 'The receipt alone does not establish the reason. A later replay can differ from execution-time state.',
    next: 'Review the original attempt and its diagnostics before preparing any new order. Gas may still have been spent.',
  };
  if (report.conflicting) return {
    title: 'The trading outcome is unresolved', tone: 'warning',
    observed: 'The transaction is mined, but the decoded events conflict. Fill quantities are withheld.',
    unknown: 'Which order events can safely be attributed to this intent.',
    next: 'Keep the hash and raw evidence. Review the explorer and current account; do not treat missing attribution as no exposure.',
  };
  if (report.intent.kind === 'place' && report.filled > 0n) return {
    title: report.filled === report.intent.quantity ? 'The requested quantity filled in this receipt' : 'Part of the requested quantity filled', tone: 'observed',
    observed: 'Matching receipt events evidence fills for this order. They are separate from the current account snapshot.',
    unknown: remainderUnknown ? 'Current remainder could not be read. Later fills and full account exposure are not established here.' : 'Later fills are not scanned by this report. Whole-block position changes can include other transactions.',
    next: 'Review current positions and any owned remainder. Cancelling a remainder does not close an existing position.',
  };
  if (report.outcome === 'Cancellation / expiry event confirmed' || report.outcome === 'Resting remainder reduction confirmed') return {
    title: report.intent.kind === 'cancel' ? 'A cancellation event was verified' : 'A remainder reduction was verified', tone: 'observed',
    observed: 'A matching receipt event supports this order change.',
    unknown: 'This does not establish that an already filled position was closed.',
    next: 'Inspect current positions and pending orders, then save the report.',
  };
  if (report.intent.kind === 'place' && report.currentOrder && report.currentOrder.quantityRemaining > 0n) return {
    title: 'No receipt fill; a remainder is observed', tone: 'attention',
    observed: 'No matching fills were found in this receipt. Owned order storage currently contains a remaining quantity.',
    unknown: 'The remainder may be expired or unexecutable. Its presence does not prove why it has not filled.',
    next: 'Review the book, expiry and current exposure. Use a fresh cancellation review if the order is no longer wanted.',
  };
  return {
    title: 'Receipt confirmed; trading outcome unknown', tone: 'warning',
    observed: 'A successful receipt was verified, but the available evidence does not establish the intended trading result.',
    unknown: remainderUnknown ? 'Order storage is unavailable. A missing read is not a zero remainder.' : 'An absent remainder does not establish a fill or a flat account.',
    next: 'Inspect current positions and the original journal. Preserve the evidence and do not resend an uncertain intent.',
  };
}
