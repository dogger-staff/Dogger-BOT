const storage = chrome.storage.local;
var settings = null;
var myInterval = null;

// price row.
$("#salesTable > tbody > tr.Soldout").remove();
$("div.footer").remove();
$(document).ready(function () {
    // 定义需要移除的关键字数组
    const excludeKeywords = ["輪椅", "身障", "身心障礙", "Restricted View", "燈柱遮蔽", "視線不完整"];

    // 遍历表格行，检查是否包含任意关键字
    $("#salesTable > tbody > tr.status_tr").each(function () {
        const rowText = $(this).text().trim(); // 获取行的文本内容

        // 如果行包含任意排除关键字，则移除该行
        if (excludeKeywords.some(keyword => rowText.includes(keyword))) {
            $(this).remove();
        }
    });
});



$(document).ready(function () {
    // 定义关键字优先级数组
    const keywords = ["5880", "4樓"];
    let clicked = false;

    // 遍历表格中的行
    $("#salesTable > tbody > tr.status_tr").each(function () {
        const rowText = $(this).text().trim();

        // 遍历关键字
        for (const keyword of keywords) {
            if (rowText.includes(keyword)) {
                // 点击匹配的行
                $(this).trigger("click");
                console.log("Clicked row with keyword:", keyword, $(this));
                clicked = true;
                return false; // 结束内层循环
            }
        }
    });

    // 如果没有匹配项，点击第一行
    if (!clicked) {
        const firstRow = $("#salesTable > tbody > tr.status_tr").first();
        if (firstRow.length > 0) {
            firstRow.trigger("click");
            console.log("No matching keywords found. Clicked the first row.", firstRow);
        }
    }
});
