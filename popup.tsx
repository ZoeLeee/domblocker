import { useState, useEffect } from "react"

interface ElementSelectors {
  css: string
  xpath: string
  tagClass: string | null
  attribute: string | null
}

interface ElementInfo {
  tagName: string
  id: string | null
  className: string | null
  textContent: string | null
  selectors: ElementSelectors
  attributes: Record<string, string>
  isHidden: boolean
}

interface PickedElementData {
  element: ElementInfo
  pickedAt: number
  pageUrl: string
  uniqueId: string
}

function IndexPopup() {
  const [data, setData] = useState("")
  const [isPicking, setIsPicking] = useState(false)
  const [pickedElements, setPickedElements] = useState<PickedElementData[]>([])
  const [currentPageUrl, setCurrentPageUrl] = useState<string>("")

  // 删除元素
  const deleteElement = async (element: ElementInfo, index: number) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab.id) return

      // 如果元素是隐藏状态，先恢复显示
      if (element.isHidden) {
        await chrome.tabs.sendMessage(tab.id, {
          type: "TOGGLE_ELEMENT_VISIBILITY",
          selector: element.selectors.css,
          isHidden: false
        })
      }

      // 从本地状态中移除
      setPickedElements(prev => prev.filter((_, i) => i !== index))

      // 从storage中删除
      const pageUrl = currentPageUrl
      const allData = await chrome.storage.local.get()
      
      for (const key in allData) {
        if (key.startsWith('pickedElement_')) {
          const data = allData[key]
          if (data && data.pageUrl === pageUrl && data.element.selectors.css === element.selectors.css) {
            await chrome.storage.local.remove(key)
            break
          }
        }
      }
    } catch (error) {
      console.error(chrome.i18n.getMessage("deleteElementFailed"), error)
    }
  }

  // 切换元素可见性
  const toggleElementVisibility = async (element: ElementInfo, index: number) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab.id) return

      const newIsHidden = !element.isHidden
      
      // 发送消息给content script切换可见性
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_ELEMENT_VISIBILITY",
        selector: element.selectors.css,
        isHidden: newIsHidden
      })

      if (response.success) {
        // 更新本地状态
        setPickedElements(prev => {
          const newElements = [...prev]
          newElements[index] = {
            ...newElements[index],
            element: {
              ...newElements[index].element,
              isHidden: newIsHidden
            }
          }
          return newElements
        })

        // 更新storage
        const pageUrl = currentPageUrl
        const storageKey = `pickedElement_${encodeURIComponent(pageUrl)}`
        const allData = await chrome.storage.local.get()
        
        // 找到并更新对应的元素
        for (const key in allData) {
          if (key.startsWith('pickedElement_')) {
            const data = allData[key]
            if (data && data.pageUrl === pageUrl && data.element.selectors.css === element.selectors.css) {
              await chrome.storage.local.set({
                [key]: {
                  ...data,
                  element: {
                    ...data.element,
                    isHidden: newIsHidden
                  }
                }
              })
              break
            }
          }
        }
      }
    } catch (error) {
      console.error(chrome.i18n.getMessage("toggleVisibilityFailed"), error)
    }
  }

  // 监听来自content script的消息
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === "ELEMENT_PICKED") {
        // 添加新拾取的元素到列表
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newElement: PickedElementData = {
          element: message.element,
          pickedAt: Date.now(),
          pageUrl: currentPageUrl,
          uniqueId: uniqueId
        }
        setPickedElements(prev => [newElement, ...prev])
        setIsPicking(false)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    
    // 监听storage变化
    const handleStorageChange = async (changes: any, namespace: string) => {
      if (namespace === 'local') {
        // 检查是否有新的拾取元素（只处理新增，不处理更新）
        for (const key in changes) {
          if (key.startsWith('pickedElement_')) {
            const change = changes[key]
            // 只处理新增的元素（oldValue为undefined表示新增）
            if (change.newValue && change.newValue.element && !change.oldValue) {
              // 获取当前活动标签页的URL
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
              if (tab.url && change.newValue.pageUrl === tab.url) {
                // 添加到元素列表
                setPickedElements(prev => [change.newValue, ...prev])
                setIsPicking(false)
              }
            }
          }
        }
      }
    }
    
    chrome.storage.onChanged.addListener(handleStorageChange)
    
    // 加载当前页面的所有拾取元素
    const loadPickedElements = async () => {
      try {
        // 获取当前活动标签页的URL
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab.url) return
        
        const pageUrl = tab.url
        setCurrentPageUrl(pageUrl)
        
        // 获取所有storage数据
        const allData = await chrome.storage.local.get()
        const currentPageElements: PickedElementData[] = []
        
        // 筛选出当前页面的元素
        for (const key in allData) {
          if (key.startsWith('pickedElement_')) {
            const data = allData[key]
            if (data && data.pageUrl === pageUrl && data.element) {
              currentPageElements.push(data)
            }
          }
        }
        
        // 按时间排序（最新的在前）
        currentPageElements.sort((a, b) => b.pickedAt - a.pickedAt)
        setPickedElements(currentPageElements)
        
      } catch (error) {
        console.error(chrome.i18n.getMessage("readStorageFailed"), error)
      }
    }
    
    loadPickedElements()
    
    // 清除badge和通知
    const clearIndicators = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab.id) {
          chrome.action.setBadgeText({
            text: "",
            tabId: tab.id
          })
        }
        
        // 清除所有相关通知
        chrome.notifications.getAll((notifications) => {
          if (notifications) {
            Object.keys(notifications).forEach(notificationId => {
              if (notificationId.startsWith('element-picked-')) {
                chrome.notifications.clear(notificationId)
              }
            })
          }
        })
      } catch (error) {
        console.error(chrome.i18n.getMessage("clearIndicatorsFailed"), error)
      }
    }
    
    clearIndicators()
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  // 开始拾取元素
  const startElementPicking = async () => {
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (tab.id) {
        // 发送消息给content script开始拾取
        await chrome.tabs.sendMessage(tab.id, { type: "START_PICKING" })
        setIsPicking(true)
        
        // 延迟关闭popup，确保消息发送成功
        setTimeout(() => {
          window.close()
        }, 100)
      }
    } catch (error) {
      console.error(chrome.i18n.getMessage("startPickingFailed"), error)
      alert(chrome.i18n.getMessage("startPickingFailed"))
    }
  }

  // 停止拾取元素
  const stopElementPicking = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, { type: "STOP_PICKING" })
      }
    } catch (error) {
      console.error(chrome.i18n.getMessage("stopPickingFailed"), error)
    } finally {
      setIsPicking(false)
    }
  }

  return (
    <div
      style={{
        padding: 16,
        width: 320,
        minHeight: 200
      }}>
      <h4>
        {chrome.i18n.getMessage("popupTitle")}
      </h4>
      
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={isPicking ? stopElementPicking : startElementPicking}
          style={{
            padding: "10px 20px",
            backgroundColor: isPicking ? "#dc3545" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "bold",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => {
            if (isPicking) {
              e.currentTarget.style.backgroundColor = "#c82333"
            } else {
              e.currentTarget.style.backgroundColor = "#218838"
            }
          }}
          onMouseOut={(e) => {
            if (isPicking) {
              e.currentTarget.style.backgroundColor = "#dc3545"
            } else {
              e.currentTarget.style.backgroundColor = "#28a745"
            }
          }}
        >
          {isPicking ? chrome.i18n.getMessage("stopPicking") : chrome.i18n.getMessage("startPicking")}
        </button>
      </div>

      {isPicking && (
        <div style={{
          padding: 12,
          backgroundColor: "#d4edda",
          border: "1px solid #c3e6cb",
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 12,
          color: "#155724"
        }}>
          <strong>{chrome.i18n.getMessage("pickingModeActive")}</strong><br />
          {chrome.i18n.getMessage("pickingInstructions")}<br />
          <em>{chrome.i18n.getMessage("pickingTip1")}</em><br />
          <em>{chrome.i18n.getMessage("pickingTip2")}</em><br />
          <em>{chrome.i18n.getMessage("pickingTip3")}</em><br />
          <em>{chrome.i18n.getMessage("pickingTip4")}</em>
        </div>
      )}

      {/* 元素列表 */}
      <div style={{
        padding: 16,
        backgroundColor: "#f8f9fa",
        border: "1px solid #dee2e6",
        borderRadius: 6,
        marginBottom: 16
      }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#495057" }}>
          {chrome.i18n.getMessage("currentPageElements")} ({pickedElements.length})
        </h3>
        
        {pickedElements.length > 0 ? (
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {pickedElements.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: "8px 12px",
                  marginBottom: 8,
                  backgroundColor: "#ffffff",
                  border: "1px solid #dee2e6",
                  borderRadius: 4,
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ 
                        color: item.element.isHidden ? "#dc3545" : "#495057", 
                        fontSize: 13,
                        textDecoration: item.element.isHidden ? "line-through" : "none"
                      }}>
                        {item.element.tagName.toUpperCase()}
                        {item.element.id && ` #${item.element.id}`}
                        {item.element.className && ` .${item.element.className.split(' ')[0]}`}
                      </strong>
                      <span style={{ 
                        fontSize: 10, 
                        color: item.element.isHidden ? "#dc3545" : "#28a745",
                        fontWeight: "bold"
                      }}>
                        {item.element.isHidden ? chrome.i18n.getMessage("hidden") : chrome.i18n.getMessage("visible")}
                      </span>
                    </div>
                    {item.element.textContent && (
                      <div style={{ fontSize: 11, color: "#6c757d", marginTop: 2 }}>
                        {item.element.textContent.substring(0, 50)}
                        {item.element.textContent.length > 50 && "..."}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => toggleElementVisibility(item.element, index)}
                      style={{
                        padding: "2px 6px",
                        backgroundColor: item.element.isHidden ? "#28a745" : "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: 3,
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: "bold"
                      }}
                      title={item.element.isHidden ? chrome.i18n.getMessage("showElement") : chrome.i18n.getMessage("hideElement")}
                    >
                      {item.element.isHidden ? chrome.i18n.getMessage("show") : chrome.i18n.getMessage("hide")}
                    </button>
                    <button
                      onClick={() => deleteElement(item.element, index)}
                      style={{
                        padding: "2px 6px",
                        backgroundColor: "#6c757d",
                        color: "white",
                        border: "none",
                        borderRadius: 3,
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: "bold"
                      }}
                      title={chrome.i18n.getMessage("deleteElement")}
                    >
                      {chrome.i18n.getMessage("delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "#6c757d"
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
              🎯
            </div>
            <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
              {chrome.i18n.getMessage("noElementsPicked")}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              {chrome.i18n.getMessage("noElementsInstructions")}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default IndexPopup
