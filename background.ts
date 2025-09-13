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
      title: '元素拾取完成',
      message: '点击扩展图标查看拾取的元素信息',
      priority: 1,
      buttons: [
        { title: '查看结果' }
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
    
    console.log("已设置badge和通知提示用户元素拾取完成")
    
  } catch (error) {
    console.error("显示通知失败:", error)
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
