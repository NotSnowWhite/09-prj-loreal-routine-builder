/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}
/* Track selected products by ID so selection persists across renders */
const selectedProductIds = new Set();

/* Store all products for lookup */
let allProducts = [];

/* Toggle product selection by product id */
function toggleProductSelectionById(productId, cardEl) {
  if (selectedProductIds.has(productId)) {
    selectedProductIds.delete(productId);
    if (cardEl) cardEl.classList.remove("selected");
    else {
      const rendered = productsContainer.querySelector(
        `.product-card[data-id="${productId}"]`
      );
      if (rendered) rendered.classList.remove("selected");
    }
  } else {
    selectedProductIds.add(productId);
    if (cardEl) cardEl.classList.add("selected");
    else {
      const rendered = productsContainer.querySelector(
        `.product-card[data-id="${productId}"]`
      );
      if (rendered) rendered.classList.add("selected");
    }
  }
  updateSelectedProductsUI();
}

/* Update the selected products list in the UI */
function updateSelectedProductsUI() {
  const selectedProductsList = document.getElementById("selectedProductsList");
  selectedProductsList.innerHTML = Array.from(selectedProductIds)
    .map((id) => {
      const product = allProducts.find((p) => p.id === id);
      const name = product ? product.name : "#" + id;
      return `
      <div class="product-badge" data-id="${id}">
        ${name}
        <button class="remove-badge" aria-label="Remove ${name}" data-id="${id}">×</button>
      </div>
    `;
    })
    .join("");
}

// Allow removing items directly from the selected products list
document
  .getElementById("selectedProductsList")
  .addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-badge");
    if (!btn) return;
    const idStr = btn.dataset.id;
    const id = idStr ? parseInt(idStr, 10) : NaN;
    if (!id) return;
    toggleProductSelectionById(id);
  });

/* Create HTML for displaying product cards. If a product's id is selected, add the `selected` class. */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProductIds.has(product.id);
      // Use a safe data-id attribute (numeric) to avoid breaking HTML when product text contains apostrophes
      return `
    <div class="product-card${isSelected ? " selected" : ""}" data-id="${
        product.id
      }">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `;
    })
    .join("");
}

/* Event delegation: handle clicks on product cards inside the container */
productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card || !productsContainer.contains(card)) return;
  try {
    const idStr =
      card.dataset.id || card.dataset.productId || card.getAttribute("data-id");
    const productId = idStr ? parseInt(idStr, 10) : NaN;
    if (!productId) return;
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;
    console.debug("product card clicked", {
      id: productId,
      target: e.target.tagName,
    });
    toggleProductSelectionById(productId, card);
  } catch (err) {
    console.warn("Failed to parse product data", err);
  }
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  // keep a master copy for lookup when rendering selected badges
  allProducts = products;
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
