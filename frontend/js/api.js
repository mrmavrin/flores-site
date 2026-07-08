import { getInitData } from './tg-utils.js';

const BASE_URL = 'https://tvoy-domen.com/api';

async function request(endpoint, options = {}) {
    const initData = getInitData();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (initData) {
        headers.Authorization = initData;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
    }

    return response.json();
}

export async function getUserRole() {
    return request('/users/role', { method: 'GET' });
}

export async function getCatalog() {
    return request('/catalog', { method: 'GET' });
}

export async function createOrder(orderData) {
    return request('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
}

export async function getMyOrders() {
    return request('/orders/my', { method: 'GET' });
}

export async function updateOrderStatus(orderId, newStatus, note = '') {
    return request(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ new_status: newStatus, note })
    });
}
