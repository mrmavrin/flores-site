import { initTelegramApp, showPopup } from './tg-utils.js';
import { getCatalog, createOrder, getMyOrders, updateOrderStatus } from './api.js';
import {
    renderCatalog,
    renderCart,
    renderDeliveryTrackerUI,
    updateCountersUI,
    openBouquetModalUI,
    closeBouquetModalUI,
    updateModalQtyUI,
    renderSlidesUI,
    updateSlidePositionUI,
    openCheckoutModalUI,
    closeCheckoutModalUI,
    showCheckoutErrorUI,
    setCheckoutLoadingUI
} from './ui.js';

const state = {
    currentView: 'home',
    catalog: [],
    favorites: new Set(),
    cart: new Map(),
    currentBouquetId: null,
    currentQty: 1,
    currentSlides: [],
    currentSlideIndex: 0,
    lastOrderId: null,
    activeOrder: null,
    isDeliveryLoading: false
};

const catalogContainer = document.getElementById('catalog');
const sheetContainer = document.getElementById('sheet');
const overlay = document.getElementById('overlay');
const bottomNav = document.getElementById('bottomNav');
const serviceCard = document.getElementById('serviceCard');
const buyBtn = document.getElementById('buyBtn');
const checkoutOverlay = document.getElementById('checkoutOverlay');
const checkoutClose = document.querySelector('.checkout-close');
const checkoutForm = document.getElementById('checkoutForm');

async function initApp() {
    initTelegramApp();
    setupEventListeners();

    if (!catalogContainer) {
        console.error('Контейнер каталога #catalog не найден');
        return;
    }

    try {
        const rawCatalog = await getCatalog();
        state.catalog = rawCatalog.map(mapCatalogItem);
        updateUI();
    } catch (error) {
        console.error('Ошибка загрузки каталога:', error);
        catalogContainer.innerHTML =
            '<div class="empty">Не удалось загрузить витрину. Повторите попытку позже.</div>';
    }
}

function mapCatalogItem(item) {
    const id = String(item.id);
    const title = String(item.title ?? '');
    const description = String(item.description ?? '');
    const price = Number(item.price || 0);
    const imageUrl = String(item.image_url || '');
    const placeholderColor = '#f3ece5';

    const mediaHtml = imageUrl
        ? `<img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(title)}" loading="lazy">`
        : `<div class="media-fallback" style="background:${placeholderColor}">🌸</div>`;

    return {
        id,
        title,
        description,
        imageUrl,
        price,
        priceFormatted: `${price.toLocaleString('ru-RU')} ₽`,
        mediaHtml,
        badgeHtml: '',
        _status: item.is_active === false ? 'hidden' : 'available',
        compositionText: item.compositionText || item.composition || 'Состав уточняется',
        size: item.size || 'Средний',
        durability: item.durability || 'До 5 дней'
    };
}

function updateUI() {
    const cartSummary = getCartSummary();

    updateCountersUI({
        favoritesCount: state.favorites.size,
        cartCount: cartSummary.count
    });

    syncNav();
    syncHeaderActions(cartSummary);

    if (serviceCard) {
        serviceCard.classList.toggle('hidden', state.currentView !== 'home');
    }

    if (state.currentView === 'delivery') {
        renderDeliveryView();
        return;
    }

    if (state.currentView === 'cart') {
        renderCart(catalogContainer, cartSummary.items, cartSummary.totalFormatted);
        return;
    }

    if (state.currentView === 'fav') {
        const favoriteItems = state.catalog.filter((item) => state.favorites.has(item.id));
        renderCatalog(catalogContainer, favoriteItems, state.favorites);
        return;
    }

    renderCatalog(catalogContainer, state.catalog, state.favorites);
}

function setupEventListeners() {
    catalogContainer?.addEventListener('click', (event) => {
        if (state.currentView === 'delivery') {
            handleDeliveryClick(event);
            return;
        }

        if (state.currentView === 'cart') {
            handleCartClick(event);
            return;
        }

        const favBtn = event.target.closest('.fav-btn');
        if (favBtn) {
            event.stopPropagation();
            toggleFavorite(favBtn.dataset.favoriteId);
            return;
        }

        const card = event.target.closest('.card');
        if (card) {
            openBouquetModal(card.dataset.bouquetId);
        }
    });

    sheetContainer?.addEventListener('click', (event) => {
        if (event.target.closest('#sheetFavBtn')) {
            if (state.currentBouquetId) {
                toggleFavorite(state.currentBouquetId);
                syncModalFavoriteButton();
            }
            return;
        }

        if (event.target.closest('.sheet-round-btn')) {
            closeBouquetModal();
            return;
        }

        const qtyBtn = event.target.closest('.qty button');
        if (qtyBtn) {
            const delta = qtyBtn.textContent.trim() === '+' ? 1 : -1;
            changeModalQty(delta);
            return;
        }

        if (event.target.closest('#ctaBtn')) {
            addToCartFromModal();
            return;
        }

        if (event.target.closest('.sheet-carousel-btn.prev')) {
            slideSheet(-1);
            return;
        }

        if (event.target.closest('.sheet-carousel-btn.next')) {
            slideSheet(1);
        }
    });

    overlay?.addEventListener('click', closeBouquetModal);

    bottomNav?.addEventListener('click', (event) => {
        const navBtn = event.target.closest('.nav-btn');
        if (!navBtn) return;

        setView(navBtn.dataset.nav);
    });

    buyBtn?.addEventListener('click', openCheckout);
    checkoutOverlay?.addEventListener('click', closeCheckout);
    checkoutClose?.addEventListener('click', closeCheckout);
    checkoutForm?.addEventListener('submit', handleCheckoutSubmit);
}

