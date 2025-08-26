
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbweGxvOCzzONVZI7Eth-J3sUTaSgD5XBOOE3aSXchaYYfWr10Bmh0Idep8VU3Kl4W61/exec';
  /* GANTI DENGAN NOMOR WHATSAPP ADMIN ANDA (gunakan format 62, bukan 0) */
  const ADMIN_WHATSAPP_NUMBER = '6281290156936';

  const PRICING_RULES = {
    "KP": { /* Aturan ini berlaku untuk produk yang ID-nya diawali "KP" */
      tiers: [
        { minQty: 5, price: 129000 }, /* Jika kuantitas 10+, harga per item 129.000 */
        
      ]
    }
  };

  const VOUCHER_CODES = {
    "DISKONTSHIRT": {
      discount: 10000,
      target: "TP"
    }
  };

  function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return ''; 
    let cleanNumber = String(phoneNumber).trim();
    cleanNumber = cleanNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('62')) {
      cleanNumber = '0' + cleanNumber.substring(2);
    }
    return cleanNumber;
  }

  function renderProducts(products) {
    const productContainer = document.getElementById('product-container');
    if (!productContainer) return;
    productContainer.innerHTML = '';

    const groupedProducts = products.reduce((acc, product) => {
      acc[product.productId] = acc[product.productId] || [];
      acc[product.productId].push(product);
      return acc;
    }, {});

    for (const productId in groupedProducts) {
      const productVariants = groupedProducts[productId];
      const mainProduct = productVariants[0];
      const totalStock = productVariants.reduce((sum, variant) => sum + variant.stock, 0);

      let sizeOptionsHtml = '';
      if (mainProduct.size !== '-') {
        productVariants.forEach(variant => {
          const stockStatus = variant.stock > 0 ? variant.stock + ' tersisa' : 'Habis';
          const disabled = variant.stock === 0 ? 'disabled' : '';
          sizeOptionsHtml += '<option value="' + variant.size + '" ' + disabled + '>' + variant.size + ' (' + stockStatus + ')</option>';
        });
      }
      const isOutOfStock = totalStock === 0;
      const productCard = document.createElement('div');
      productCard.className = 'product-item-card ' + (isOutOfStock ? 'out-of-stock' : '');
      
      let productHTML = '<img src="' + mainProduct.image + '" alt="' + mainProduct.name + '" class="product-image">';
      productHTML += '<div class="product-info">';
      productHTML += '<div class="product-name">' + mainProduct.name + '</div>';
      productHTML += '<div class="product-price">Rp ' + mainProduct.price.toLocaleString('id-ID') + '</div>';
      if (sizeOptionsHtml) {
        productHTML += '<div class="size-selector-container">';
        productHTML += '<label for="size-' + productId + '">Ukuran:</label>';
        productHTML += '<select name="size" id="size-' + productId + '" class="size-selector">' + sizeOptionsHtml + '</select>';
        productHTML += '</div>';
      }
      productHTML += '<div class="add-to-cart-controls">';
      productHTML += '<button id="btn-' + productId + '" class="add-to-cart-btn" onclick="addToCartFromDynamic(this, \'' + productId + '\')" ' + (isOutOfStock ? 'disabled' : '') + '>';
      productHTML += isOutOfStock ? 'Stok Habis' : '+ Keranjang';
      productHTML += '</button>';
      productHTML += '</div></div>';

      productCard.innerHTML = productHTML;
      productContainer.appendChild(productCard);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {

    /* FUNGSI & LOGIKA KERANJANG (CART) */
    function getCart() { return JSON.parse(localStorage.getItem('yanoshiCart')) || []; }
    function saveCart(cart) { localStorage.setItem('yanoshiCart', JSON.stringify(cart)); updateCartIcon(); }

    function getTotalQuantityForPrefix(cart, prefix) {
      let totalQuantity = 0;
      if (!cart || !Array.isArray(cart)) return 0;
      cart.forEach(item => {
        if (item && typeof item.id === 'string' && item.id.startsWith(prefix)) {
          totalQuantity += item.quantity;
        }
      });
      return totalQuantity;
    }

    function getTieredPrice(item, totalQuantityForTier) { 
      if (!item || typeof item.id !== 'string') return item.price || 0;
      const productIdPrefix = item.id.split('-')[0].substring(0, 2); 
      const rule = PRICING_RULES[productIdPrefix];
      if (rule) {
        for (const tier of rule.tiers) {
          if (totalQuantityForTier >= tier.minQty) {
            return tier.price;
          }
        }
      }
      return item.price;
    }
    
    window.addToCartFromDynamic = (buttonElement, productId) => {
      const productCard = buttonElement.closest('.product-item-card');
      if (!productCard) {
        console.error('Tidak dapat menemukan kartu produk.');
        return;
      }

      const name = productCard.querySelector('.product-name').textContent;
      const image = productCard.querySelector('.product-image').src;
      const priceString = productCard.querySelector('.product-price').textContent;
      const price = parseInt(priceString.replace(/[^0-9]/g, ''), 10);

      const sizeSelector = productCard.querySelector('.size-selector');
      let selectedSize = '';
      if (sizeSelector) {
        selectedSize = sizeSelector.value;
      }
      
      const cartItemId = selectedSize && selectedSize !== '-' ? productId + '-' + selectedSize : productId;
      const nameForCart = selectedSize && selectedSize !== '-' ? name + ' - Size ' + selectedSize : name;
      
      let cart = getCart();
      const existingItem = cart.find(item => item.id === cartItemId);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({ id: cartItemId, name: nameForCart, price: price, image: image, quantity: 1 });
      }
      
      saveCart(cart);
      showToast(nameForCart + ' ditambahkan');
    };

   function fetchAndRenderProducts() {
    const productContainer = document.getElementById('product-container');
    if (!productContainer) return;
    
    const progressBar = document.getElementById('progress-bar');
    const loadingContainer = document.getElementById('loading-container');
    const category = document.body.dataset.category;

    if (!category) return;

    setTimeout(() => { progressBar.style.width = '90%'; }, 100);

    fetch(`${WEB_APP_URL}?action=getProducts&category=${category}`)
      .then(response => response.json())
      .then(response => {
        progressBar.style.width = '100%';
        setTimeout(() => {
          loadingContainer.style.display = 'none';
          if (response.status === 'success') {
            renderProducts(response.data);
          } else {
            productContainer.innerHTML = '<p>Gagal memuat produk: ' + response.message + '</p>';
          }
        }, 500);
      })
      .catch(error => {
        loadingContainer.style.display = 'none';
        productContainer.innerHTML = '<p>Error: ' + error.message + '</p>';
      });
  }

    function updateCartIcon() {
      const cart = getCart();
      const cartCountEl = document.getElementById('cart-count');
      if(!cartCountEl) return;
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      if (totalItems > 0) {
        cartCountEl.textContent = totalItems;
        cartCountEl.style.display = 'block';
      } else {
        cartCountEl.style.display = 'none';
      }
    }

    /* FUNGSI UNTUK HALAMAN KERANJANG */
    function renderCartPage() {
      const cart = getCart();
      const cartItemsContainer = document.getElementById('cart-items-container');
      const cartSummaryContainer = document.getElementById('cart-summary-container');
      if (!cartItemsContainer) return;
      cartItemsContainer.innerHTML = '';
      if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Keranjang belanja Anda masih kosong.</p>';
        if (cartSummaryContainer) cartSummaryContainer.style.display = 'none';
        return;
      } else {
        if (cartSummaryContainer) cartSummaryContainer.style.display = 'block';
      }
      const totalKpQuantity = getTotalQuantityForPrefix(cart, "KP");
      let totalPrice = 0;
      
      cart.forEach(item => {
        const currentPrice = getTieredPrice(item, totalKpQuantity);
        totalPrice += currentPrice * item.quantity;

        let priceHtml = '<div class="cart-item-price">Rp ' + currentPrice.toLocaleString('id-ID') + '</div>';
        if (currentPrice < item.price) {
          priceHtml = '<div class="cart-item-price discounted">Rp ' + currentPrice.toLocaleString('id-ID') + '</div>' +
                      '<div class="cart-item-price original-price"><s>Rp ' + item.price.toLocaleString('id-ID') + '</s></div>';
        }
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
          <img src="${item.image}" alt="${item.name}" class="cart-item-img">
          <div class="cart-item-details">
            <div class="cart-item-name-wrapper"><div class="cart-item-name">${item.name}</div></div>
            <div class="cart-item-price-wrapper">${priceHtml}</div>
          </div>
          <div class="cart-item-quantity">
            <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
            <span>${item.quantity}</span>
            <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
          </div>
        `;
        cartItemsContainer.appendChild(itemEl);
      });
      document.getElementById('total-price').textContent = 'Rp ' + totalPrice.toLocaleString('id-ID');
      document.getElementById('discount-row').style.display = 'none';
      const voucherInput = document.getElementById('voucher-input');
      if (voucherInput) voucherInput.value = '';
    }

    let appliedVoucher = null;
    function applyVoucher() {
      const voucherInput = document.getElementById('voucher-input');
      const voucherCode = voucherInput.value.toUpperCase();
      const cart = getCart();
      if (VOUCHER_CODES[voucherCode]) {
        const voucher = VOUCHER_CODES[voucherCode];
        let totalDiscount = 0;
        cart.forEach(item => {
          if (item && typeof item.id === 'string' && item.id.startsWith(voucher.target)) {
            totalDiscount += voucher.discount * item.quantity;
          }
        });
        if (totalDiscount > 0) {
          appliedVoucher = voucherCode;
          document.getElementById('discount-amount').textContent = '- Rp ' + totalDiscount.toLocaleString('id-ID');
          document.getElementById('discount-row').style.display = 'flex';
          const subtotal = cart.reduce((sum, item) => sum + (getTieredPrice(item, getTotalQuantityForPrefix(cart, "KP")) * item.quantity), 0);
          const finalTotal = subtotal - totalDiscount;
          document.getElementById('total-price').textContent = 'Rp ' + finalTotal.toLocaleString('id-ID');
          showNotificationPopup('Yay! Voucher berhasil digunakan!');
        } else {
          showNotificationPopup('Voucher ini tidak berlaku untuk produk di keranjangmu.');
          appliedVoucher = null;
        }
      } else {
        showNotificationPopup('Kode voucher salah atau tidak valid.');
        appliedVoucher = null;
      }
    }

    window.updateQuantity = (productId, change) => {
      let cart = getCart();
      const item = cart.find(i => i.id === productId);
      if (item) {
        item.quantity += change;
        if (item.quantity <= 0) { cart = cart.filter(i => i.id !== productId); }
      }
      saveCart(cart);
      renderCartPage();
    };

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        const customerName = document.getElementById('customer-name').value;
        const rawCustomerWhatsapp = document.getElementById('customer-whatsapp').value;
        const customerWhatsapp = formatPhoneNumber(rawCustomerWhatsapp);
        const namaPenerima = document.getElementById('recipient-name').value;
        const rawNomorPenerima = document.getElementById('recipient-phone').value;
        const nomorPenerima = formatPhoneNumber(rawNomorPenerima);
        const alamatPenerima = document.getElementById('shipping-address').value;
        const tanggalKirim = document.getElementById('shipping-date').value;
        if (!customerName || !customerWhatsapp || !namaPenerima || !nomorPenerima || !alamatPenerima) {
          showNotificationPopup('Mohon isi nama, nomor WhatsApp Kamu dan info pengiriman.');
          return;
        }
        const cart = getCart();
        if (cart.length === 0) { alert('Keranjang Anda kosong.'); return; }
        
        const totalKpQuantity = getTotalQuantityForPrefix(cart, "KP");
        let tieredTotalPrice = 0; 
        cart.forEach(item => { tieredTotalPrice += getTieredPrice(item, totalKpQuantity) * item.quantity; });
        
        let totalDiscount = 0;
        if (appliedVoucher && VOUCHER_CODES[appliedVoucher]) {
          const voucher = VOUCHER_CODES[appliedVoucher];
          cart.forEach(item => {
            if (item && typeof item.id === 'string' && item.id.startsWith(voucher.target)) {
              totalDiscount += voucher.discount * item.quantity;
            }
          });
        }
        const finalTotalPrice = tieredTotalPrice - totalDiscount;
        const orderData = {
          customerName, customerWhatsapp, namaPenerima, nomorPenerima, alamatPenerima, tanggalKirim,
          items: cart, totalPrice: finalTotalPrice, voucherCode: appliedVoucher || ''
        };
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Memproses...';
        fetch(WEB_APP_URL, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'text/plain;charset=utf-8',
		  },
		  body: JSON.stringify(orderData) 
		})
		.then(response => response.json())
		.then(response => {
		  if (response.status === 'success') {
			appliedVoucher = null;
			const defaultMessage = "Jangan ubah format pesan ini, langsung tekan tombol send.\n\nhalo admin Yanoshi, saya *" + customerName + "* sudah checkout dari webstore Yanoshi, tolong segera di proses ya!";
			const waLink = "https://wa.me/" + ADMIN_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(defaultMessage);
			document.getElementById('konfirmasi-wa-btn').href = waLink;
			localStorage.removeItem('yanoshiCart');
			document.getElementById('checkout-popup').style.display = 'flex';
		  } else {
			alert('Terjadi kesalahan: ' + response.message);
			checkoutBtn.disabled = false;
			checkoutBtn.textContent = 'CHECKOUT';
		  }
		})
		.catch(error => {
		  alert('Gagal terhubung ke server: ' + error.message);
		  checkoutBtn.disabled = false;
		  checkoutBtn.textContent = 'CHECKOUT';
		});
      });
    }

    const applyVoucherBtn = document.getElementById('apply-voucher-btn');
    if (applyVoucherBtn) { applyVoucherBtn.addEventListener('click', applyVoucher); }
    
    const closeNotificationBtn = document.getElementById('close-notification-btn');
    if (closeNotificationBtn) {
      closeNotificationBtn.addEventListener('click', () => {
        const popup = document.getElementById('notification-popup');
        if(popup) popup.style.display = 'none';
      });
    }

    /* FUNGSI UI (MENU, MODAL, SLIDER, DLL) */
    function initializeNavMenu() {
      const hamburgerMenu = document.querySelector('.hamburger-menu');
      const closeBtn = document.querySelector('.close-btn');
      const dropdownBtn = document.querySelector('.dropdown-btn');
      if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', () => { document.getElementById('mySidenav').style.width = '250px'; });
      }
      if (closeBtn) {
        closeBtn.addEventListener('click', () => { document.getElementById('mySidenav').style.width = '0'; });
      }
      if (dropdownBtn) {
        dropdownBtn.addEventListener('click', function() {
          this.classList.toggle('active');
          const dropdownContent = this.nextElementSibling;
          if (dropdownContent) dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        });
      }
    }

    function initializeImageModal() {
      const modal = document.getElementById('imageModal');
      const modalImg = document.getElementById('modalImage');
      const closeSpan = document.querySelector('.modal-close');
      if (!modal || !modalImg || !closeSpan) return;
      document.body.addEventListener('click', function(event) {
        if (event.target.classList.contains('product-image')) {
          modal.style.display = 'block';
          modalImg.src = event.target.src;
        }
      });
      closeSpan.onclick = () => { modal.style.display = 'none'; };
      window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }
    }
    
    let toastTimeout;
    function showToast(message) {
      const toast = document.getElementById('toast-notification');
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 1500);
    }
    
    function showNotificationPopup(message) {
      const popup = document.getElementById('notification-popup');
      const messageEl = document.getElementById('notification-message');
      if (popup && messageEl) {
        messageEl.textContent = message;
        popup.style.display = 'flex';
      }
    }

    function showPromoPopup() {
      const popup = document.getElementById('promo-popup');
      if (popup) popup.style.display = 'flex';
    }

    function initializePromoPopup() {
      const promoPopup = document.getElementById('promo-popup');
      if (!promoPopup) return;
      setTimeout(showPromoPopup, 1000);
      const closePromoBtn = document.getElementById('close-promo-popup');
      if (closePromoBtn) {
        closePromoBtn.addEventListener('click', () => promoPopup.style.display = 'none');
        promoPopup.addEventListener('click', (event) => {
          if (event.target === promoPopup) promoPopup.style.display = 'none';
        });
      }
    }

    window.showSizeChart = (imageUrl) => {
      const modal = document.getElementById('imageModal');
      const modalImg = document.getElementById('modalImage');
      if (modal && modalImg) { modalImg.src = imageUrl; modal.style.display = 'block'; }
    }

    function initializeSlider() {
      const slider = document.querySelector('.slider');
      if (!slider) return;
      const slides = Array.from(slider.children);
      if(slides.length <=1) return;
      const slideCount = slides.length;
      let currentIndex = 1;
      let intervalId;
      let isDragging = false, startPos = 0, currentTranslate = 0, prevTranslate = 0;
      const firstClone = slides[0].cloneNode(true);
      const lastClone = slides[slideCount - 1].cloneNode(true);
      slider.appendChild(firstClone);
      slider.insertBefore(lastClone, slides[0]);
      
      const getSlideWidth = () => slider.parentElement ? slider.parentElement.offsetWidth : 0;

      const setInitialPosition = () => {
        slider.style.transition = 'none';
        const slideWidth = getSlideWidth();
        currentTranslate = -currentIndex * slideWidth;
        slider.style.transform = 'translateX(' + currentTranslate + 'px)';
        prevTranslate = currentTranslate;
        setTimeout(() => { slider.style.transition = 'transform 0.5s ease-in-out'; }, 50);
      };
      setInitialPosition();
      
      slider.addEventListener('transitionend', () => {
        const slideWidth = getSlideWidth();
        if (currentIndex === slides.length + 1) {
            slider.style.transition = 'none';
            currentIndex = 1;
            currentTranslate = -currentIndex * slideWidth;
            slider.style.transform = 'translateX(' + currentTranslate + 'px)';
            prevTranslate = currentTranslate;
        }
        if (currentIndex === 0) {
            slider.style.transition = 'none';
            currentIndex = slides.length;
            currentTranslate = -currentIndex * slideWidth;
            slider.style.transform = 'translateX(' + currentTranslate + 'px)';
            prevTranslate = currentTranslate;
        }
         setTimeout(() => { slider.style.transition = 'transform 0.5s ease-in-out'; }, 50);
      });

      const goToSlide = () => {
        const slideWidth = getSlideWidth();
        currentTranslate = -currentIndex * slideWidth;
        slider.style.transform = 'translateX(' + currentTranslate + 'px)';
        prevTranslate = currentTranslate;
      };

      const nextSlide = () => { currentIndex++; goToSlide(); };
      const startAutoSlide = () => { stopAutoSlide(); intervalId = setInterval(nextSlide, 3000); };
      const stopAutoSlide = () => { clearInterval(intervalId); };

      const dragStart = (e) => {
        stopAutoSlide(); isDragging = true;
        startPos = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        slider.style.transition = 'none';
      }
      const drag = (e) => {
        if (!isDragging) return;
        const currentPosition = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        currentTranslate = prevTranslate + (currentPosition - startPos);
        slider.style.transform = 'translateX(' + currentTranslate + 'px)';
      }
      const dragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        const movedBy = currentTranslate - prevTranslate;
        if (movedBy < -100) currentIndex++;
        if (movedBy > 100) currentIndex--;
        slider.style.transition = 'transform 0.5s ease-in-out';
        goToSlide();
        startAutoSlide();
      }
      
      slider.addEventListener('mousedown', dragStart);
      slider.addEventListener('touchstart', dragStart);
      slider.addEventListener('mouseup', dragEnd);
      slider.addEventListener('touchend', dragEnd);
      slider.addEventListener('mouseleave', dragEnd);
      slider.addEventListener('mousemove', drag);
      slider.addEventListener('touchmove', drag);
      window.addEventListener('resize', setInitialPosition);
      startAutoSlide();
    }
    
    /* INISIALISASI HALAMAN */
    const pageId = document.body.id;
    if (pageId === 'page-keranjang') { renderCartPage(); }
	if (pageId === 'page-produk') { fetchAndRenderProducts(); }
    
    initializeNavMenu();
    updateCartIcon();
    initializeImageModal();
    initializeSlider();
    initializePromoPopup();
  });
