interface StatusToastProps {
  message: string | null;
  tone?: "info" | "success" | "error";
}

/**
 * Lightweight status toast for connectivity and export feedback.
 * REQ: PD-09, PERF-04, C-08
 */
export function StatusToast({ message, tone = "info" }: StatusToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className={`status-toast status-toast-${tone}`} role="status" aria-live="polite">
      <span className={`status-toast-dot status-toast-dot-${tone}`} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
