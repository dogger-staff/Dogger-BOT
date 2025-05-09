const storage = chrome.storage.local;
const submitButton = document.querySelector('#save_btn');
const target_url = document.querySelector('#target_url');
const ticket_number = document.querySelector('#ticket_number');
const date_select_mode = document.querySelector('#date_select_mode');
const date_keyword = document.querySelector('#date_keyword');
const area_select_mode = document.querySelector('#area_select_mode');
const area_keyword = document.querySelector('#area_keyword');
const keyword_exclude = document.querySelector('#keyword_exclude');
const auto_reload_page_interval = document.querySelector('#auto_reload_page_interval');
const auto_reload_overheat_count = document.querySelector('#auto_reload_overheat_count');
const auto_reload_overheat_cd = document.querySelector('#auto_reload_overheat_cd');
const submit_order_min_seconds = document.querySelector('#submit_order_min_seconds');
const ocr_captcha_enable = document.querySelector('#ocr_captcha_enable');
const remote_url = document.querySelector('#remote_url');
const user_guess_string = document.querySelector('#user_guess_string');
const next = document.querySelector('#next');

var settings = null;

loadChanges();

submitButton.addEventListener('click', saveChanges);

async function saveChanges() {
    const ticket_number_value = ticket_number.value;
    if (!ticket_number_value) {
        message('Error: No ticket_number specified');
    } else {
        if (settings) {
            settings.target_url = target_url.value;
            settings.ticket_number = ticket_number_value;
            settings.date_auto_select.mode = date_select_mode.value;

            let date_keyword_string = date_keyword.value;
            if (date_keyword_string.indexOf('"') == -1) {
                date_keyword_string = '"' + date_keyword_string + '"';
            }
            settings.date_auto_select.date_keyword = date_keyword_string;

            settings.area_auto_select.mode = area_select_mode.value;

            let area_keyword_string = area_keyword.value;
            if (area_keyword_string.indexOf('"') == -1) {
                area_keyword_string = '"' + area_keyword_string + '"';
            }
            settings.area_auto_select.area_keyword = area_keyword_string;

            let user_guess_string_string = user_guess_string.value;
            if (user_guess_string_string.indexOf('"') == -1) {
                user_guess_string_string = '"' + user_guess_string_string + '"';
            }
            settings.advanced.user_guess_string = user_guess_string_string;

            settings.keyword_exclude = keyword_exclude.value;

            settings.advanced.auto_reload_page_interval = Number(auto_reload_page_interval.value);
            settings.advanced.auto_reload_overheat_count = Number(auto_reload_overheat_count.value);
            settings.advanced.auto_reload_overheat_cd = Number(auto_reload_overheat_cd.value);
            settings.advanced.submit_order_min_seconds = Number(submit_order_min_seconds.value);
            settings.ocr_captcha.enable = ocr_captcha_enable.checked;
            settings.next.enable = next.checked;

            let remote_url_array = [];
            remote_url_array.push(remote_url.value);
            let remote_url_string = JSON.stringify(remote_url_array);
            remote_url_string = remote_url_string.substring(0, remote_url_string.length - 1);
            remote_url_string = remote_url_string.substring(1);
            settings.advanced.remote_url = remote_url_string;

            await storage.set({
                settings: settings
            });
        }
        message('Settings saved');
    }
}

function loadChanges() {
    storage.get('settings', function (items) {
        if (items.settings) {
            settings = items.settings;
            target_url.value = settings.target_url || '';
            ticket_number.value = settings.ticket_number;
            date_select_mode.value = settings.date_auto_select.mode;
            date_keyword.value = settings.date_auto_select.date_keyword;
            if (date_keyword.value == '""') {
                date_keyword.value = '';
            }

            area_select_mode.value = settings.area_auto_select.mode;
            area_keyword.value = settings.area_auto_select.area_keyword;
            if (area_keyword.value == '""') {
                area_keyword.value = '';
            }

            user_guess_string.value = settings.advanced.user_guess_string;
            if (user_guess_string.value == '""') {
                user_guess_string.value = '';
            }

            keyword_exclude.value = settings.keyword_exclude;
            auto_reload_page_interval.value = settings.advanced.auto_reload_page_interval;
            auto_reload_overheat_count.value = settings.advanced.auto_reload_overheat_count;
            auto_reload_overheat_cd.value = settings.advanced.auto_reload_overheat_cd;
            submit_order_min_seconds.value = settings.advanced.submit_order_min_seconds;
            ocr_captcha_enable.checked = settings.ocr_captcha.enable;
            next.checked = settings.next.enable;

            let remote_url_string = "";
            let remote_url_array = [];
            if (settings.advanced.remote_url.length > 0) {
                remote_url_array = JSON.parse('[' + settings.advanced.remote_url + ']');
            }
            if (remote_url_array.length) {
                remote_url_string = remote_url_array[0];
            }
            remote_url.value = remote_url_string;

        } else {
            console.log('no settings found');
        }
    });
}

let messageClearTimer;
function message(msg) {
    clearTimeout(messageClearTimer);
    const message = document.querySelector('#message');
    message.innerText = msg;
    messageClearTimer = setTimeout(function () {
        message.innerText = '';
    }, 3000);
}