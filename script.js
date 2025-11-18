/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const searchPanel = document.getElementById("searchPanel");
const searchPanelInput = document.getElementById("searchPanelInput");
const searchBubblesEl = document.getElementById("searchBubbles");
const searchDropdown = document.getElementById("searchDropdown");

// Keyword bubble options
const keywordOptions = ["makeup", "haircare", "skincare", "fragrance"];
const activeKeywords = new Set();
// Map each keyword bubble to the categories it should include
const keywordCategoryMap = {
  makeup: ["makeup"],
  fragrance: ["fragrance"],
  haircare: ["haircare", "hair color", "hair styling", "men's grooming"],
  skincare: ["cleanser", "moisturizer", "suncare"],
};

function renderSearchBubbles() {
  if (!searchBubblesEl) return;
  searchBubblesEl.innerHTML = keywordOptions
    .map(
      (k) =>
        `<button type="button" class="search-bubble" data-keyword="${k}">${k}</button>`
    )
    .join("");

  // wire up bubble clicks
  searchBubblesEl.querySelectorAll(".search-bubble").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const kw = btn.dataset.keyword;
      if (activeKeywords.has(kw)) {
        activeKeywords.delete(kw);
        btn.classList.remove("active");
      } else {
        activeKeywords.add(kw);
        btn.classList.add("active");
      }
      // reflect keywords in search panel input placeholder (optional)
      applyFiltersAndDisplay();
      updateSearchDropdown();
    });
  });
}

// Show/hide panel when search focuses/blurs
if (searchInput && searchPanel) {
  searchInput.addEventListener("focus", () => {
    searchPanel.classList.add("open");
    searchPanel.setAttribute("aria-hidden", "false");
    // copy current searchInput into the panel input
    if (searchPanelInput) searchPanelInput.value = searchInput.value || "";
    updateSearchDropdown();
  });

  // clicking outside the panel should close it — global listener
  document.addEventListener("click", (ev) => {
    if (!searchPanel.contains(ev.target) && ev.target !== searchInput) {
      searchPanel.classList.remove("open");
      searchPanel.setAttribute("aria-hidden", "true");
    }
  });

  // keep panel input in sync with main input
  if (searchPanelInput) {
    searchPanelInput.addEventListener("input", (e) => {
      const v = e.target.value;
      if (searchInput) searchInput.value = v;
      if (_searchDebounce) clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(() => {
        applyFiltersAndDisplay();
        updateSearchDropdown();
      }, 120);
    });
  }
}

// Update the search dropdown listing based on current filters
function updateSearchDropdown() {
  if (!searchDropdown) return;
  // derive matches similar to applyFiltersAndDisplay but limited and show thumbnails
  const term = (
    searchPanelInput ? searchPanelInput.value : searchInput.value || ""
  )
    .trim()
    .toLowerCase();
  let matches = allProducts || [];

  // If the user hasn't typed anything, show the full list (optionally limited
  // by active keyword bubbles or selected category). This keeps the dropdown
  // scrollable and useful for browsing.
  if (!term) {
    matches = allProducts || [];
    // apply selected category (if any)
    const selectedCategory = categoryFilter ? categoryFilter.value : "";
    if (selectedCategory) {
      matches = matches.filter(
        (p) =>
          (p.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    // apply active keyword bubbles as category filters (if any)
    if (activeKeywords.size > 0) {
      const allowed = new Set();
      activeKeywords.forEach((k) => {
        const mapped = keywordCategoryMap[k];
        if (Array.isArray(mapped))
          mapped.forEach((c) => allowed.add(c.toLowerCase()));
      });
      matches = matches.filter((p) =>
        allowed.has((p.category || "").toLowerCase())
      );
    }
  } else {
    // When the user types, only show products that match the search term
    matches = matches.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const category = (p.category || "").toLowerCase();
      return (
        name.includes(term) ||
        brand.includes(term) ||
        desc.includes(term) ||
        category.includes(term)
      );
    });
    // still respect active keyword bubbles by intersecting with their mapped categories
    if (activeKeywords.size > 0) {
      const allowed = new Set();
      activeKeywords.forEach((k) => {
        const mapped = keywordCategoryMap[k];
        if (Array.isArray(mapped))
          mapped.forEach((c) => allowed.add(c.toLowerCase()));
      });
      matches = matches.filter((p) =>
        allowed.has((p.category || "").toLowerCase())
      );
    }
  }

  // limit to top 40 matches for dropdown
  matches = matches.slice(0, 40);

  if (matches.length === 0) {
    searchDropdown.innerHTML = `<div class="search-empty">No products found</div>`;
    return;
  }

  searchDropdown.innerHTML = matches
    .map((p) => {
      const img = p.image
        ? `<img src="${p.image}" alt="${p.name}"/>`
        : `<div class="thumb-placeholder"></div>`;
      return `
      <div class="search-item" data-id="${p.id}" role="option">
        ${img}
        <div class="meta">
          <div class="name">${p.name}</div>
          <div class="small">${p.brand} • ${p.category}</div>
        </div>
      </div>`;
    })
    .join("");

  // wire click handlers to dropdown items
  searchDropdown.querySelectorAll(".search-item").forEach((it) => {
    it.addEventListener("click", (ev) => {
      const idStr = it.dataset.id;
      const id = idStr ? parseInt(idStr, 10) : NaN;
      if (!id) return;
      const prod = (allProducts || []).find((p) => p.id === id);
      if (!prod) return;

      // add the product to selected products (if not already)
      if (!selectedProductIds.has(id)) {
        selectedProductIds.add(id);
        saveSelectionsToLocalStorage();
        updateSelectedProductsUI();
      }

      // set the category filter to the product's category and render it
      if (categoryFilter) categoryFilter.value = prod.category;
      applyFiltersAndDisplay();

      // close the search panel
      if (searchPanel) {
        searchPanel.classList.remove("open");
        searchPanel.setAttribute("aria-hidden", "true");
      }

      // after rendering, scroll the product card into view and ensure visual selection
      setTimeout(() => {
        const card = productsContainer.querySelector(
          `.product-card[data-id="${id}"]`
        );
        if (card) {
          // make sure the card shows selected state
          card.classList.add("selected");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("pulse");
          setTimeout(() => card.classList.remove("pulse"), 900);
        }
      }, 220);
    });
  });
}

// render initial bubbles
renderSearchBubbles();
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

// Cloudflare Worker endpoint (proxy to OpenAI)
const WORKER_ENDPOINT = "https://icy-heart-7d45.glatch.workers.dev/";

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
  saveSelectionsToLocalStorage();
}

