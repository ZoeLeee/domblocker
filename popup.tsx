import { useState, useEffect } from "react"

interface ElementInfo {
  tagName: string
  id: string | null
  className: string | null
  textContent: string | null
  selector: string
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
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
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
          {isPicking ? "🛑 停止拾取" : "🎯 开始拾取元素"}
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
          <em>💡 按ESC键可取消拾取模式</em>
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
            
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: "#6c757d" }}>CSS选择器:</strong>
            </div>
            <code style={{ 
              backgroundColor: "#e9ecef", 
              padding: "8px", 
              borderRadius: 4,
              display: "block",
              fontSize: 11,
              color: "#495057",
              wordBreak: "break-all",
              border: "1px solid #ced4da"
            }}>
              {pickedElement.selector}
            </code>
          </div>
        </div>
      )}

      <div style={{ 
        fontSize: 11, 
        color: "#6c757d", 
        textAlign: "center",
        marginTop: 16,
        paddingTop: 12,
        borderTop: "1px solid #dee2e6"
      }}>
        <div style={{ marginBottom: 4 }}>
          <a href="https://github.com/ZoeLeee/DomOutline" target="_blank" style={{ color: "#007bff", textDecoration: "none" }}>
            📚 DomOutline 库
          </a>
          {" • "}
          <a href="https://docs.plasmo.com" target="_blank" style={{ color: "#007bff", textDecoration: "none" }}>
            Plasmo 文档
          </a>
        </div>
        <div style={{ fontSize: 10 }}>
          基于 DomOutline 构建的元素拾取器
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
