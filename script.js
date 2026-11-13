
// MARK & MUNCH ORDERING PAGE

// Your deployed Google Apps Script Web App URL.
// Replace this placeholder with the URL ending in /exec.
const ORDER_ENDPOINT = "https://script.google.com/macros/s/AKfycbxJiO2KBKKcOyQhLdY-VHj1nPBz4dqpHDGscpdsIRbvOACYPkX7uBlO0Wnpl-JdWiI/exec";

const products = {
  enoki: { name: "Enoki Bites", price: 35 },
  cup: { name: "Cup Seoul", price: 55 },
  dino: { name: "Dino Fizz", price: 49 },
  graham: { name: "Graham Nest (Chocolate)", price: 10 },
  tea: { name: "Iced Tea Lemonade", price: 15 }
};

let cart = [];

const peso = value => "₱" + Number(value).toFixed(2);

const cartItems = document.getElementById("cart-items");
const subtotalEl = document.getElementById("subtotal");
const discountEl = document.getElementById("discount");
const totalEl = document.getElementById("total");
const cartCountEl = document.getElementById("cart-count");
const discountNote = document.getElementById("discount-note");
const submitButton = document.getElementById("submit-order");
const statusMessage = document.getElementById("status-message");

const fulfillment = document.getElementById("fulfillment");
const deliveryWrap = document.getElementById("delivery-wrap");
const deliveryLocation = document.getElementById("delivery-location");

const paymentProof = document.getElementById("payment-proof");
const proofPreview = document.getElementById("proof-preview");
const proofPreviewWrap = document.getElementById("proof-preview-wrap");
const removeProofButton = document.getElementById("remove-proof");

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getDiscount(subtotal) {
  if (subtotal >= 120) {
    return subtotal * 0.05;
  }

  return 0;
}
function renderCart() {
  const subtotal = getSubtotal();
  const discount = getDiscount(subtotal);
  const total = Math.max(0, subtotal - discount);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  cartCountEl.textContent = `${count} ${count === 1 ? "item" : "items"}`;
  subtotalEl.textContent = peso(subtotal);
  discountEl.textContent = "−" + peso(discount);
  totalEl.textContent = peso(total);
  submitButton.textContent = `Place order · ${peso(total)}`;

  if (subtotal < 120) {
  discountNote.textContent =
    `Spend ${peso(120 - subtotal)} more to unlock your 5% discount.`;
} else {
  discountNote.textContent =
    `Congratulations! You unlocked 5% off (${peso(discount)}).`;
}

  if (!cart.length) {
    cartItems.innerHTML =
      '<p class="empty-cart">Your cart is empty. Add something delicious!</p>';
    return;
  }

  cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-line">
      <div>
        <h4>${escapeHtml(item.name)}</h4>
        <small>${peso(item.price)} each · ${peso(item.price * item.qty)}</small>
      </div>
      <div class="cart-actions">
        <button class="qty-btn" type="button"
          aria-label="Decrease quantity"
          data-action="minus" data-index="${index}">−</button>
        <strong>${item.qty}</strong>
        <button class="qty-btn" type="button"
          aria-label="Increase quantity"
          data-action="plus" data-index="${index}">+</button>
        <button class="remove-btn" type="button"
          aria-label="Remove item"
          data-action="remove" data-index="${index}">×</button>
      </div>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Add products to cart
document.querySelectorAll("[data-add]").forEach(button => {
  button.addEventListener("click", () => {
    const key = button.dataset.add;
    const flavor = key === "dino"
      ? document.getElementById("dino-flavor").value
      : "";

    const product = products[key];
    const name = flavor ? `${product.name} - ${flavor}` : product.name;

    const existing = cart.find(item => item.name === name);

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        key,
        name,
        price: product.price,
        qty: 1
      });
    }

    renderCart();

    document.getElementById("your-order").scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  });
});

// Cart quantity and remove buttons
cartItems.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const index = Number(button.dataset.index);
  const action = button.dataset.action;

  if (!cart[index]) return;

  if (action === "plus") cart[index].qty += 1;
  if (action === "minus") cart[index].qty -= 1;

  if (action === "remove" || cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  renderCart();
});

// Show or hide delivery location
fulfillment.addEventListener("change", () => {
  const isDelivery = fulfillment.value === "Delivery";

  deliveryWrap.classList.toggle("hidden", !isDelivery);
  deliveryLocation.required = isDelivery;

  if (!isDelivery) deliveryLocation.value = "";
});

