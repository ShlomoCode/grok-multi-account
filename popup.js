function logCookies() {
  chrome.cookies.getAll({}, function(cookies) {
    const grokCookies = cookies.filter(cookie => cookie.domain.includes('grok.com'));
    console.log('כל העוגיות של grok.com:', grokCookies);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // רישום העוגיות לקונסול בטעינה ראשונית
  logCookies();
  
  // טעינת החשבונות השמורים
  loadAccounts();
  
  // האזנה לכפתור שמירת העוגיות
  document.getElementById('saveCurrentCookies').addEventListener('click', saveCurrentCookies);
  
  // בדיקה אם יש חשבון פעיל ועדכון ה-badge
  chrome.storage.local.get('activeGrokAccount', function(result) {
    if (result.activeGrokAccount) {
      console.log('החשבון הפעיל הנוכחי:', result.activeGrokAccount);
      updateBadge(result.activeGrokAccount);
    }
  });
});

// טעינת החשבונות מהאחסון
function loadAccounts() {
  chrome.storage.local.get('grokAccounts', function(result) {
    let accounts = result.grokAccounts || [];
    const accountsList = document.getElementById('accountsList');
    accountsList.innerHTML = '';
    
    if (accounts.length === 0) {
      accountsList.innerHTML = '<p style="text-align: center;">אין חשבונות שמורים. הוסף חשבון חדש למטה.</p>';
      return;
    }
    
    // מיון החשבונות לפי זמן ההתנתקות האחרון (מהחדש לישן)
    accounts = accounts.sort((a, b) => {
      // אם חסר שדה lastLogout, מתייחסים כאילו התנתק לפני הרבה זמן
      const lastLogoutA = a.lastLogout || 0;
      const lastLogoutB = b.lastLogout || 0;
      return lastLogoutB - lastLogoutA;
    });
    
    accounts.forEach(function(account, index) {
      const accountItem = document.createElement('div');
      accountItem.className = 'account-item';
      
      // אזור מידע החשבון
      const accountInfo = document.createElement('div');
      accountInfo.className = 'account-info';
      
      const nameSpan = document.createElement('div');
      nameSpan.textContent = account.name;
      nameSpan.className = 'account-name';
      
      const lastLogoutSpan = document.createElement('div');
      lastLogoutSpan.className = 'last-used';
      
      if (account.lastLogout) {
        const lastLogoutDate = new Date(account.lastLogout);
        lastLogoutSpan.textContent = `התנתק לאחרונה ${formatDate(lastLogoutDate)}`;
      } else {
        lastLogoutSpan.textContent = 'טרם התנתק';
      }
      
      accountInfo.appendChild(nameSpan);
      accountInfo.appendChild(lastLogoutSpan);
      
      // אזור כפתורים
      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'buttons-container';
      
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'מחק';
      deleteButton.className = 'delete-btn';
      deleteButton.addEventListener('click', function() {
        deleteAccount(index);
      });
      
      const switchButton = document.createElement('button');
      switchButton.textContent = 'החלף לחשבון זה';
      switchButton.className = 'switch-btn';
      switchButton.addEventListener('click', function() {
        switchToAccount(account, index);
      });
      
      buttonsDiv.appendChild(deleteButton);
      buttonsDiv.appendChild(switchButton);
      
      accountItem.appendChild(accountInfo);
      accountItem.appendChild(buttonsDiv);
      
      accountsList.appendChild(accountItem);
    });
  });
}

// פונקציה לעדכון ה-badge של התוסף עם האות הראשונה של שם החשבון הפעיל
function updateBadge(accountName) {
  if (!accountName) {
    // אם אין חשבון פעיל, נקה את ה-badge
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  // קח את האות הראשונה משם החשבון
  const badgeText = accountName.charAt(0).toUpperCase();
  
  // הגדר את הטקסט של ה-badge
  chrome.action.setBadgeText({ text: badgeText });
  
  // הגדר צבע רקע כחול לבאדג'
  chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
}

// פונקציה לפורמט התאריך בעברית עם זמן יחסי
function formatDate(date) {
  const now = new Date();
  const diff = now - date; // הפרש בזמן במילישניות
  
  // המרה למידות זמן שונות
  const minutes = Math.floor(diff / 60000); // 60 * 1000
  const hours = Math.floor(diff / 3600000); // 60 * 60 * 1000
  const days = Math.floor(diff / 86400000); // 24 * 60 * 60 * 1000
  
  // צורות דקדוקיות בעברית
  const formatMinutes = (min) => {
    if (min === 1) return "דקה";
    return "דקות";
  };
  
  const formatHours = (hrs) => {
    if (hrs === 1) return "שעה";
    return "שעות";
  };
  
  const formatDays = (d) => {
    if (d === 1) return "יום";
    return "ימים";
  };
  
  // פחות משעה - מציג דקות
  if (hours < 1) {
    return `לפני ${minutes} ${formatMinutes(minutes)}`;
  }
  
  // בין שעה ליום - מציג שעות ודקות
  if (days < 1) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      // בדיוק מספר שלם של שעות
      return `לפני ${hours} ${formatHours(hours)}`;
    } else {
      return `לפני ${hours} ${formatHours(hours)} ו-${remainingMinutes} ${formatMinutes(remainingMinutes)}`;
    }
  }
  
  // מעל יום - מציג מספר ימים
  return `לפני ${days} ${formatDays(days)}`;
}

