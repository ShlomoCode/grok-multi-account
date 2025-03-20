// עדכון ה-badge בעת הפעלת התוסף
chrome.runtime.onStartup.addListener(function() {
    updateBadgeFromStorage();
  });
  
  // עדכון ה-badge גם בעת התקנת או עדכון התוסף
  chrome.runtime.onInstalled.addListener(function() {
    updateBadgeFromStorage();
  });
  
  // פונקציה לעדכון ה-badge על פי החשבון הפעיל באחסון
  function updateBadgeFromStorage() {
    chrome.storage.local.get('activeGrokAccount', function(result) {
      if (result.activeGrokAccount) {
        const badgeText = result.activeGrokAccount.charAt(0).toUpperCase();
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    });
  }
  
  // האזנה לשינויים באחסון כדי לעדכן את ה-badge בזמן אמת
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.activeGrokAccount) {
      const newAccountName = changes.activeGrokAccount.newValue;
      if (newAccountName) {
        const badgeText = newAccountName.charAt(0).toUpperCase();
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  });