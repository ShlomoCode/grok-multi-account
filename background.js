function initBadge() {
    chrome.storage.local.get('activeGrokAccount', (data) => {
        updateBadgeFromValue(data.activeGrokAccount);
    });
}

function updateBadgeFromValue(accountName) {
    if (accountName) {
        const badgeText = accountName.charAt(0).toUpperCase();
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

chrome.runtime.onStartup.addListener(initBadge);
chrome.runtime.onInstalled.addListener(initBadge);
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.activeGrokAccount) {
        updateBadgeFromValue(changes.activeGrokAccount.newValue);
    }
});
