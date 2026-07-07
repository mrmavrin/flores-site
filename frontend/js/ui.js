export function renderCatalog(container, items, favorites) {
    if (!items || !items.length) {
        container.innerHTML =
            '<div class="empty">В этом разделе пока пусто. Попробуйте другой фильтр или вернитесь на главную.</div>';
        return;
    }

    container.innerHTML = items
        .map((item) => cardTemplate(item, favorites.has(item.id)))
        .join('');
}

export function updateCountersUI({ favoritesCount = 0, cartCount = 0 }) {
    setText('favCount', favoritesCount);
    setText('cartCount', cartCount);
}

export function renderCart(container, items, totalFormatted) {
    if (!items || !items.length) {
        container.innerHTML =
            '<div class="empty">Корзина пуста. Добавьте букет из витрины, и он появится здесь.</div>';
        return;
    }

    container.innerHTML = `
        <div class="cart-list">
            ${items.map(cartLineTemplate).join('')}
            <div class="delivery-card">
                <div class="delivery-title">Итого</div>
                <p>${escapeHtml(totalFormatted)}</p>
            </div>
        </div>
    `;
}

function cardTemplate(item, isFav) {
    const isHidden = item._status === 'hidden' ? 'is-hidden' : '';
    const favClass = isFav ? 'active' : '';
    const favIcon = isFav ? '❤' : '♡';
    const title = escapeHtml(item.title);
    const description = escapeHtml(item.description);
    const priceFormatted = escapeHtml(item.priceFormatted);

    return `
    <article class="card ${isHidden}" data-bouquet-id="${escapeHtml(item.id)}">
        <div class="card-media">
            ${item.mediaHtml || ''}
            <button class="fav-btn ${favClass}" type="button" data-favorite-id="${escapeHtml(item.id)}">
                ${favIcon}
            </button>
            ${item.badgeHtml || ''}
        </div>
        <div class="card-body">
            <h3 class="card-title">${title}</h3>
            ${description ? `<div class="card-desc">${description}</div>` : ''}
            <div class="card-price">${priceFormatted}</div>
        </div>
    </article>`;
}

function cartLineTemplate(item) {
    return `
    <div class="cart-line" data-cart-id="${escapeHtml(item.id)}">
        ${item.thumbHtml || '<div class="cart-ph">🌸</div>'}
        <div>
            <div class="cart-name">${escapeHtml(item.title)}</div>
            <div class="cart-sub">${escapeHtml(item.unitPriceFormatted)} × ${escapeHtml(item.qty)}</div>
        </div>
        <div class="cart-right">
            <div class="cart-price">${escapeHtml(item.lineTotalFormatted)}</div>
            <button class="cart-remove" type="button" data-cart-action="remove" data-cart-id="${escapeHtml(item.id)}">×</button>
            <div class="cart-qty">
                <div class="cart-qty-inner">
                    <button type="button" data-cart-action="dec" data-cart-id="${escapeHtml(item.id)}">−</button>
                    <span>${escapeHtml(item.qty)}</span>
                    <button type="button" data-cart-action="inc" data-cart-id="${escapeHtml(item.id)}">+</button>
                </div>
            </div>
        </div>
    </div>`;
}

export function openBouquetModalUI(data, qty, isFav) {
    setText('sheetName', data.title);
    setText('sheetPrice', data.priceFormatted);
    setText('sheetDesc', data.description);
    setText('sheetComposeShort', data.compositionText);
    setText('sheetSize', data.size);
    setText('sheetDurability', data.durability);
    setText('sheetFavBtn', isFav ? '❤' : '♡');
    setText('qtyValue', qty);

    const sheetScroll = document.getElementById('sheetScroll');
    const overlay = document.getElementById('overlay');
    const sheet = document.getElementById('sheet');

    if (sheetScroll) sheetScroll.scrollTop = 0;
    overlay?.classList.add('open');
    sheet?.classList.add('open');
    document.body.classList.add('modal-lock');
}

export function closeBouquetModalUI() {
    document.getElementById('overlay')?.classList.remove('open');
    document.getElementById('sheet')?.classList.remove('open');
    document.body.classList.remove('modal-lock');
}

export function updateModalQtyUI(qty) {
    setText('qtyValue', qty);
}

export function renderSlidesUI(slides, currentIndex) {
    const track = document.getElementById('sheetTrack');
    const dots = document.getElementById('sheetDots');
    const mediaBox = document.getElementById('sheetMedia');

    if (!track || !dots || !mediaBox) return;

    const preparedSlides = slides?.length
        ? slides
        : [{ type: 'placeholder', color1: '#f8f2eb', color2: '#f3ece5', emoji: '🌸' }];
    const hasVideo = preparedSlides.some((slide) => slide.type === 'video');

    mediaBox.classList.toggle('media-video', hasVideo);
    mediaBox.classList.toggle('media-image', !hasVideo);
    mediaBox.classList.toggle('single-slide', preparedSlides.length <= 1);

    track.innerHTML = preparedSlides.map(slideTemplate).join('');
    dots.innerHTML = preparedSlides
        .map((_, index) => `<span class="dot ${index === currentIndex ? 'active' : ''}"></span>`)
        .join('');

    track.querySelectorAll('video').forEach((video) => {
        const play = video.play();
        if (play && typeof play.catch === 'function') {
            play.catch(() => {
                video.controls = true;
                video.muted = true;
            });
        }
    });

    updateSlidePositionUI(currentIndex);
}

export function updateSlidePositionUI(index) {
    const mediaBox = document.getElementById('sheetMedia');
    const track = document.getElementById('sheetTrack');
    if (!mediaBox || !track) return;

    const width = mediaBox.offsetWidth || window.innerWidth;
    track.style.transform = `translate3d(-${index * width}px, 0, 0)`;

    document.querySelectorAll('.dot').forEach((dot, dotIndex) => {
        dot.classList.toggle('active', dotIndex === index);
    });
}

export function openCheckoutModalUI() {
    document.getElementById('checkoutError')?.classList.remove('open');
    document.getElementById('checkoutOverlay')?.classList.add('open');
    document.getElementById('checkoutModal')?.classList.add('open');
    document.body.classList.add('modal-lock');
}

export function closeCheckoutModalUI() {
    document.getElementById('checkoutOverlay')?.classList.remove('open');
    document.getElementById('checkoutModal')?.classList.remove('open');
    document.body.classList.remove('modal-lock');
}

export function showCheckoutErrorUI(message) {
    const errorEl = document.getElementById('checkoutError');
    if (!errorEl) return;

    errorEl.textContent = message;
    errorEl.classList.add('open');
}

export function setCheckoutLoadingUI(isLoading) {
    const button = document.querySelector('#checkoutForm .main-cta');
    if (!button) return;

    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = 'Оформляем...';
        button.disabled = true;
        return;
    }

    button.textContent = button.dataset.originalText || 'Перейти к оплате';
    button.disabled = false;
}

function slideTemplate(slide) {
    if (slide.type === 'video') {
        return `<div class="slide"><video src="${escapeHtml(slide.url)}" autoplay muted loop playsinline webkit-playsinline></video></div>`;
    }

    if (slide.type === 'placeholder') {
        return `<div class="slide" style="background:linear-gradient(145deg, ${escapeHtml(slide.color1)}, ${escapeHtml(slide.color2)})">${escapeHtml(slide.emoji)}</div>`;
    }

    return `<div class="slide"><img src="${escapeHtml(slide.url)}" alt="" loading="lazy"></div>`;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value ?? '';
    }
}

function escapeHtml(value) {
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