/* Persist selected IDs to localStorage */
function saveSelectionsToLocalStorage() {
  try {
    const arr = Array.from(selectedProductIds);
    localStorage.setItem("selectedProductIds", JSON.stringify(arr));
  } catch (err) {
    console.warn("Failed to save selections to localStorage", err);
  }
}

/* Load selected IDs from localStorage into the Set */
function loadSelectionsFromLocalStorage() {
  try {
    const raw = localStorage.getItem("selectedProductIds");
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      arr.forEach((id) => selectedProductIds.add(id));
    }
  } catch (err) {
    console.warn("Failed to load selections from localStorage", err);
  }
}

/* Clear all selections (UI + storage) */
function clearAllSelections() {
  // remove selected class from any rendered cards
  selectedProductIds.forEach((id) => {
    const el = productsContainer.querySelector(
      `.product-card[data-id="${id}"]`
    );
    if (el) el.classList.remove("selected");
  });
  selectedProductIds.clear();
  saveSelectionsToLocalStorage();
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

  // show or hide a "Clear All" button depending on whether there are selections
  const container = document.querySelector(".selected-products");
  if (!container) return;

  let clearBtn = document.getElementById("clearSelectionsBtn");
  if (selectedProductIds.size > 0) {
    if (!clearBtn) {
      clearBtn = document.createElement("button");
      clearBtn.id = "clearSelectionsBtn";
      clearBtn.className = "clear-btn";
      clearBtn.type = "button";
      clearBtn.innerText = "Clear All";
      clearBtn.addEventListener("click", () => {
        clearAllSelections();
      });
      // insert the button after the selectedProductsList and before the generate button
      const selectedList = document.getElementById("selectedProductsList");
      const generateBtn = document.getElementById("generateRoutine");
      if (selectedList && generateBtn)
        container.insertBefore(clearBtn, generateBtn);
      else if (selectedList)
        selectedList.insertAdjacentElement("afterend", clearBtn);
    }
  } else {
    if (clearBtn) clearBtn.remove();
  }
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

// on load: populate allProducts (lookup) and restore selections from previous session
loadProducts().then((products) => {
  // keep the master list handy for name lookups and rendering selected badges
  allProducts = products;
  loadSelectionsFromLocalStorage();
  updateSelectedProductsUI();
});

/* Create HTML for displaying product cards. If a product's id is selected, add the `selected` class. */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProductIds.has(product.id);
      // Render a small info button and a hidden description panel inside each card
      return `
    <div class="product-card${isSelected ? " selected" : ""}" data-id="${
        product.id
      }">
      <button class="info-toggle" aria-expanded="false" aria-controls="desc-${
        product.id
      }">info</button>
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <div id="desc-${product.id}" class="product-desc">${
        product.description
      }</div>
      </div>
    </div>
  `;
    })
    .join("");
}

