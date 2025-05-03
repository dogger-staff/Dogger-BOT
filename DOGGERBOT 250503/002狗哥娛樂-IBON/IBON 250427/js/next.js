async function checkInputAndClickNext() {
  // 查找验证码输入框
  const mainArea = document.querySelector("#ticket-wrap");
  if (!mainArea) {
    console.error("未找到 ticket-wrap 元素");
    return;
  }

  const verifyCodeInput = mainArea.querySelector("input[type='text']");
  if (!verifyCodeInput) {
    console.error("未找到验证码输入框");
    return;
  }

  // 查找“下一步”按钮
  let nextBtn = null;
  const maxAttempts = 100; // 10秒超时
  let attempts = 0;

  while (!nextBtn && attempts < maxAttempts) {
    const nextBtnArea = document.querySelector("#Next div");
    if (nextBtnArea) {
      try {
        // 尝试访问 Shadow DOM（需要扩展权限）
        const shadowRoot = nextBtnArea.shadowRoot || (chrome?.dom?.openOrClosedShadowRoot ? chrome.dom.openOrClosedShadowRoot(nextBtnArea) : null);
        if (shadowRoot) {
          nextBtn = shadowRoot.querySelector("a") || shadowRoot.querySelector("button");
        } else {
          // 如果无法访问 Shadow DOM，尝试普通 DOM
          nextBtn = nextBtnArea.querySelector("a") || nextBtnArea.querySelector("button");
        }
      } catch (e) {
        console.error("无法访问 Shadow DOM:", e);
      }
    }
    if (!nextBtn) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  if (!nextBtn) {
    console.error("未找到‘下一步’按钮");
    return;
  }

  // 每 5 秒检测输入框内容
  const intervalId = setInterval(() => {
    if (verifyCodeInput.value.trim() !== "") {
      // 输入框有内容，点击“下一步”按钮
      nextBtn.click();
      console.log("检测到输入框有内容，已点击‘下一步’按钮");
      clearInterval(intervalId); // 停止轮询
    } else {
      console.log("输入框为空，继续检测...");
    }
  }, 100); // 每 5 秒检查一次
}

// 执行脚本
checkInputAndClickNext().catch(err => console.error("脚本执行失败:", err));