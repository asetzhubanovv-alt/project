const API_URL = 'https://dummyjson.com/users';

async function sendRequest(url) {
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || 'Не удалось загрузить пользователей.');
    }

    return result;
}

export async function getUsers() {
    const result = await sendRequest(`${API_URL}?limit=0`);
    return Array.isArray(result.users) ? result.users : [];
}

export function getUser(id) {
    return sendRequest(`${API_URL}/${id}`);
}