function toggleFavorite(id) {
    if (!id) return;

    if (state.favorites.has(id)) {
        state.favorites.delete(id);
    } else {
        state.favorites.add(id);
    }

    updateUI();
}

function openBouquetModal(id) {
    const bouquet = state.catalog.find((item) => item.id === id);
    if (!bouquet) return;

    state.currentBouquetId = id;
    state.currentQty = 1;
    state.currentSlides = getBouquetSlides(bouquet);
    state.currentSlideIndex = 0;

    const modalData = {
        title: bouquet.title,
        priceFormatted: bouquet.priceFormatted,
        description: bouquet.description || 'Описание отсутствует',
        compositionText: bouquet.compositionText,
        size: bouquet.size,
        durability: bouquet.durability
    };

    renderSlidesUI(state.currentSlides, state.currentSlideIndex);
    openBouquetModalUI(modalData, state.currentQty, state.favorites.has(id));
}

function closeBouquetModal() {
    state.currentBouquetId = null;
    state.currentQty = 1;
    state.currentSlides = [];
    state.currentSlideIndex = 0;
    closeBouquetModalUI();
}

function changeModalQty(delta) {
    state.currentQty = Math.max(1, state.currentQty + delta);
    updateModalQtyUI(state.currentQty);
}

function slideSheet(direction) {
    if (state.currentSlides.length <= 1) return;

    state.currentSlideIndex =
        (state.currentSlideIndex + direction + state.currentSlides.length) %
        state.currentSlides.length;

    updateSlidePositionUI(state.currentSlideIndex);
}

function addToCartFromModal() {
    if (!state.currentBouquetId) return;

    const currentQty = state.cart.get(state.currentBouquetId) || 0;
    state.cart.set(state.currentBouquetId, currentQty + state.currentQty);

    closeBouquetModal();
    updateUI();
}

function handleCartClick(event) {
    const actionBtn = event.target.closest('[data-cart-action]');
    if (!actionBtn) return;

    const id = actionBtn.dataset.cartId;
    const action = actionBtn.dataset.cartAction;

    if (action === 'inc') {
        changeCartQty(id, 1);
    } else if (action === 'dec') {
        changeCartQty(id, -1);
    } else if (action === 'remove') {
        removeFromCart(id);
    }
}

function handleDeliveryClick(event) {
    const actionBtn = event.target.closest('[data-delivery-action]');
    if (!actionBtn) return;

    const action = actionBtn.dataset.deliveryAction;
    const orderId = actionBtn.dataset.orderId;

    if (action === 'approve') {
        approveBouquet(orderId);
    } else if (action === 'reject') {
        rejectBouquet(orderId);
    }
}

function changeCartQty(id, delta) {
    if (!id) return;

    const currentQty = state.cart.get(id) || 0;
    const nextQty = Math.max(0, currentQty + delta);

    if (nextQty === 0) {
        state.cart.delete(id);
    } else {
        state.cart.set(id, nextQty);
    }

    updateUI();
}

function removeFromCart(id) {
    if (!id) return;

    state.cart.delete(id);
    updateUI();
}

function setView(view) {
    if (!['home', 'fav', 'cart', 'delivery'].includes(view)) return;

    state.currentView = view;

    if (view === 'delivery') {
        updateUI();
        loadActiveOrder();
        return;
    }

    updateUI();
}

function renderDeliveryView() {
    if (state.isDeliveryLoading) {
        catalogContainer.innerHTML =
            '<div class="loading"><div class="spin">🌸</div><div style="margin-top: 8px">Загружаем статус...</div></div>';
        return;
    }

    renderDeliveryTrackerUI(state.activeOrder, catalogContainer);
}

async function loadActiveOrder() {
    state.isDeliveryLoading = true;
    renderDeliveryView();

    try {
        const orders = await getMyOrders();
        state.activeOrder =
            orders.find((order) => order.status !== 'DELIVERED') || orders[0] || null;
    } catch (error) {
        console.error('Ошибка загрузки заказа:', error);
        state.activeOrder = null;
        catalogContainer.innerHTML =
            '<div class="empty">Не удалось загрузить данные о заказе.</div>';
        return;
    } finally {
        state.isDeliveryLoading = false;
    }

    if (state.currentView === 'delivery') {
        renderDeliveryView();
    }
}

