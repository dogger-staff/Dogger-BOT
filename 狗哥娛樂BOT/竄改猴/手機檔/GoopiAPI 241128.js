// ==UserScript==
// @name         GoopiAPI手機版
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  自動加入購物車功能
// @author       Your name
// @match        https://www.goopi.co/*
// @grant        GM_xmlhttpRequest
// @grant        GM_cookie
// @connect      www.goopi.co
// @run-at       document-end
// ==/UserScript==

class GoopiCart {
    constructor() {
        this.baseUrl = "https://www.goopi.co";
        this.cookies = null;
        this.initCookies();
        this.productCache = new Map(); // 新增商品快取
    }

    // 初始化並保存當前網站的cookies
    async initCookies() {
        try {
            const cookies = await new Promise((resolve) => {
                GM_cookie.list({ domain: "www.goopi.co" }, (cookies) => {
                    resolve(cookies);
                });
            });

            // 將cookies轉換為適合保存的格式
            const cookiesForSave = cookies.map((cookie) => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
            }));

            // 保存cookies
            localStorage.setItem("goopi_cookies", JSON.stringify(cookiesForSave));
            this.cookies = cookiesForSave;
            console.log("已保存cookies:", cookiesForSave);
        } catch (error) {
            console.error("保存cookies時發生錯誤:", error);
        }
    }

    // 獲取CSRF令牌
    getCsrfToken() {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute("content") : null;
    }

    // 根據商品連結獲取資訊
    async getProductInfo(productLink, productName) {
        try {
            // 檢查快取
            if (this.productCache.has(productLink)) {
                return this.productCache.get(productLink);
            }

            const cacheKey = `product_info_${productLink}`;
            const cachedInfo = localStorage.getItem(cacheKey);

            if (cachedInfo) {
                const parsedCache = JSON.parse(cachedInfo);
                const cacheTime = new Date(parsedCache.timestamp);
                const now = new Date();

                // 檢查快取是否在5分鐘內
                if (now - cacheTime < 5 * 60 * 1000) {
                    this.productCache.set(productLink, parsedCache.data);
                    return parsedCache.data;
                }
            }

            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: productLink,
                    headers: {
                        Cookie: this.cookies
                            ? this.cookies.map((c) => `${c.name}=${c.value}`).join("; ")
                            : "",
                    },
                    onload: resolve,
                    onerror: reject,
                });
            });

            if (response.status !== 200) {
                throw new Error(`獲取商品資訊失敗: HTTP ${response.status}`);
            }

            const html = response.responseText;
            const match = html.match(
                /app\.value\('product', JSON\.parse\('(.+?)'\)\);/
            );
            if (!match) {
                console.error("無法在HTML中找到商品資訊");
                return null;
            }

            const productInfoJson = match[1]
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, "\\");
            const productInfo = JSON.parse(productInfoJson);

            // 解析尺寸選項
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const sizeOptions = [];
            doc
                .querySelectorAll('select[name="fields[0]"] option')
                .forEach((option) => {
                    if (option.value) {
                        sizeOptions.push({
                            尺寸: option.textContent.trim(),
                            值: option.value,
                        });
                    }
                });

            // 解析變體選項
            let variationOptions = null;
            if (productInfo.variations) {
                variationOptions = [];
                productInfo.尺寸變體 = [];

                for (const variation of productInfo.variations) {
                    try {
                        const fieldsTrans = variation.fields_translations?.["zh-hant"]?.[0];
                        if (fieldsTrans) {
                            const variationData = {
                                尺寸: fieldsTrans,
                                變體id: variation.key,
                                庫存: variation.quantity || 0,
                                gtin: variation.gtin,
                            };
                            variationOptions.push(variationData);

                            productInfo.尺寸變體.push({
                                ...variationData,
                                價格: variation.price?.label || productInfo.price.label,
                            });
                        }
                    } catch (e) {
                        console.warn("解析變體選項時出錯:", e);
                        continue;
                    }
                }
            } else {
                productInfo.尺寸變體 = [];
            }

            // 獲取商品圖片

            const result = {
                商品基本信息: productInfo,
                變體選項: variationOptions,
                標題: productInfo.title_translations["zh-hant"],
                價格: productInfo.price.label,
                總庫存: productInfo.quantity,
                id: productInfo._id,
            };

            // 儲存到快取
            localStorage.setItem(
                cacheKey,
                JSON.stringify({
                    timestamp: new Date().toISOString(),
                    data: result,
                })
            );

            // 儲存到記憶體快取
            this.productCache.set(productLink, result);

            return result;
        } catch (error) {
            console.error("獲取商品資訊失敗:", error);
            return null;
        }
    }

    // 搜尋商品
    async searchProducts(keyword) {
        const urls = ["https://www.goopi.co/categories/goopimade-goopi-孤僻"];

        const products = [];
        const keywords = keyword.toLowerCase().trim().split(/\s+/);

        try {
            // 使用 Promise.all 並行請求
            const responses = await Promise.all(
                urls.map(
                    (url) =>
                        new Promise((resolve, reject) => {
                            GM_xmlhttpRequest({
                                method: "GET",
                                url: url,
                                headers: {
                                    Cookie: this.cookies
                                        ? this.cookies.map((c) => `${c.name}=${c.value}`).join("; ")
                                        : "",
                                },
                                onload: resolve,
                                onerror: reject,
                            });
                        })
                )
            );

            for (const response of responses) {
                const html = response.responseText;
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");

                const items = doc.querySelectorAll(".productList__product");
                items.forEach((item) => {
                    try {
                        const titleElement = item.querySelector(".title");
                        const priceElement = item.querySelector(".quick-cart-price");
                        const linkElement = item.querySelector(".quick-cart-item");

                        if (!titleElement || !priceElement || !linkElement) {
                            console.warn("商品元素缺失");
                            return;
                        }

                        const title = titleElement.textContent.trim();
                        const price = priceElement.textContent.trim();
                        const link = linkElement.href;
                        const titleLower = title.toLowerCase();
                        // 計算關鍵字匹配數並檢查是否所有關鍵字都匹配
                        const matchedKeywords = keywords.filter((kw) =>
                            titleLower.includes(kw)
                        );
                        const matchCount = matchedKeywords.length;
                        const allKeywordsMatch = matchCount === keywords.length;

                        // 只有當至少匹配一個關鍵字時才加入結果
                        if (matchCount > 0) {
                            products.push({
                                title,
                                price,
                                link,
                                id: link.split("/").pop(),
                                matchCount,
                                allKeywordsMatch, // 新增標記表示是否完全匹配
                            });
                        }
                    } catch (err) {
                        console.warn("解析商品資訊時出錯:", err);
                    }
                });
            }
            // 排序邏輯：完全匹配優先，其次是匹配數量
            return products.sort((a, b) => {
                if (a.allKeywordsMatch !== b.allKeywordsMatch) {
                    return b.allKeywordsMatch ? 1 : -1;
                }
                return b.matchCount - a.matchCount;
            });
        } catch (error) {
            console.error("搜尋商品時發生錯誤:", error);
            return [];
        }
    }
    async checkStock(size, productId, variationId) {
        try {
            let url = `${this.baseUrl}/api/merchants/597d718359d52417b70007f8/products/${productId}/check_stock`;
            if (size !== "F") {
                url += `?variation_id=${variationId}`;
            }

            const csrfToken = this.getCsrfToken();
            if (!csrfToken) {
                throw new Error("無法獲取CSRF令牌");
            }

            const headers = {
                accept: "application/json, text/plain, */*",
                "accept-encoding": "gzip, deflate, br, zstd",
                "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                referer: `${this.baseUrl}/products/${productId}`,
                "sec-ch-ua":
                    '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"macOS"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
                "x-csrf-token": csrfToken,
                Cookie: this.cookies
                    ? this.cookies.map((c) => `${c.name}=${c.value}`).join("; ")
                    : "",
            };

            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    headers: headers,
                    onload: resolve,
                    onerror: reject,
                });
            });

            if (response.status !== 200) {
                throw new Error(`檢查庫存失敗: HTTP ${response.status}`);
            }
            const data = JSON.parse(response.responseText);

            return {
                庫存數據: data,
                可用庫存: data.quantity || 0,
                購物車數量: data.cart_quantity || 0,
                剩餘庫存: data.left_items_quantity || 0,
            };
        } catch (error) {
            console.error("檢查庫存失敗:", error);
            return null;
        }
    }
    // 添加商品到購物車
    async addToCart(productId, variationId, quantity = 1) {
        try {
            const url = `${this.baseUrl}/api/merchants/597d718359d52417b70007f8/cart/items`;
            const csrfToken = this.getCsrfToken();

            if (!csrfToken) {
                return { result: false, data: null };
            }

            const headers = {
                "Content-Type": "application/json",
                "x-csrf-token": csrfToken,
                accept: "application/json, text/plain, */*",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                referer: `${this.baseUrl}/products/${productId}`,
                Cookie: this.cookies
                    ? this.cookies.map((c) => `${c.name}=${c.value}`).join("; ")
                    : "",
            };

            const data = {
                item: {
                    product_id: productId,
                    quantity: quantity,
                    type: "product",
                },
                cart_options: {
                    skip_calculate_order: true,
                    is_cart_page: false,
                },
            };

            if (variationId) {
                data.item.variation_id = variationId;
            }

            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: url,
                    headers: headers,
                    data: JSON.stringify(data),
                    onload: resolve,
                    onerror: reject,
                });
            });

            if (response.status !== 200) {
                throw new Error("添加到購物車失敗");
            }

            return JSON.parse(response.responseText);
        } catch (error) {
            console.error("添加商品到購物車失敗:", error);
            return { result: false, data: null };
        }
    }
    // 驗證購物車
    async validateCart() {
        try {
            const url = `${this.baseUrl}/api/merchants/597d718359d52417b70007f8/cart/validate`;
            const csrfToken = this.getCsrfToken();

            if (!csrfToken) {
                throw new Error("無法獲取CSRF令牌");
            }
            const headers = {
                accept: "application/json, text/plain, */*",
                "accept-encoding": "gzip, deflate, br, zstd",
                "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                referer: `${this.baseUrl}/cart`,
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-csrf-token": csrfToken,
                Cookie: this.cookies
                    ? this.cookies.map((c) => `${c.name}=${c.value}`).join("; ")
                    : "",
            };

            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    headers: headers,
                    onload: resolve,
                    onerror: reject,
                });
            });

            if (response.status === 200) {
                return `驗證成功 (狀態碼: ${response.status})`;
            } else if (response.status === 422) {
                const errorData = JSON.parse(response.responseText);
                return {
                    狀態碼: response.status,
                    錯誤信息: errorData.message || "",
                    錯誤詳情:
                        errorData.data?.map((item) => ({
                            變體ID: item.variation_id || "",
                            錯誤代碼: item.code || "",
                        })) || [],
                };
            } else {
                return `狀態碼: ${response.status}, 內容: ${response.responseText}`;
            }
        } catch (error) {
            console.error("驗證購物車失敗:", error);
            return "請求失敗";
        }
    }

    async autoCheckProduct(searchConfig) {
        const { keyword, size, quantity, interval = 800 } = searchConfig;

        console.log(`開始監控商品: ${keyword}, 尺寸: ${size}, 數量: ${quantity}`);

        try {
            // 使用相同的搜尋邏輯
            const products = await this.searchProducts(keyword);
            if (products && products.length > 0) {
                const matchedProduct = products[0];
                if (matchedProduct) {
                    return {
                        success: true,
                        product: matchedProduct,
                        message: `找到商品: ${matchedProduct.title}`,
                    };
                }
            }

            return {
                success: false,
                message: `未找到商品: ${keyword}`,
            };
        } catch (error) {
            console.error("檢查商品時發生錯誤:", error);
            return {
                success: false,
                message: `檢查失敗: ${error.message}`,
            };
        }
    }
}
// 創建GUI介面
(function () {
    "use strict";
    const styles = `
          .goopi-helper {
            position: fixed;
            top: 10px;
            right: 10px;
            background: white;
            padding: 10px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 9999;
            width: 300px;
            font-family: Arial, sans-serif;
            touch-action: none;
            user-select: none;
            transform: translate3d(0,0,0);
            font-size: 14px;
          }

          .goopi-helper input,
          .goopi-helper select,
          .goopi-helper button {
            width: 100%;
            margin: 3px 0;
            padding: 3px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 12px;
          }

          .goopi-helper button {
            background: #FF7B1A;
            color: white;
            border: none;
            padding: 5px;
            cursor: pointer;
            transition: background 0.3s;
          }

          .goopi-helper button:hover {
            background: #e66c0f;
          }

          .goopi-helper button:active {
            transform: scale(0.95);
          }

          .goopi-helper input:focus,
          .goopi-helper select:focus {
            outline: 1px solid #FF7B1A;
            box-shadow: 0 0 3px rgba(255,123,26,0.3);
          }

          .tab-buttons {
            display: flex;
            margin-bottom: 10px;
            gap: 8px;
            padding: 3px;
            background: #f5f5f5;
            border-radius: 3px;
          }

          .tab-button {
            flex: 1;
            padding: 5px;
            background: #f0f0f0;
            border: none;
            cursor: pointer;
            border-radius: 2px;
            transition: all 0.3s;
          }

          .tab-button.active {
            background: #FF7B1A;
            color: white;
            transform: scale(1.05);
          }

          .tab-content {
            display: none;
          }

          .tab-content.active {
            display: block;
          }

          .checkout-info {
            margin-top: 5px;
            padding: 8px;
            background: #f9f9f9;
            border-radius: 4px;
            border: 1px solid #eee;
          }

          .batch-search-item {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            margin-bottom: 10px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
          }

          .batch-search-item input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
          }

          .batch-search-item .controls {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 8px;
            align-items: center;
          }

          .remove-item {
            width: 30px !important;
            height: 30px !important;
          }

          .batch-actions {
            display: flex;
            gap: 5px;
            margin-top: 5px;
          }

          .batch-actions button {
            flex: 1;
          }

          h4 {
            color: #FF7B1A;
            margin: 8px 0 5px;
            border-bottom: 1px solid #FF7B1A;
            padding-bottom: 3px;
            font-size: 12px;
          }

          .toast-container {
            position: fixed;
            bottom: 10px;
            right: 10px;
            display: flex;
            flex-direction: column-reverse;
            gap: 5px;
            width: fit-content;
            z-index: 10000;
          }
          .toast {
            position: relative;
            bottom: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 8px 16px;
            border-radius: 3px;
            min-width: 90px;
            width: fit-content;
            max-width: 80%;
            word-wrap: break-word;
            line-height: 1.2;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            font-size: 12px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease-in-out;
          }

          .toast.show {
            opacity: 1;
            transform: translateX(0);
          }
          .toast.multiline {
            white-space: pre-line;
            text-align: left;
            min-width: 125px;
          }
          .goopi-title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            color: #FF7B1A;
            margin-bottom: 8px;
            padding: 8px 0;
            border-bottom: 1px solid #FF7B1A;
            cursor: move;
          }

          .order-count {
            position: absolute;
            top: 5px;
            right: 5px;
            background: #FF7B1A;
            color: white;
            padding: 1px 3px;
            border-radius: 5px;
            font-size: 10px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #FF7B1A;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
          }

          @media (max-width: 768px) {
            .goopi-helper {
              width: 90%;
              max-width: 300px;
              right: 5%;
              left: 5%;
              margin: auto;
            }
          }
          .size-options {
            background: white;
            border: 1px solid #ddd;
            border-radius: 3px;
          }
          .batch-search-item .controls input[type="text"].size {
            width: 80px;
          }
          .batch-search-item .controls {
            display: grid;
            grid-template-columns: 80px 80px auto;
            gap: 5px;
            align-items: center;
          }
        `;

    // 添加樣式
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // 創建container元素
    const container = document.createElement("div");
    container.className = "goopi-helper";
    container.innerHTML = `
          <div class="goopi-title">GOOPiMADE</div>
          <datalist id="size-options">
            <option value="F">F</option>
            <option value="0號">0號</option>
            <option value="1號">1號</option>
            <option value="2號">2號</option>
            <option value="3號">3號</option>
            <option value="4號">4號</option>
          </datalist>
          <div class="tab-buttons">
            <button class="tab-button active" data-tab="batch">訂單</button>
            <button class="tab-button" data-tab="search">搜尋</button>
            <button class="tab-button" data-tab="checkout">資訊</button>
          </div>

          <div class="tab-content active" id="batch-tab">
            <div id="batchSearchItems">
              <div class="batch-search-item">
                <input type="text" class="keyword" placeholder="商品關鍵字">
                <div class="controls">
                  <input type="text" class="size" placeholder="尺寸" value="1號" list="size-options">
                  <input type="number" class="quantity" value="1" min="1" max="100">
                  <button class="remove-item">×</button>
                </div>
              </div>
            </div>
            <div class="batch-actions">
              <button id="addSearchItem">新增商品</button>
              <button id="startBatchSearch">執行購買</button>
            </div>
          </div>

          <div class="tab-content" id="search-tab">
            <input type="text" id="searchInput" placeholder="輸入關鍵字搜尋商品 (可用空格分隔多個關鍵字)">
            <div class="result-list" id="resultList"></div>
          </div>

          <div class="tab-content" id="checkout-tab">
            <div class="checkout-info">
              <h4>7-11門市資訊</h4>
              <input type="text" id="storeId" placeholder="7-11店號">
              <input type="text" id="storeName" placeholder="門市名稱">
              <input type="text" id="storeAddress" placeholder="門市地址">

              <h4>個人資訊</h4>
              <input type="text" id="customerName" placeholder="姓名">
              <input type="tel" id="customerPhone" placeholder="電話">
              <input type="text" id="carrierNumber" placeholder="載具號碼">

              <button id="goToCheckout">前往結帳</button>
            </div>
          </div>
        `;

    // 將container添加到body
    document.body.appendChild(container);

    // 創建 toast container
    const toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);

    // 優化 Toast 顯示功能
    function showToast(message, duration = 3000) {
        const toast = document.createElement("div");
        toast.className = "toast";

        // 檢查是否包含換行符號
        if (message.includes("\n")) {
            toast.classList.add("multiline");
        }
        // 支援多行訊息
        const formattedMessage = message.replace(/\n/g, "<br>");
        toast.innerHTML = formattedMessage;

        toastContainer.appendChild(toast);

        // 強制重繪
        void toast.offsetWidth;

        // 顯示新訊息
        toast.classList.add("show");

        // 設定自動移除
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => {
                toast.remove();
            }, 300); // 等待淡出動畫完成後移除元素
        }, duration);
    }
    // 更新訂單數量
    function updateOrderCount() {
        const items = document.querySelectorAll(".batch-search-item");
        const count = items.length;
        localStorage.setItem("goopi_order_count", count);
        showToast(`目前有 ${count} 個商品訂單`);
    }

    // 拖曳功能
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    container.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    function dragStart(e) {
        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }

        // 檢查是否點擊容器或標題
        const target = e.target;
        if (target === container || target.classList.contains("goopi-title")) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            setTranslate(currentX, currentY, container);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    const cart = new GoopiCart();

    // 標籤切換功能
    const tabButtons = container.querySelectorAll(".tab-button");
    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            tabButtons.forEach((btn) => btn.classList.remove("active"));
            container
                .querySelectorAll(".tab-content")
                .forEach((content) => content.classList.remove("active"));

            button.classList.add("active");
            const tabId = button.getAttribute("data-tab");
            document.getElementById(`${tabId}-tab`).classList.add("active");

            // 儲存當前分頁
            localStorage.setItem("goopi_current_tab", tabId);
            showToast(`切換到${button.textContent}分頁`);
        });
    });

    // 批量搜尋功能
    const batchSearchItems = document.getElementById("batchSearchItems");
    const addSearchItemBtn = document.getElementById("addSearchItem");
    const startBatchSearchBtn = document.getElementById("startBatchSearch");

    function createSearchItem(savedData = null) {
        const item = document.createElement("div");
        item.className = "batch-search-item";
        const itemId = savedData?.itemId || Date.now();
        item.dataset.itemId = itemId;

        item.innerHTML = `
          <input type="text" class="keyword" placeholder="商品關鍵字">
          <div class="controls">
            <input type="text" class="size" placeholder="尺寸" value="1號" list="size-options">
            <input type="number" class="quantity" value="1" min="1" max="100">
            <button class="remove-item">×</button>
          </div>
        `;

        // 如果有保存的數據，則填充
        if (savedData) {
            item.querySelector(".keyword").value = savedData.keyword || "";
            item.querySelector(".size").value = savedData.size || "1號";
            item.querySelector(".quantity").value = savedData.quantity || 1;
        }

        // 保存數據到 localStorage
        function saveItemData() {
            const itemData = {
                itemId,
                keyword: item.querySelector(".keyword").value,
                size: item.querySelector(".size").value,
                quantity: item.querySelector(".quantity").value,
            };
            const allItems = JSON.parse(localStorage.getItem("batch_items") || "[]");
            const existingIndex = allItems.findIndex((i) => i.itemId === itemId);

            if (existingIndex >= 0) {
                allItems[existingIndex] = itemData;
            } else {
                allItems.push(itemData);
            }

            localStorage.setItem("batch_items", JSON.stringify(allItems));
            updateOrderCount();
        }

        // 監聽所有輸入變化
        item.querySelectorAll("input, select").forEach((input) => {
            ["change", "input"].forEach((eventType) => {
                input.addEventListener(eventType, saveItemData);
            });
        });

        // 刪除按鈕事件
        item.querySelector(".remove-item").addEventListener("click", () => {
            if (batchSearchItems.children.length > 1) {
                // 從 localStorage 中刪除該項目
                const allItems = JSON.parse(
                    localStorage.getItem("batch_items") || "[]"
                );
                const updatedItems = allItems.filter((i) => i.itemId !== itemId);
                localStorage.setItem("batch_items", JSON.stringify(updatedItems));

                // 刪除相關的其他 localStorage 數據
                localStorage.removeItem(`goopi_item_${itemId}`);

                // 從 DOM 中移除元素
                item.remove();
                updateOrderCount();

                // 顯示提示
                showToast("已刪除訂單項目");
            } else {
                showToast("至少需要保留一個訂單項目");
            }
        });

        return item;
    }

    // 載入保存的訂單項目
    function loadSavedItems() {
        const savedItems = JSON.parse(localStorage.getItem("batch_items") || "[]");

        // 清空現有項目
        batchSearchItems.innerHTML = "";

        if (savedItems.length === 0) {
            // 如果沒有保存的項目，創建一個空白項目
            batchSearchItems.appendChild(createSearchItem());
        } else {
            // 載入所有保存的項目
            savedItems.forEach((itemData) => {
                batchSearchItems.appendChild(createSearchItem(itemData));
            });
        }

        updateOrderCount();
    }

    // 修改新增按鈕事件
    addSearchItemBtn.addEventListener("click", () => {
        const newItem = createSearchItem();
        batchSearchItems.appendChild(newItem);
        updateOrderCount();
    });


    let isMonitoring = false;
    let monitoringInterval;

    // 新增停止按鈕
    const stopButton = document.createElement("button");
    stopButton.textContent = "停止監控";
    stopButton.style.display = "none";
    stopButton.style.backgroundColor = "#ff4444";
    document.querySelector(".batch-actions").appendChild(stopButton);

    async function startMonitoring(items) {
        isMonitoring = true;
        startBatchSearchBtn.disabled = true;
        stopButton.style.display = "block";

        let attemptCount = 0;
        const maxAttempts = 1000;

        const checkProducts = async () => {
            attemptCount++;
            startBatchSearchBtn.textContent = `監控中 (${attemptCount})`;

            try {
                // 使用 Promise.all 並行檢查所有商品
                const results = await Promise.all(
                    items.map(async (item) => {
                        try {
                            const result = await cart.autoCheckProduct(item);
                            if (result.success) {
                                const productInfo = await cart.getProductInfo(
                                    result.product.link
                                );
                                if (!productInfo) {
                                    return {
                                        success: false,
                                        item,
                                        message: "無法獲取商品資訊",
                                    };
                                }

                                let variationId = null;
                                if (item.size !== "F") {
                                    const variation = productInfo.變體選項?.find(
                                        (v) => v.尺寸 === item.size
                                    );
                                    if (!variation) {
                                        return {
                                            success: false,
                                            item,
                                            message: `商品 ${productInfo.標題} 無 ${item.size} 尺寸`,
                                        };
                                    }
                                    variationId = variation.變體id;
                                }

                                const stock = await cart.checkStock(
                                    item.size,
                                    productInfo.id,
                                    variationId
                                );
                                if (!stock || stock.剩餘庫存 < item.quantity) {
                                    return {
                                        success: false,
                                        item,
                                        message: `商品 ${productInfo.標題} ${item.size} 庫存不足`,
                                    };
                                }

                                const cartResult = await cart.addToCart(
                                    productInfo.id,
                                    variationId,
                                    item.quantity
                                );
                                if (cartResult.result) {
                                    return {
                                        success: true,
                                        item,
                                        message: `成功加入 ${productInfo.標題} ${item.size} 到購物車`,
                                    };
                                }

                                return {
                                    success: false,
                                    item,
                                    message: `加入購物車失敗: ${productInfo.標題}`,
                                };
                            }
                            return {
                                success: false,
                                item,
                                message: `未找到商品: ${item.keyword}`,
                            };
                        } catch (error) {
                            return {
                                success: false,
                                item,
                                message: `處理錯誤: ${error.message}`,
                            };
                        }
                    })
                );

                // 顯示所有結果
                const resultMessage = results.map((r) => r.message).join("\n");
                showToast(resultMessage);

                // 檢查是否達到最大嘗試次數
                if (attemptCount >= maxAttempts) {
                    stopMonitoring();
                    showToast("已達最大監控次數，請手動停止後重試");
                    return;
                }

                // 處理成功的結果
                const successResults = results.filter((r) => r.success);
                if (successResults.length > 0) {
                    stopMonitoring();
                    setTimeout(() => {
                        checkoutButton.click();
                    }, 100);
                } else if (isMonitoring) {
                    monitoringInterval = setTimeout(checkProducts, 300);
                }
            } catch (error) {
                console.error("監控過程發生錯誤:", error);
                showToast(`監控錯誤: ${error.message}`);

                if (isMonitoring) {
                    monitoringInterval = setTimeout(checkProducts, 300);
                }
            }
        };

        // 開始第一次檢查
        checkProducts();
    }

    function stopMonitoring() {
        isMonitoring = false;
        clearTimeout(monitoringInterval);
        startBatchSearchBtn.disabled = false;
        startBatchSearchBtn.textContent = "執行購買";
        stopButton.style.display = "none";
    }

    // 停止按鈕點擊事件
    stopButton.addEventListener("click", () => {
        stopMonitoring();
        showToast("已停止商品監控");
    });

    // 修改開始按鈕點擊事件
    startBatchSearchBtn.addEventListener("click", async () => {
        if (isMonitoring) return;

        const items = Array.from(batchSearchItems.children).map((item) => ({
            keyword: item.querySelector(".keyword").value.trim(),
            size: item.querySelector(".size").value,
            quantity: parseInt(item.querySelector(".quantity").value),
            interval: 800, // 可以根據需求調整間隔
        }));

        if (items.some((item) => !item.keyword)) {
            showToast("請填寫所有商品的關鍵字");
            return;
        }

        startMonitoring(items);
    });

    async function fillCheckoutForm() {
        // 新增等待元素函數
        function waitForElement(selector, timeout = 5000) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();

                const checkElement = () => {
                    const element = document.querySelector(selector);
                    if (element) {
                        resolve(element);
                        return;
                    }

                    if (Date.now() - startTime > timeout) {
                        reject(new Error(`等待元素 ${selector} 超時`));
                        return;
                    }

                    setTimeout(checkElement, 100);
                };

                checkElement();
            });
        }

        try {
            const savedInfo = JSON.parse(
                localStorage.getItem("goopi_checkout_info") || "{}"
            );


            // 等待主要表單元素載入
            await waitForElement(
                'input[name="order[delivery_data][recipient_name]"]'
            );

            // 使用 setTimeout 確保表單完全載入
            setTimeout(() => {
                fillForm("order[delivery_data][recipient_name]", savedInfo.customerName);
                fillForm("order[customer_name]", savedInfo.customerName);

                fillForm("order[delivery_data][recipient_phone]", savedInfo.customerPhone);
                fillForm("order[delivery_data][recipient_phone]", savedInfo.customerPhone);
                fillForm("order[customer_phone]", savedInfo.customerPhone);
                fillForm("order[delivery_data][store_address]", savedInfo.storeAddress);

                const carrierTypeSelect = document.querySelector("#carrier-type");
                if (carrierTypeSelect) {
                    carrierTypeSelect.value = "1";
                    carrierTypeSelect.dispatchEvent(
                        new Event("change", { bubbles: true })
                    );
                }

                // 等待載具輸入欄位出現後填寫
                waitForElement("#invoice-mobile-barcode").then(() => {
                    fillForm("order[invoice][carrier_number]", savedInfo.carrierNumber);

                    // 勾選同意條款
                    const policyCheckbox = document.querySelector('input[name="policy"]');
                    if (policyCheckbox && !policyCheckbox.checked) {
                        policyCheckbox.click();
                        policyCheckbox.dispatchEvent(
                            new Event("change", { bubbles: true })
                        );
                    }
                    window.scrollTo({
                        top: document.documentElement.scrollHeight,
                        behavior: "auto",
                    });
                });
            }, 300);
        } catch (error) {
            console.error("自動填寫表單失敗:", error);
        }
    }
    function fillForm(fieldName, value) {
        if (!value) return;

        const field = document.querySelector(
            `input[name="${fieldName}"], textarea[name="${fieldName}"]`
        );

        if (field) {
            field.value = value;
            // 觸發多個事件以確保值被正確設置
            ["input", "change", "blur"].forEach((eventType) => {
                field.dispatchEvent(new Event(eventType, { bubbles: true }));
            });
        }
    }
    let searchTimeout;
    const searchInput = document.getElementById("searchInput");
    const resultList = document.getElementById("resultList");
    const checkoutButton = document.getElementById("goToCheckout");
    // 前往結帳按鈕點擊事件
    checkoutButton.addEventListener("click", () => {
        const checkoutInfo = {
            storeId: document.getElementById("storeId").value,
            storeAddress: document.getElementById("storeAddress").value,
            storeName: document.getElementById("storeName").value,
            customerName: document.getElementById("customerName").value,
            customerPhone: document.getElementById("customerPhone").value,
            carrierNumber: document.getElementById("carrierNumber").value,
        };

        localStorage.setItem("goopi_checkout_info", JSON.stringify(checkoutInfo));

        if (
            !checkoutInfo.storeId ||
            !checkoutInfo.storeAddress ||
            !checkoutInfo.storeName ||
            !checkoutInfo.customerName ||
            !checkoutInfo.customerPhone
        ) {
            showToast("請填寫完整的必要資訊");
            return;
        }

        const baseUrl = "https://www.goopi.co/callback";
        const params = new URLSearchParams({
            storeid: checkoutInfo.storeId,
            storename: checkoutInfo.storeName,
            storeaddress: checkoutInfo.storeAddress,
            outside: "0",
            ship: "1111111",
            TempVar: "",
            isSameTab: "true",
        });

        window.location.href = `${baseUrl}?${params.toString()}`;
    });
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const keyword = searchInput.value.trim();
            if (keyword) {
                resultList.innerHTML = "搜尋中...";
                try {
                    const products = await cart.searchProducts(keyword);
                    resultList.innerHTML = "";

                    products.forEach((product) => {
                        const item = document.createElement("div");
                        item.className = "result-item";

                        const sizeInput = document.createElement("input");
                        sizeInput.type = "text";
                        sizeInput.value = "1號";
                        sizeInput.placeholder = "輸入尺寸";
                        sizeInput.setAttribute("list", "size-options");
                        sizeInput.className = "size-input";

                        const quantityInput = document.createElement("input");
                        quantityInput.type = "number";
                        quantityInput.min = "1";
                        quantityInput.max = "100";
                        quantityInput.value = "1";

                        const stockInfo = document.createElement("div");
                        stockInfo.className = "stock-info";

                        item.innerHTML = `
                    <div>${product.title}</div>
                    <div>${product.price}</div>
                    <div>尺寸: </div>
                    <div>數量: </div>
                    <div>庫存： </div>
                    <div class="stock-info">庫存載入中...</div>
                    <button onclick="window.location.href='${product.link}'">查看商品</button>
                    <button class="add-to-cart">加入購物車</button>
                  `;
                        const sizeDiv = item.querySelector("div:nth-child(3)");
                        const quantityDiv = item.querySelector("div:nth-child(4)");
                        sizeDiv.appendChild(sizeInput);
                        quantityDiv.appendChild(quantityInput);

                        // 獲取並顯示所有尺寸的庫存
                        const updateStockInfo = async () => {
                            try {
                                const productInfo = await cart.getProductInfo(
                                    product.link,
                                    product.title
                                );
                                if (!productInfo) {
                                    item.querySelector(".stock-info").innerHTML =
                                        "無法獲取庫存資訊";
                                    return;
                                }

                                let stockText = "";
                                // 檢查 F 碼庫存
                                const fStock = await cart.checkStock("F", productInfo.id, null);
                                if (fStock && fStock.剩餘庫存 > 0) {
                                    stockText += `F: ${fStock.剩餘庫存}<br>`;
                                }

                                // 檢查其他尺寸庫存
                                for (const size of ["0號", "1號", "2號", "3號", "4號"]) {
                                    const variation = productInfo.變體選項.find(
                                        (v) => v.尺寸 === size
                                    );
                                    if (variation) {
                                        const stock = await cart.checkStock(
                                            size,
                                            productInfo.id,
                                            variation.變體id
                                        );
                                        if (stock && stock.剩餘庫存 > 0) {
                                            stockText += `${size}: ${stock.剩餘庫存}<br>`;
                                        }
                                    }
                                }

                                item.querySelector(".stock-info").innerHTML =
                                    stockText || "目前無庫存";
                            } catch (error) {
                                item.querySelector(".stock-info").innerHTML = "庫存查詢失敗";
                                console.error("庫存查詢錯誤:", error);
                            }
                        };

                        updateStockInfo();

                        const addButton = item.querySelector(".add-to-cart");
                        addButton.addEventListener("click", async () => {
                            try {
                                const selectedSize = sizeInput.value.trim();
                                const quantity = parseInt(quantityInput.value);

                                if (quantity < 1 || quantity > 100) {
                                    showToast("請輸入1-100之間的數量");
                                    return;
                                }

                                const productInfo = await cart.getProductInfo(
                                    product.link,
                                    product.title
                                );
                                if (!productInfo) {
                                    showToast("無法獲取商品資訊");
                                    return;
                                }

                                let variationId = null;
                                if (selectedSize !== "F") {
                                    const variation = productInfo.變體選項.find(
                                        (v) => v.尺寸 === selectedSize
                                    );
                                    if (variation) {
                                        variationId = variation.變體id;
                                    } else {
                                        showToast("無效的尺寸選擇");
                                        return;
                                    }
                                }

                                const stock = await cart.checkStock(
                                    selectedSize,
                                    productInfo.id,
                                    variationId
                                );
                                if (!stock) {
                                    showToast("無法檢查庫存");
                                    return;
                                }

                                if (stock.剩餘庫存 < quantity) {
                                    showToast(`商品庫存不足\n當前庫存：${stock.剩餘庫存}`);
                                    return;
                                }

                                const result = await cart.addToCart(
                                    productInfo.id,
                                    variationId,
                                    quantity
                                );
                                if (result.result) {
                                    showToast(
                                        `成功加入購物車！\n商品：${product.title}\n尺寸：${selectedSize}\n數量：${quantity}\n庫存：${stock.剩餘庫存}`
                                    );
                                    await cart.validateCart();
                                    // 更新庫存顯示
                                    updateStockInfo();
                                } else {
                                    showToast("加入購物車失敗");
                                }
                            } catch (error) {
                                console.error("錯誤:", error);
                                showToast("操作失敗: " + error.message);
                            }
                        });

                        resultList.appendChild(item);
                    });

                    if (products.length === 0) {
                        resultList.innerHTML = "未找到相關商品";
                    }
                } catch (error) {
                    console.error("搜尋錯誤:", error);
                    resultList.innerHTML = "搜尋失敗";
                }
            } else {
                resultList.innerHTML = "";
            }
        }, 500);
    });
    function initDragAndTouch() {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        function dragStart(e) {
            if (e.type === "touchstart") {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }

            // 檢查是否點擊容器或標題
            const target = e.target;
            if (target === container || target.classList.contains("goopi-title")) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();

                if (e.type === "touchmove") {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(xOffset, yOffset);
            }
        }

        function setTranslate(xPos, yPos) {
            container.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }

        function dragEnd() {
            isDragging = false;
        }

        // 添加觸控事件監聽
        container.addEventListener("touchstart", dragStart, { passive: false });
        container.addEventListener("touchend", dragEnd, { passive: false });
        container.addEventListener("touchmove", drag, { passive: false });

        // 保留滑鼠事件監聽
        container.addEventListener("mousedown", dragStart);
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", dragEnd);
    }
    function loadSavedData() {
        const inputs = {
            storeId: document.getElementById("storeId"),
            storeAddress: document.getElementById("storeAddress"),
            storeName: document.getElementById("storeName"),
            customerName: document.getElementById("customerName"),
            customerPhone: document.getElementById("customerPhone"),
            carrierNumber: document.getElementById("carrierNumber"),
            searchInput: document.getElementById("searchInput"),
        };

        Object.keys(inputs).forEach((key) => {
            const savedValue = localStorage.getItem(`goopi_${key}`);
            if (savedValue) {
                inputs[key].value = savedValue;
            }

            inputs[key].addEventListener("input", function () {
                localStorage.setItem(`goopi_${key}`, this.value);
            });
        });
    }

    function setupAutoSave() {
        const inputs = document.querySelectorAll("#checkout-tab input");
        inputs.forEach((input) => {
            input.addEventListener("change", () => {
                const checkoutInfo = {
                    storeId: document.getElementById("storeId").value,
                    storeAddress: document.getElementById("storeAddress").value,
                    storeName: document.getElementById("storeName").value,
                    customerName: document.getElementById("customerName").value,
                    customerPhone: document.getElementById("customerPhone").value,
                    carrierNumber: document.getElementById("carrierNumber").value,
                };
                localStorage.setItem(
                    "goopi_checkout_info",
                    JSON.stringify(checkoutInfo)
                );
                showToast("已儲存輸入資料");
            });
        });
    }

    function init() {
        if (window.location.pathname.startsWith("/checkout")) {
            setTimeout(fillCheckoutForm, 300);
        }
        loadSavedData();
        setupAutoSave();
        loadSavedItems();
        initDragAndTouch();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
