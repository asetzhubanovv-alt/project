const API_URL = 'https://dummyjson.com/todos';

async function sendRequest(url, options = {}) {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || 'Не удалось выполнить запрос.');
    }

    return result;
}

export async function getTodos() {
    const result = await sendRequest(`${API_URL}?limit=0`);
    return Array.isArray(result.todos) ? result.todos : [];
}

export function addTodo(todo) {
    return sendRequest(`${API_URL}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todo),
    });
}

export function updateTodo(id, changes) {
    return sendRequest(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
    });
}

export function deleteTodo(id) {
    return sendRequest(`${API_URL}/${id}`, { method: 'DELETE' });
}