/**
 * Normalizes a phone number to its trailing digits so +255756999885 and 0756999885 match.
 */
export function normalizePhoneSuffix(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 6 ? digits.slice(-6) : digits;
}

/**
 * Computes a SHA-256 hex digest for zero-PII order tracking verification.
 */
export async function computeTrackingHash(orderCode: string, phone: string): Promise<string> {
  const cleanCode = orderCode.trim().toUpperCase();
  const suffix = normalizePhoneSuffix(phone);
  const input = `${cleanCode}:${suffix}`;
  const data = new TextEncoder().encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Downloads an array of rows as a UTF-8 BOM CSV file compatible with Excel.
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | boolean)[][]): void {
  const escapeCell = (val: string | number | boolean) => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  const bom = '\uFEFF';
  const blob = new Blob([bom + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
