export function toLocalDateString(date: Date | null): string | undefined {
    if (!date) {
        return undefined;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getChipColor(status: string | null): string {
    switch (status) {
        case 'INITIATED': return 'status-initiated';
        case 'NOT_STARTED': return 'status-initiated';
        case 'IN_PROGRESS': return 'status-in-progress';
        case 'COMPLETED': return 'status-completed';
        case 'OVERDUE': return 'status-overdue';
        case 'LOW': return 'priority-low';
        case 'MEDIUM': return 'priority-medium';
        case 'HIGH': return 'priority-high';
        default: return '';
    }
}

export function getChipText(status: string | null): string {
    switch (status) {
        case 'INITIATED': return 'Initiated';
        case 'NOT_STARTED': return 'Not started';
        case 'IN_PROGRESS': return 'In Progress';
        case 'COMPLETED': return 'Completed';
        case 'OVERDUE': return 'Overdue';
        case 'LOW': return 'Low';
        case 'MEDIUM': return 'Medium';
        case 'HIGH': return 'High';
        default: return 'Unknown';
    }
}
