import { getInitData } from './tg-utils.js';

const USE_MOCK = true;
const BASE_URL = 'https://tvoy-domen.com/api';

const mockStore = {
    catalog: [
        {
            id: 1,
            title: 'Нежный рассвет',
            description: 'Сборный букет в пастельных тонах с пионовидными розами.',
            price: '3500.00',
            image_url: 'https://images.unsplash.com/photo-1591886960571-152066c6b2ba?w=500&q=80',
            is_active: 1
        },
        {
            id: 2,
            title: 'Яркий акцент',
            description: 'Сочная композиция из тюльпанов и ранункулюсов.',
            price: '2800.00',
            image_url: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=500&q=80',
            is_active: 1
        },
        {
            id: 3,
            title: 'Классика Bloomé',
            description: 'Монобукет из красных роз в фирменной упаковке.',
            price: '4500.00',
            image_url: 'https://images.unsplash.com/photo-1546842931-886c185b4c8c?w=500&q=80',
            is_active: 1
        }
    ],
    activeOrder: null
};

if (USE_MOCK && typeof window !== 'undefined') {
    window.mockAPI = {
        simulateAssembling: () => {
            if (mockStore.activeOrder) {
                mockStore.activeOrder.status = 'ASSEMBLING';
                console.log('Mock: заказ переведен в ASSEMBLING.');
            }
        },
        simulatePhotoReview: () => {
            if (mockStore.activeOrder) {
                mockStore.activeOrder.status = 'PHOTO_REVIEW';
                mockStore.activeOrder.photo_url =
                    'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=500&q=80';
                console.log('Mock: заказ переведен в PHOTO_REVIEW.');
            }
        },
        simulateDelivering: () => {
            if (mockStore.activeOrder) {
                mockStore.activeOrder.status = 'DELIVERING';
                console.log('Mock: заказ переведен в DELIVERING.');
            }
        },
        simulateDelivered: () => {
            if (mockStore.activeOrder) {
                mockStore.activeOrder.status = 'DELIVERED';
                console.log('Mock: заказ переведен в DELIVERED.');
            }
        },
        clearOrder: () => {
            mockStore.activeOrder = null;
            console.log('Mock: активный заказ удален.');
        },
        getState: () => structuredClone(mockStore)
    };

    console.log(
        'Запущен MOCK-режим. Для теста согласования используйте window.mockAPI.simulatePhotoReview().'
    );
}

async function request(endpoint, options = {}) {
    if (USE_MOCK) {
        return handleMockRequest(endpoint, options);
    }

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

async function handleMockRequest(endpoint, options = {}) {
    await delay(500);

    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : null;

    if (endpoint === '/users/role' && method === 'GET') {
        return { role: 'client', isNew: false };
    }

    if (endpoint === '/catalog' && method === 'GET') {
        return mockStore.catalog;
    }

    if (endpoint === '/orders' && method === 'POST') {
        mockStore.activeOrder = {
            id: Math.floor(Math.random() * 10000) + 1000,
            product_id: body.product_id,
            status: 'NEW',
            payment_status: 'PAID',
            delivery_address: body.delivery_address,
            photo_url: null,
            revision_note: null
        };

        return { success: true, order_id: mockStore.activeOrder.id };
    }

    if (endpoint === '/orders/my' && method === 'GET') {
        return mockStore.activeOrder ? [mockStore.activeOrder] : [];
    }

    if (/^\/orders\/\d+\/status$/.test(endpoint) && method === 'PATCH') {
        if (mockStore.activeOrder) {
            mockStore.activeOrder.status = body.new_status;

            if (body.note) {
                mockStore.activeOrder.revision_note = body.note;
                console.log('Mock: сохранен комментарий клиента:', body.note);
            }

            if (body.new_status === 'REVISION') {
                mockStore.activeOrder.photo_url = null;
            }
        }

        return { success: true, status: body.new_status };
    }

    throw new Error(`Mock: эндпоинт не реализован - ${endpoint}`);
}

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
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