/* Toggle product description when info button is clicked (delegated) */
productsContainer.addEventListener("click", (e) => {
  const infoBtn = e.target.closest(".info-toggle");
  if (!infoBtn) return;
  const card = infoBtn.closest(".product-card");
  if (!card) return;
  const idStr = card.dataset.id;
  const productId = idStr ? parseInt(idStr, 10) : NaN;
  if (!productId) return;
  const expanded = card.classList.toggle("expanded");
  infoBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
});

/* Event delegation: handle clicks on product cards inside the container */
productsContainer.addEventListener("click", (e) => {
  // if the click originated from the info button, don't toggle selection
  if (e.target.closest(".info-toggle")) return;

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
  const selectedCategory = e.target.value;
  // ensure we have the master product list loaded
  if (!allProducts || allProducts.length === 0) {
    allProducts = await loadProducts();
  }
  applyFiltersAndDisplay();
});

// Wire search input to filter as the user types (debounced)
let _searchDebounce = null;
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    if (_searchDebounce) clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(() => {
      // ensure products loaded
      if (!allProducts || allProducts.length === 0) {
        loadProducts().then((products) => {
          allProducts = products;
          applyFiltersAndDisplay();
        });
      } else {
        applyFiltersAndDisplay();
      }
    }, 150);
  });
}

/**
 * Apply category + search filters to `allProducts` and render the grid.
 * If a category is selected, filter within that category. If a search term
 * is present, filter by product name, brand, category or description.
 */
function applyFiltersAndDisplay() {
  const selectedCategory = categoryFilter ? categoryFilter.value : "";
  const rawTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

  let productsToFilter = allProducts || [];

  // If category is selected (non-empty string), filter by category first
  if (selectedCategory) {
    productsToFilter = productsToFilter.filter(
      (p) => (p.category || "").toLowerCase() === selectedCategory.toLowerCase()
    );
  }

  // If there are active keyword bubbles, restrict to the mapped categories
  if (activeKeywords.size > 0) {
    const allowed = new Set();
    activeKeywords.forEach((k) => {
      const mapped = keywordCategoryMap[k];
      if (Array.isArray(mapped))
        mapped.forEach((c) => allowed.add(c.toLowerCase()));
    });
    productsToFilter = productsToFilter.filter((p) => {
      const cat = (p.category || "").toLowerCase();
      return allowed.has(cat);
    });
  }

  // If there's a search term, filter further by name/brand/desc/category
  if (rawTerm) {
    productsToFilter = productsToFilter.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const category = (p.category || "").toLowerCase();
      return (
        name.includes(rawTerm) ||
        brand.includes(rawTerm) ||
        desc.includes(rawTerm) ||
        category.includes(rawTerm)
      );
    });
  }

  // If no category selected and no search term, show placeholder instead
  if (!selectedCategory && !rawTerm) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category to view products
      </div>
    `;
    return;
  }

  displayProducts(productsToFilter);
}

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text) return;

  // Render user's message and add to conversation history
  renderChatMessage("user", text);
  conversationHistory.push({ role: "user", content: text });

  // show assistant loading
  // create assistant bubble with typing indicator and progressively update it
  const { bubbleEl, contentEl, startTyping, stopTyping } =
    createAssistantBubble();
  startTyping();

  // call the worker and progressively render deltas into the content element
  callOpenAIStream(conversationHistory, (delta, full) => {
    contentEl.innerText = (contentEl.innerText || "") + delta;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  })
    .then((assistantContent) => {
      stopTyping();
      if (!assistantContent) {
        contentEl.innerText = "Error: no response from API.";
        return;
      }
      // ensure final full content is present
      contentEl.innerText = assistantContent;
      conversationHistory.push({
        role: "assistant",
        content: assistantContent,
      });
    })
    .catch((err) => {
      stopTyping();
      contentEl.innerText = "Error: failed to get a response.";
      console.error(err);
    });

  input.value = "";
});

/* Utility: render a chat message in the chat window */
function renderChatMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message chat-${role}`;
  wrapper.innerText = text;
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return wrapper;
}

/* Create an assistant bubble that supports progressive updates and a typing indicator.
   Returns: { bubbleEl, contentEl, startTyping(), stopTyping() } */
function createAssistantBubble() {
  const bubble = document.createElement("div");
  bubble.className = "chat-message chat-assistant";

  const content = document.createElement("span");
  content.className = "assistant-content";
  bubble.appendChild(content);

  const typing = document.createElement("span");
  typing.className = "assistant-typing";
  typing.setAttribute("aria-hidden", "true");
  bubble.appendChild(typing);

  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  let typingInterval = null;
  function startTyping() {
    let dots = 0;
    typing.innerText = "";
    if (typingInterval) clearInterval(typingInterval);
    typingInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      typing.innerText = "\u00A0" + ".".repeat(dots);
    }, 400);
  }

  function stopTyping() {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
    typing.innerText = "";
  }

  return {
    bubbleEl: bubble,
    contentEl: content,
    startTyping,
    stopTyping,
  };
}

