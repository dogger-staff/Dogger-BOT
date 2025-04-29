const currentUrl = window.location.href;
var settings = null;

// Load settings from chrome.storage.local
chrome.storage.local.get('settings', function (items) {
    if (items.settings) {
        settings = items.settings;
        // Check if target_url exists and is not empty
        if (settings.target_url && settings.target_url.trim() !== '') {
            // Redirect to target_url
            window.location.href = settings.target_url;
        }
    } else {
        console.log('No settings found');
    }
});
