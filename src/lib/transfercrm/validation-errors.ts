/**
 * Format Laravel-style `errors` from TransferCRM 422 responses for end-user display.
 * Keeps messages neutral (no vendor branding).
 */
export function formatTransferCrmValidationMessages(errors?: Record<string, string[]>): string {
  if (!errors || Object.keys(errors).length === 0) {
    return "";
  }

  const lines: string[] = [];
  for (const [field, messages] of Object.entries(errors)) {
    for (const message of messages) {
      lines.push(`${field}: ${message}`);
    }
  }
  return lines.join("\n");
}

export function firstTransferCrmValidationMessage(errors?: Record<string, string[]>): string | undefined {
  if (!errors) return undefined;
  for (const messages of Object.values(errors)) {
    if (messages?.length) return messages[0];
  }
  return undefined;
}