/* Conversation history for follow-ups (keeps system + user + assistant messages) */
const conversationHistory = [
  {
    role: "system",
    content:
      "You are a helpful beauty advisor. Answer questions about routines, skincare, haircare, makeup, fragrance and related topics. Keep answers relevant to the user's selected products and prior conversation. If the user asks something outside these domains, gently steer them back or provide concise guidance.",
  },
];

/* Generate Routine: collect selected products, send to OpenAI, display routine */
const generateBtn = document.getElementById("generateRoutine");
generateBtn.addEventListener("click", async () => {
  const selectedIds = Array.from(selectedProductIds);
  if (selectedIds.length === 0) {
    renderChatMessage(
      "assistant",
      "Please select at least one product before generating a routine."
    );
    return;
  }

  const payloadProducts = selectedIds.map((id) => {
    const p = allProducts.find((x) => x.id === id);
    return {
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
    };
  });

  try {
    const userMessage = {
      role: "user",
      content: `Here are the selected products (JSON). Generate a personalized routine based only on these items.\n\n${JSON.stringify(
        payloadProducts,
        null,
        2
      )}`,
    };

    conversationHistory.push(userMessage);

    // create assistant bubble with typing indicator and progressively update it
    const { bubbleEl, contentEl, startTyping, stopTyping } =
      createAssistantBubble();
    startTyping();

    const assistantContent = await callOpenAIStream(
      conversationHistory,
      (delta) => {
        contentEl.innerText = (contentEl.innerText || "") + delta;
        chatWindow.scrollTop = chatWindow.scrollHeight;
      }
    );

    stopTyping();

    if (!assistantContent) {
      contentEl.innerText = "Error: empty response from API.";
      return;
    }

    // final content already appended by stream handler, but ensure full is present
    contentEl.innerText = assistantContent;
    conversationHistory.push({ role: "assistant", content: assistantContent });
  } catch (err) {
    console.error(err);
    renderChatMessage(
      "assistant",
      "An error occurred while generating the routine."
    );
  }
});

/**
 * Call OpenAI Chat Completions endpoint with an array of message objects
 * Returns assistant content string (or null on failure)
 */
async function callOpenAI(messages) {
  try {
    // Send request to the Cloudflare Worker which proxies to OpenAI
    const resp = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      renderChatMessage("assistant", `Worker API error: ${resp.status} ${txt}`);
      return null;
    }
    const data = await resp.json();
    // The worker returns the raw OpenAI response JSON; extract assistant content
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      return data.choices[0].message.content;
    }
    // fallback: try other shapes
    if (data && data.output_text) return data.output_text;
    return JSON.stringify(data);
  } catch (err) {
    console.error(err);
    renderChatMessage("assistant", "Network error calling OpenAI API.");
    return null;
  }
}

/**
 * Call OpenAI with streaming enabled and invoke `onDelta` for each chunk of text.
 * Returns the full assembled assistant string when complete, or null on error.
 */
async function callOpenAIStream(messages, onDelta) {
  try {
    // The worker currently returns a JSON OpenAI response (no SSE). Do a non-stream call.
    const resp = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      renderChatMessage("assistant", `Worker API error: ${resp.status} ${txt}`);
      return null;
    }
    const data = await resp.json();
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      const text = data.choices[0].message.content;

      // Progressive reveal: emit small character chunks at a steady pace
      if (typeof onDelta === "function") {
        const total = text.length;
        // tuning: small chunk size and moderate delay for a smooth, readable pace
        // slightly faster: larger chunk, shorter delay for snappier output
        const chunkSize = 5; // characters per chunk
        const baseDelay = 35; // ms between chunks

        let i = 0;
        while (i < total) {
          const next = text.slice(i, i + chunkSize);
          i += chunkSize;
          try {
            onDelta(next, text.slice(0, i));
          } catch (err) {
            // ignore callback errors to avoid breaking the reveal loop
            console.debug("onDelta callback error", err);
          }
          // small jitter so the pace feels natural (±7.5%)
          const jitter = Math.floor((Math.random() - 0.5) * baseDelay * 0.15);
          await new Promise((res) => setTimeout(res, baseDelay + jitter));
        }
      }

      return text;
    }
    if (data && data.output_text) return data.output_text;
    return JSON.stringify(data);
  } catch (err) {
    console.error(err);
    renderChatMessage(
      "assistant",
      "Network error calling OpenAI API (stream)."
    );
    return null;
  }
}
