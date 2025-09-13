import type { PlasmoCSConfig } from "plasmo"
import theRoom, { type TheRoomOptions } from "dom-outline"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

// 元素拾取状态
let isPicking = false

// 获取元素的CSS选择器
function getElementSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`
  }
  
  if (element.className) {
    const classes = element.className.trim().split(/\s+/).join('.')
    return `.${classes}`
  }
  
  const path: string[] = []
  let current = element
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()
    
    if (current.id) {
      selector += `#${current.id}`
      path.unshift(selector)
      break
    }
    
    if (current.className) {
      const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.')
      selector += `.${classes}`
    }
    
    // 添加nth-child选择器以确保唯一性
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children)
      const index = siblings.indexOf(current)
      if (index > 0) {
        selector += `:nth-child(${index + 1})`
      }
    }
    
    path.unshift(selector)
    current = current.parentElement as HTMLElement
  }
  
  return path.join(' > ')
}

// 开始拾取元素
function startPicking() {
  if (isPicking) return
  
  isPicking = true
  
  const options: TheRoomOptions = {
    createInspector: true,
    blockRedirection: true,
    excludes: ['[data-plasmo-highlight]', 'script', 'style', 'head'],
    click: (target, event, originTarget, depth) => {
      if (!target) return
      
      event.preventDefault()
      event.stopPropagation()
      
      const selector = getElementSelector(target)
      const elementInfo = {
        tagName: target.tagName.toLowerCase(),
        id: target.id || null,
        className: target.className || null,
        textContent: target.textContent?.trim().substring(0, 100) || null,
        selector,
        attributes: Array.from(target.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value
          return acc
        }, {} as Record<string, string>)
      }
      
      // 发送消息给popup
      chrome.runtime.sendMessage({
        type: "ELEMENT_PICKED",
        element: elementInfo
      })
      
      stopPicking()
    },
    keydown: (target, event) => {
      if ((event as KeyboardEvent).key === "Escape") {
        stopPicking()
      }
    }
  }
  
  theRoom.start(options)
}

// 停止拾取元素
function stopPicking() {
  if (!isPicking) return
  
  isPicking = false
  theRoom.stop(true) // 重置inspector样式
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_PICKING") {
    startPicking()
    sendResponse({ success: true })
  } else if (message.type === "STOP_PICKING") {
    stopPicking()
    sendResponse({ success: true })
  }
  
  return true
})