// שמירת העוגיות הנוכחיות כחשבון חדש
function saveCurrentCookies() {
  const accountName = document.getElementById('accountName').value.trim();
  
  if (!accountName) {
    alert('אנא הזן שם לחשבון');
    return;
  }
  
  chrome.cookies.getAll({domain: 'grok.com'}, function(grokCookies) {
    if (grokCookies.length === 0) {
      showStatus('לא נמצאו עוגיות עבור grok.com. אנא ודא שהתחברת לחשבון.', true);
      return;
    }
    
    chrome.storage.local.get(['grokAccounts', 'activeGrokAccount'], function(result) {
      const accounts = result.grokAccounts || [];
      const currentTime = new Date().getTime();
      
      // בדיקה אם כבר קיים חשבון עם אותו שם
      const existingIndex = accounts.findIndex(acc => acc.name === accountName);
      
      if (existingIndex !== -1) {
        if (confirm(`חשבון בשם "${accountName}" כבר קיים. האם ברצונך לעדכן אותו?`)) {
          accounts[existingIndex].cookies = grokCookies;
          // מעדכנים את זמן ההתנתקות בעדכון החשבון
          accounts[existingIndex].lastLogout = new Date().getTime();
        } else {
          return;
        }
      } else {
        accounts.push({
          name: accountName,
          cookies: grokCookies,
          lastLogout: new Date().getTime() // הגדרת זמן התנתקות ראשוני
        });
        // הגדרת החשבון החדש כפעיל
        chrome.storage.local.set({activeGrokAccount: accountName}, function() {
          // עדכון ה-badge
          updateBadge(accountName);
        });
      }
      
      chrome.storage.local.set({grokAccounts: accounts}, function() {
        showStatus(`החשבון "${accountName}" נשמר בהצלחה`);
        document.getElementById('accountName').value = '';
        loadAccounts();
      });
    });
  });
}

// פונקציה להצגת הודעת סטטוס
function showStatus(message, isError = false) {
  const statusDiv = document.createElement('div');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
  
  // הוספת האלמנט בראש אזור ההודעות
  const statusMessages = document.getElementById('statusMessages');
  statusMessages.appendChild(statusDiv);
  
  // הסרת ההודעה אחרי 3 שניות
  setTimeout(() => {
    statusDiv.style.opacity = '0';
    setTimeout(() => statusDiv.remove(), 500);
  }, 3000);
}

// החלפה לחשבון אחר
function switchToAccount(account, accountIndex) {
  // קודם נעדכן את זמן ההתנתקות של החשבון הפעיל הנוכחי
  chrome.storage.local.get(['grokAccounts', 'activeGrokAccount'], function(result) {
    const accounts = result.grokAccounts || [];
    const activeAccountName = result.activeGrokAccount;
    const currentTime = new Date().getTime();
    
    // אם יש חשבון פעיל, עדכן את זמן ההתנתקות שלו
    if (activeAccountName && activeAccountName !== account.name) {
      const activeIndex = accounts.findIndex(acc => acc.name === activeAccountName);
      if (activeIndex !== -1) {
        accounts[activeIndex].lastLogout = currentTime;
        console.log(`עודכן זמן ההתנתקות של חשבון "${activeAccountName}"`);
      }
    }
    
    // עדכון החשבון הפעיל החדש
    chrome.storage.local.set({
      grokAccounts: accounts,
      activeGrokAccount: account.name
    }, function() {
      console.log(`החשבון הפעיל הוחלף ל-"${account.name}"`);
      // עדכון ה-badge
      updateBadge(account.name);
    });
  });
  
  // קבלת כל העוגיות הנוכחיות
  chrome.cookies.getAll({}, function(allCookies) {
    // סינון רק עוגיות שקשורות ל-grok.com
    const grokCookies = allCookies.filter(cookie => 
      cookie.domain === 'grok.com' || 
      cookie.domain === '.grok.com' ||
      cookie.domain.endsWith('.grok.com')
    );
    
    // מחיקת כל העוגיות הקשורות ל-grok
    grokCookies.forEach(function(cookie) {
      // בדיקה ותיקון הדומיין
      let cookieDomain = cookie.domain;
      if (cookieDomain.startsWith('.')) {
        cookieDomain = cookieDomain.substring(1);
      }
      
      chrome.cookies.remove({
        url: `https://${cookieDomain}${cookie.path}`,
        name: cookie.name
      });
    });
    
    // הוספת העוגיות של החשבון הנבחר
    account.cookies.forEach(function(cookie) {
      // בדיקה ותיקון הדומיין
      let cookieDomain = cookie.domain;
      if (cookieDomain.startsWith('.')) {
        cookieDomain = cookieDomain.substring(1);
      }
      
      // הגדרת העוגייה החדשה עם כל המאפיינים
      const newCookie = {
        url: `https://${cookieDomain}${cookie.path}`,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite
      };
      
      // הוספת expirationDate רק אם העוגייה אינה session cookie
      if (cookie.expirationDate) {
        newCookie.expirationDate = cookie.expirationDate;
      }
      
      chrome.cookies.set(newCookie);
    });
    
    showStatus(`הוחלף לחשבון "${account.name}"`);
    
    // רענון הדף הנוכחי אם זה באתר grok.com
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('grok.com')) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  });
}

// מחיקת חשבון
function deleteAccount(index) {
  if (confirm('האם אתה בטוח שברצונך למחוק חשבון זה?')) {
    chrome.storage.local.get('grokAccounts', function(result) {
      const accounts = result.grokAccounts || [];
      accounts.splice(index, 1);
      
      chrome.storage.local.set({grokAccounts: accounts}, function() {
        loadAccounts();
      });
    });
  }
}