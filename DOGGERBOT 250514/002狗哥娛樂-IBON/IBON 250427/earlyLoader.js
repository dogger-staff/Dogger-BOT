(function() {
    if (!window.location.hostname.includes('ibon.com.tw')) return;
  
    let filterApplied = false;
    let shadowObserver = null;
    const shadowStyleCache = new Set();
  
    function handleIbonShadowDOM() {
      function injectStyleToShadowRoot(shadowRoot) {
        if (!shadowRoot) return;
        if (shadowRoot.querySelector('#ticket-filter-shadow-style')) return;
  
        try {
          const shadowStyle = document.createElement('style');
          shadowStyle.id = 'ticket-filter-shadow-style';
          shadowStyle.textContent = `
            tr[id^="B"] {
              opacity: 0;
              transition: opacity 0.2s;
            }
          `;
          shadowRoot.appendChild(shadowStyle);
          shadowStyleCache.add(shadowRoot);
        } catch (err) {}
      }
  
      function checkShadowRoots(element) {
        if (!element) return;
        if (element.shadowRoot) {
          injectStyleToShadowRoot(element.shadowRoot);
        }
        const children = element.children;
        if (children && children.length) {
          for (let i = 0; i < children.length; i++) {
            checkShadowRoots(children[i]);
          }
        }
      }
  
      checkShadowRoots(document);
  
      shadowObserver = new MutationObserver((mutations) => {
        if (filterApplied) {
          shadowObserver.disconnect();
          return;
        }
  
        for (const mutation of mutations) {
          if (mutation.addedNodes && mutation.addedNodes.length) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) {
                checkShadowRoots(node);
              }
            }
          }
        }
      });
  
      shadowObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  
    function makeAllRowsVisible(root) {
      if (root.shadowRoot) {
        const rows = root.shadowRoot.querySelectorAll('tr[id^="B"]');
        rows.forEach(row => {
          row.style.opacity = '1';
          row.style.visibility = 'visible';
        });
      }
      if (root.children) {
        Array.from(root.children).forEach(child => {
          makeAllRowsVisible(child);
        });
      }
    }
  
    function showAllElements() {
      filterApplied = true;
      window.ticketFilterComplete = true;
  
      if (shadowObserver) {
        shadowObserver.disconnect();
      }
  
      shadowStyleCache.forEach(shadowRoot => {
        try {
          const style = shadowRoot.querySelector('#ticket-filter-shadow-style');
          if (style) {
            style.textContent = `
              tr[id^="B"] {
                opacity: 1 !important;
                transition: opacity 0.2s;
              }
            `;
          }
        } catch (err) {}
      });
  
      // 直接執行邏輯，無需注入內聯腳本
      makeAllRowsVisible(document.documentElement);
    }
  
    setTimeout(() => {
      handleIbonShadowDOM();
    }, 10);
  
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'FILTER_APPLIED') {
        showAllElements();
      }
  
      if (event.data && event.data.type === 'CONTENT_JS_LOADED' && !filterApplied) {
        setTimeout(() => {
          if (!filterApplied) {
            showAllElements();
          }
        }, 2000);
      }
    });
  
    setTimeout(() => {
      if (!filterApplied) {
        showAllElements();
      }
    }, 1500);
  })();