// Date utilities to avoid hydration mismatches

/**
 * Format date to Thai locale string (safe for SSR)
 * Returns a consistent string format that won't cause hydration issues
 */
export function formatDateThai(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear() + 543; // Convert to Buddhist Era

    const thaiMonths = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];

    return `${day} ${thaiMonths[month]} ${year}`;
}

/**
 * Format date to short format (DD/MM/YYYY)
 */
export function formatDateShort(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}
