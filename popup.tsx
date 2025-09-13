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
}

function IndexPopup() {
  const [data, setData] = useState("")
  const [isPicking, setIsPicking] = useState(false)
  const [pickedElement, setPickedElement] = useState<ElementInfo | null>(null)

  // 监听来自content script的消息
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === "ELEMENT_PICKED") {
        setPickedElement(message.element)
        setIsPicking(false)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    
    // 监听storage变化
    const handleStorageChange = (changes: any, namespace: string) => {
      if (namespace === 'local' && changes.lastPickedElement) {
        setPickedElement(changes.lastPickedElement.newValue)
        setIsPicking(false)
      }
    }
    
    chrome.storage.onChanged.addListener(handleStorageChange)
    
    // 检查storage中是否有新的拾取元素
    const checkStorage = async () => {
      try {
        const result = await chrome.storage.local.get(['lastPickedElement', 'pickedAt'])
        if (result.lastPickedElement && result.pickedAt) {
          // 检查是否是最近10秒内拾取的元素
          const now = Date.now()
          if (now - result.pickedAt < 10000) {
            setPickedElement(result.lastPickedElement)
            setIsPicking(false)
          }
        }
      } catch (error) {
        console.error("读取storage失败:", error)
      }
    }
    
    checkStorage()
    
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
        console.error("清除指示器失败:", error)
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
        setPickedElement(null)
        
        // 延迟关闭popup，确保消息发送成功
        setTimeout(() => {
          window.close()
        }, 100)
      }
    } catch (error) {
      console.error("开始拾取元素失败:", error)
      alert("无法在当前页面拾取元素，请确保页面已加载完成")
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
      console.error("停止拾取元素失败:", error)
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
      <h2>
        DOM元素拾取器
        <span style={{ fontSize: 12, fontWeight: "normal", color: "#6c757d" }}>
          (基于 DomOutline)
        </span>
      </h2>
      
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
          {isPicking ? "🛑 停止拾取" : "🎯 开始拾取元素 (将关闭此窗口)"}
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
          <strong>🎯 拾取模式已激活</strong><br />
          将鼠标悬停在页面上要拾取的元素上，元素会被高亮显示。点击元素完成拾取。<br />
          <em>💡 按ESC键可取消拾取模式</em><br />
          <em>📋 点击"开始拾取元素"后此窗口会自动关闭，方便页面操作</em><br />
          <em>🔔 拾取完成后会收到系统通知，点击扩展图标查看详细结果</em>
        </div>
      )}

      {pickedElement && (
        <div style={{
          padding: 16,
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: 6,
          marginBottom: 16
        }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#495057" }}>
            📋 拾取的元素信息
          </h3>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: "#6c757d" }}>标签:</strong> 
              <code style={{ 
                backgroundColor: "#e9ecef", 
                padding: "2px 6px", 
                borderRadius: 3,
                marginLeft: 6,
                fontSize: 12,
                color: "#495057"
              }}>
                {pickedElement.tagName}
              </code>
            </div>
            
            {pickedElement.id && (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#6c757d" }}>ID:</strong> 
                <code style={{ 
                  backgroundColor: "#e9ecef", 
                  padding: "2px 6px", 
                  borderRadius: 3,
                  marginLeft: 6,
                  fontSize: 12,
                  color: "#495057"
                }}>
                  {pickedElement.id}
                </code>
              </div>
            )}
            
            {pickedElement.className && (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#6c757d" }}>类名:</strong> 
                <code style={{ 
                  backgroundColor: "#e9ecef", 
                  padding: "2px 6px", 
                  borderRadius: 3,
                  marginLeft: 6,
                  fontSize: 12,
                  color: "#495057"
                }}>
                  {pickedElement.className}
                </code>
              </div>
            )}
            
            {pickedElement.textContent && (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#6c757d" }}>文本:</strong> 
                <span style={{ marginLeft: 6, fontStyle: "italic", color: "#495057" }}>
                  {pickedElement.textContent}
                </span>
              </div>
            )}
            
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: "#6c757d" }}>选择器:</strong>
            </div>
            
            {/* CSS选择器 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 4 }}>
                <strong>CSS选择器:</strong>
              </div>
              <code style={{ 
                backgroundColor: "#e9ecef", 
                padding: "8px", 
                borderRadius: 4,
                display: "block",
                fontSize: 11,
                color: "#495057",
                wordBreak: "break-all",
                border: "1px solid #ced4da",
                fontFamily: "Monaco, Consolas, 'Courier New', monospace"
              }}>
                {pickedElement.selectors.css}
              </code>
            </div>
            
            {/* XPath选择器 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 4 }}>
                <strong>XPath选择器:</strong>
              </div>
              <code style={{ 
                backgroundColor: "#fff3cd", 
                padding: "8px", 
                borderRadius: 4,
                display: "block",
                fontSize: 11,
                color: "#856404",
                wordBreak: "break-all",
                border: "1px solid #ffeaa7",
                fontFamily: "Monaco, Consolas, 'Courier New', monospace"
              }}>
                {pickedElement.selectors.xpath}
              </code>
            </div>
            
            {/* 其他选择器格式 */}
            {(pickedElement.selectors.tagClass || pickedElement.selectors.attribute) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 4 }}>
                  <strong>其他格式:</strong>
                </div>
                {pickedElement.selectors.tagClass && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "#6c757d" }}>标签+类名:</span>
                    <code style={{ 
                      backgroundColor: "#f8f9fa", 
                      padding: "4px 6px", 
                      borderRadius: 3,
                      fontSize: 10,
                      color: "#495057",
                      marginLeft: 6,
                      fontFamily: "Monaco, Consolas, 'Courier New', monospace"
                    }}>
                      {pickedElement.selectors.tagClass}
                    </code>
                  </div>
                )}
                {pickedElement.selectors.attribute && (
                  <div>
                    <span style={{ fontSize: 10, color: "#6c757d" }}>属性选择器:</span>
                    <code style={{ 
                      backgroundColor: "#f8f9fa", 
                      padding: "4px 6px", 
                      borderRadius: 3,
                      fontSize: 10,
                      color: "#495057",
                      marginLeft: 6,
                      fontFamily: "Monaco, Consolas, 'Courier New', monospace"
                    }}>
                      {pickedElement.selectors.attribute}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default IndexPopup