// Payment screenshot preview and validation
paymentProof.addEventListener("change", () => {
  const file = paymentProof.files[0];

  statusMessage.className = "status-message";
  statusMessage.textContent = "";

  if (!file) {
    clearPaymentProof();
    return;
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    showError("Please upload a JPG, PNG, or WEBP image.");
    clearPaymentProof();
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showError("Your screenshot is too large. Maximum file size is 3 MB.");
    clearPaymentProof();
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    proofPreview.src = reader.result;
    proofPreviewWrap.classList.remove("hidden");
  };

  reader.onerror = () => {
    showError("Could not preview your screenshot. Please try again.");
    clearPaymentProof();
  };

  reader.readAsDataURL(file);
});

function clearPaymentProof() {
  paymentProof.value = "";
  proofPreview.src = "";
  proofPreviewWrap.classList.add("hidden");
}

removeProofButton.addEventListener("click", clearPaymentProof);

function showError(message) {
  statusMessage.className = "status-message error";
  statusMessage.textContent = message;
}

// Convert screenshot to Base64 for Apps Script
function convertPaymentProof(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.split(",")[1];

      if (!base64) {
        reject(new Error("Could not read payment screenshot."));
        return;
      }

      resolve({
        fileName: file.name,
        mimeType: file.type,
        data: base64
      });
    };

    reader.onerror = () => reject(new Error("Could not read payment screenshot."));
    reader.readAsDataURL(file);
  });
}

// Submit order
document.getElementById("order-form").addEventListener("submit", async event => {
  event.preventDefault();

  statusMessage.className = "status-message";
  statusMessage.textContent = "";

  if (!cart.length) {
    showError("Please add at least one item before placing your order.");
    return;
  }

  if (!ORDER_ENDPOINT.startsWith("https://script.google.com/macros/s/") ||
      !ORDER_ENDPOINT.endsWith("/exec")) {
    showError("Please paste your deployed Google Apps Script Web App URL into script.js.");
    return;
  }

  const form = event.currentTarget;

  if (!form.reportValidity()) return;

  const file = paymentProof.files[0];

  if (!file) {
    showError("Please upload your GCash payment screenshot.");
    paymentProof.focus();
    return;
  }

  if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
    showError("Please upload a JPG, PNG, or WEBP screenshot up to 3 MB.");
    return;
  }

  const originalButtonText = `Place order · ${peso(getSubtotal() - getDiscount(getSubtotal()))}`;
  submitButton.disabled = true;
  submitButton.textContent = "Preparing your order...";

  try {
    const formData = new FormData(form);
    const subtotal = getSubtotal();
    const discount = getDiscount(subtotal);

    const paymentProofData = await convertPaymentProof(file);

    const order = {
      orderId: "MM-" + Date.now().toString().slice(-8),
      submittedAt: new Date().toISOString(),

      customer: {
        name: String(formData.get("name") || "").trim(),
        section: String(formData.get("section") || "").trim(),
        fulfillment: formData.get("fulfillment"),
        deliveryLocation: String(formData.get("deliveryLocation") || "").trim(),
        preferredTime: formData.get("preferredTime"),
        notes: String(formData.get("notes") || "").trim()
      },

      items: cart.map(item => ({
        name: item.name,
        quantity: item.qty,
        unitPrice: item.price,
        lineTotal: item.price * item.qty
      })),

      subtotal,
      discount,
      total: subtotal - discount,
      paymentProof: paymentProofData
    };

    submitButton.textContent = "Sending your order...";

    // no-cors allows the browser to send the request to Apps Script.
    // The browser cannot read the server response in this mode.
    await fetch(ORDER_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(order)
    });

    statusMessage.className = "status-message success";
    statusMessage.textContent =
      `Your order ${order.orderId} has been submitted. Please wait for the Mark & Munch team to confirm it. Since the browser cannot verify the server response, the team should check the Orders spreadsheet.`;

    cart = [];
    form.reset();
    clearPaymentProof();

    deliveryWrap.classList.add("hidden");
    deliveryLocation.required = false;

    renderCart();

  } catch (error) {
    console.error("Order submission error:", error);
    showError("We couldn't send your order. Please check your internet connection and try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    renderCart();
  }
});

renderCart();
