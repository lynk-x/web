/**
 * Utility to export data as CSV and trigger a browser download.
 */
export const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return;

    // Get headers from the first object
    const headers = Object.keys(data[0]);

    // Create CSV rows
    // We join headers and then each row separated by commas.
    // We wrap values in quotes to handle commas within values.
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(header => {
                const value = row[header] ?? '';
                // Handle strings with commas, quotes or newlines by wrapping in quotes and escaping existing quotes
                const escaped = ('' + value).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        )
    ];

    // Create a blob and trigger download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
