const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

export async function getTables() {
    const response = await fetch(`${API_URL}/tables/`);
    if (!response.ok) {
        throw new Error('Failed to fetch tables');
    }
    return response.json();
}

export async function createTable(tableData) {
    const response = await fetch(`${API_URL}/tables/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableData),
    });
    if (!response.ok) {
        throw new Error('Failed to create table');
    }
    return response.json();
}