async function approveBouquet(orderId) {
    const button = document.querySelector('[data-delivery-action="approve"]');

    try {
        if (button) button.disabled = true;
        await updateOrderStatus(orderId, 'READY');
        await loadActiveOrder();
    } catch (error) {
        showPopup({
            title: 'Не удалось подтвердить',
            message: error.message || 'Попробуйте еще раз.',
            buttons: [{ type: 'ok', text: 'Понятно' }]
        });
        if (button) button.disabled = false;
    }
}

async function rejectBouquet(orderId) {
    const noteInput = document.getElementById('revisionNote');
    const note = noteInput ? noteInput.value.trim() : '';

    if (!note) {
        showPopup({
            title: 'Нужен комментарий',
            message: 'Напишите, что именно нужно исправить.',
            buttons: [{ type: 'ok', text: 'Понятно' }]
        });
        return;
    }

    const button = document.querySelector('[data-delivery-action="reject"]');

    try {
        if (button) button.disabled = true;
        await updateOrderStatus(orderId, 'REVISION', note);
        await loadActiveOrder();
    } catch (error) {
        showPopup({
            title: 'Не удалось отправить правки',
            message: error.message || 'Попробуйте еще раз.',
            buttons: [{ type: 'ok', text: 'Понятно' }]
        });
        if (button) button.disabled = false;
    }
}

function getCartSummary() {
    const items = Array.from(state.cart.entries())
        .map(([id, qty]) => {
            const product = state.catalog.find((item) => item.id === id);
            if (!product) return null;

            const lineTotal = product.price * qty;

            return {
                id,
                qty,
                title: product.title,
                unitPriceFormatted: product.priceFormatted,
                lineTotal,
                lineTotalFormatted: `${lineTotal.toLocaleString('ru-RU')} ₽`,
                thumbHtml: product.imageUrl
                    ? `<img class="cart-thumb" src="${escapeAttribute(product.imageUrl)}" alt="${escapeAttribute(product.title)}" loading="lazy">`
                    : '<div class="cart-ph">🌸</div>'
            };
        })
        .filter(Boolean);

    const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const count = items.reduce((sum, item) => sum + item.qty, 0);

    return {
        items,
        count,
        totalAmount,
        totalFormatted: `${totalAmount.toLocaleString('ru-RU')} ₽`
    };
}

function syncNav() {
    bottomNav?.querySelectorAll('.nav-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.nav === state.currentView);
    });
}

function syncHeaderActions(cartSummary) {
    if (!buyBtn) return;

    const canPay = state.currentView === 'cart' && cartSummary.count > 0;
    buyBtn.classList.toggle('hidden', !canPay);
}

function openCheckout() {
    if (getCartSummary().count === 0) return;

    openCheckoutModalUI();
}

function closeCheckout() {
    closeCheckoutModalUI();
}

async function handleCheckoutSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const name = form.checkoutName?.value.trim();
    const phone = form.checkoutPhone?.value.trim();
    const address = form.checkoutAddress?.value.trim();
    const comment = form.checkoutComment?.value.trim();

    if (!name || !phone || !address) {
        showCheckoutErrorUI('Пожалуйста, заполните имя, телефон и адрес доставки.');
        return;
    }

    if (!isValidPhone(phone)) {
        showCheckoutErrorUI('Пожалуйста, укажите корректный номер телефона.');
        return;
    }

    const cartItems = Array.from(state.cart.entries());
    if (!cartItems.length) return;

    const [productId] = cartItems[0];

    const payload = {
        product_id: productId,
        recipient_name: name,
        recipient_phone: phone,
        delivery_address: address,
        delivery_comment: comment || null
    };

    try {
        setCheckoutLoadingUI(true);
        const response = await createOrder(payload);

        if (response?.success) {
            state.lastOrderId = response.order_id;
            state.activeOrder = {
                id: response.order_id,
                status: 'NEW',
                delivery_address: payload.delivery_address
            };
            state.cart.clear();
            form.reset();
            closeCheckout();
            setView('delivery');

            showPopup({
                title: 'Заказ оформлен!',
                message: `Ваш заказ #${response.order_id} успешно создан.`,
                buttons: [{ type: 'ok', text: 'Отлично' }]
            });
        }
    } catch (error) {
        showCheckoutErrorUI(
            error.message || 'Произошла ошибка при создании заказа. Попробуйте снова.'
        );
    } finally {
        setCheckoutLoadingUI(false);
        updateUI();
    }
}

function isValidPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
}

function syncModalFavoriteButton() {
    const favBtn = document.getElementById('sheetFavBtn');
    if (favBtn) {
        favBtn.textContent = state.favorites.has(state.currentBouquetId) ? '❤' : '♡';
    }
}

function getBouquetSlides(bouquet) {
    if (bouquet.imageUrl) {
        return [{ type: 'image', url: bouquet.imageUrl }];
    }

    return [
        {
            type: 'placeholder',
            color1: '#f8f2eb',
            color2: '#f3ece5',
            emoji: '🌸'
        }
    ];
}

function escapeAttribute(value) {
    return String(value ?? '').replace(
        /[&<>"']/g,
        (char) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[char]
    );
}

document.addEventListener('DOMContentLoaded', initApp);
