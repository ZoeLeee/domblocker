// Background script for handling notifications

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ELEMENT_PICKED_NOTIFICATION") {
    showElementPickedNotification(message.tabId)
  }
  return true
})

// 显示元素拾取完成通知
async function showElementPickedNotification(tabId: number) {
  try {
    // 延迟一点时间确保popup完全关闭
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 设置badge文本提示用户
    chrome.action.setBadgeText({
      text: "✓",
      tabId: tabId
    })
    
    chrome.action.setBadgeBackgroundColor({
      color: "#4CAF50",
      tabId: tabId
    })
    
    // 创建通知提示用户
    const notificationId = `element-picked-${Date.now()}`
    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'assets/icon.png',
      title: chrome.i18n.getMessage('elementPickedNotification'),
      message: chrome.i18n.getMessage('elementPickedMessage'),
      priority: 1,
      buttons: [
        { title: chrome.i18n.getMessage('viewResults') }
      ]
    })
    
    // 监听通知点击事件
    chrome.notifications.onClicked.addListener((clickedNotificationId) => {
      if (clickedNotificationId === notificationId) {
        // 点击通知时清除badge
        chrome.action.setBadgeText({
          text: "",
          tabId: tabId
        })
        // 清除通知
        chrome.notifications.clear(notificationId)
      }
    })
    
    // 监听通知按钮点击事件
    chrome.notifications.onButtonClicked.addListener((clickedNotificationId, buttonIndex) => {
      if (clickedNotificationId === notificationId && buttonIndex === 0) {
        // 点击"查看结果"按钮时清除badge
        chrome.action.setBadgeText({
          text: "",
          tabId: tabId
        })
        // 清除通知
        chrome.notifications.clear(notificationId)
      }
    })
    
    // 5秒后自动清除badge和通知
    setTimeout(() => {
      chrome.action.setBadgeText({
        text: "",
        tabId: tabId
      })
      chrome.notifications.clear(notificationId)
    }, 5000)
    
    console.log(chrome.i18n.getMessage("elementPickedNotification"))
    
  } catch (error) {
    console.error(chrome.i18n.getMessage("showNotificationFailed"), error)
  }
}

// 监听popup打开事件
chrome.action.onClicked.addListener((tab) => {
  // 清除badge
  chrome.action.setBadgeText({
    text: "",
    tabId: tab.id
  })
})

export {}
