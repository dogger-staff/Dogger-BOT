const storage = chrome.storage.local;
var settings = null;
var isProcessing = false;
let remainingRows = [];

function cleanSoldOutTickets(settings) {
  remainingRows = [];
  let exclude_keyword_array = [];

  // 解析排除關鍵字
  if (settings && settings.keyword_exclude && settings.keyword_exclude.length > 0 && settings.keyword_exclude !== '""') {
    try {
      exclude_keyword_array = JSON.parse('[' + settings.keyword_exclude + ']');
    } catch (e) {
      console.error('Failed to parse keyword_exclude:', e);
    }
  }

  function processTicketAreas(element) {
    if (element.shadowRoot) {
      const rows = element.shadowRoot.querySelectorAll('tr[id^="B"]');
      rows.forEach(row => {
        const rowText = row.textContent;
        const isSoldOut = rowText.includes('售完');
        let isExcluded = false;

        // 檢查排除關鍵字
        if (exclude_keyword_array.length > 0) {
          for (let i = 0; i < exclude_keyword_array.length; i++) {
            if (rowText.includes(exclude_keyword_array[i])) {
              isExcluded = true;
              break;
            }
          }
        }

        // 移除售完或包含排除關鍵字的行
        if (isSoldOut || isExcluded) {
          row.remove();
        } else {
          remainingRows.push(row);
        }
      });

      const iframes = element.shadowRoot.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          if (iframe.contentDocument) {
            processTicketAreas(iframe.contentDocument);
          }
        } catch (e) {}
      });
    }

    const children = element.children;
    if (children) {
      Array.from(children).forEach(child => processTicketAreas(child));
    }
  }

  processTicketAreas(document.documentElement);
  return remainingRows;
}

function selectTicketAreaByKeyword(settings, rows) {
  let area_keyword_array = [];
  let ticketId = null;

  // 解析區域關鍵字
  if (settings && settings.area_auto_select && settings.area_auto_select.area_keyword && settings.area_auto_select.area_keyword.length > 0 && settings.area_auto_select.area_keyword !== '""') {
    try {
      area_keyword_array = JSON.parse('[' + settings.area_auto_select.area_keyword + ']');
    } catch (e) {
      console.error('Failed to parse area_keyword:', e);
    }
  }

  // 檢查是否有空關鍵字
  const hasEmptyKeyword = area_keyword_array.includes("");

  // 根據關鍵字選擇區域
  if (area_keyword_array.length > 0) {
    for (let i = 0; i < area_keyword_array.length; i++) {
      let matchedRows = [];
      const keyword = area_keyword_array[i];

      // 遍歷剩餘的行，檢查是否包含關鍵字
      rows.forEach(row => {
        if (keyword === "" || row.textContent.includes(keyword)) {
          matchedRows.push(row);
        }
      });

      // 使用 get_target_area_with_order 選擇目標區域（從 common.js）
      const targetRow = get_target_area_with_order(settings, matchedRows);
      if (targetRow) {
        ticketId = targetRow.getAttribute('id');
        console.log(`Match keyword: ${keyword}, selected ticketId: ${ticketId}`);
        break; // 找到匹配後退出關鍵字循環
      }
    }
  }

  // 如果無關鍵字匹配且無空關鍵字，停止動作
  if (!ticketId && (area_keyword_array.length === 0 || hasEmptyKeyword)) {
    // 未設定關鍵字或包含空關鍵字，匹配所有未售完的行
    const targetRow = get_target_area_with_order(settings, rows);
    if (targetRow) {
      ticketId = targetRow.getAttribute('id');
      console.log('No keyword specified or empty keyword, selected ticketId:', ticketId);
    }
  }

  return ticketId;
}

function navigateToTicketArea(ticketId) {
  if (!ticketId) return;

  const currentUrl = window.location.href;
  const newUrlBase = currentUrl.replace('UTK0201_000', 'UTK0201_001');
  const urlParams = new URLSearchParams(window.location.search);
  const performanceId = urlParams.get('PERFORMANCE_ID');
  const newParams = new URLSearchParams({
    PERFORMANCE_ID: performanceId,
    GROUP_ID: '',
    PERFORMANCE_PRICE_AREA_ID: ticketId
  });
  const newUrl = `${newUrlBase.split('?')[0]}?${newParams.toString()}`;
  window.location.href = newUrl;
}

function reloadIfNoTickets() {
  // 固定每 0.1 秒刷新
  setTimeout(() => {
    location.reload();
  }, 100);
}

function monitorDomChanges(callback, settings) {
  const observer = new MutationObserver(() => {
    callback(document.documentElement, settings);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  let checkCount = 0;
  const intervalId = setInterval(() => {
    if (checkCount++ < 10) {
      callback(document.documentElement, settings);
    } else {
      clearInterval(intervalId);
    }
  }, 0);
}

function mainTicketProcessing() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const ticketId = selectTicketAreaByKeyword(settings, remainingRows);
    if (ticketId) {
      navigateToTicketArea(ticketId);
    } else {
      console.log('No matching ticket area found, triggering reload.');
      reloadIfNoTickets();
    }
    monitorDomChanges(cleanSoldOutTickets, settings);
    window.postMessage({ type: 'FILTER_APPLIED' }, '*');
  } catch (error) {
    console.error('Error in mainTicketProcessing:', error);
    window.postMessage({ type: 'FILTER_APPLIED' }, '*');
  } finally {
    isProcessing = false;
  }
}

storage.get('settings', function (items) {
  if (items.settings) {
    settings = items.settings;
    cleanSoldOutTickets(settings);
  }
});

storage.get('status', function (items) {
  if (items.status && items.status == 'ON') {
    mainTicketProcessing();
  } else {
    console.log('no status found');
  }
});