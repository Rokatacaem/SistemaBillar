const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Mock data for "Base" development
const MOCK_TABLES = [
    { id: 1, name: 'Mesa 1', type: 'POOL', status: 'AVAILABLE' },
    { id: 2, name: 'Mesa 2', type: 'POOL', status: 'OCCUPIED' },
    { id: 3, name: 'Mesa 3', type: 'CARDS', status: 'RESERVED' },
];

export async function getTables() {
    try {
        const response = await fetch(`${API_URL}/tables/`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.warn('API connection failed, using Mock Data for development base.', error);
        return Promise.resolve(MOCK_TABLES);
    }
}

export async function createTable(tableData) {
    try {
        const response = await fetch(`${API_URL}/tables/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tableData),
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.warn('API offline, simulating creation in Mock Mode');
        const newTable = { ...tableData, id: Math.floor(Math.random() * 1000), status: 'AVAILABLE' };
        MOCK_TABLES.push(newTable);
        return Promise.resolve(newTable);
    }
}
