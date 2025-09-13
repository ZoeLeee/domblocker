import type { PlasmoCSConfig } from "plasmo"
import theRoom, { type TheRoomOptions } from "dom-outline"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

// 元素拾取状态
let isPicking = false

// 检查选择器是否唯一
function isSelectorUnique(selector: string): boolean {
  try {
    const elements = document.querySelectorAll(selector)
    return elements.length === 1
  } catch {
    return false
  }
}

// 获取元素的XPath
function getElementXPath(element: HTMLElement): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`
  }
  
  const path: string[] = []
  let current = element
  
  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase()
    
    if (current.id) {
      selector += `[@id="${current.id}"]`
      path.unshift(selector)
      break
    }
    
    // 计算在同级元素中的位置
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current.tagName
      )
      const index = siblings.indexOf(current)
      if (siblings.length > 1) {
        selector += `[${index + 1}]`
      }
    }
    
    path.unshift(selector)
    current = current.parentElement as HTMLElement
  }
  
  return '/' + path.join('/')
}

// 获取元素的CSS选择器（改进版本）
function getElementSelector(element: HTMLElement): string {
  // 尝试不同的选择器策略，按优先级排序
  
  // 1. 如果有ID，直接使用ID选择器
  if (element.id && isSelectorUnique(`#${element.id}`)) {
    return `#${element.id}`
  }
  
  // 2. 尝试组合ID和类名
  if (element.id && element.className) {
    const classes = element.className.trim().split(/\s+/).join('.')
    const selector = `#${element.id}.${classes}`
    if (isSelectorUnique(selector)) {
      return selector
    }
  }
  
  // 3. 尝试属性选择器
  if (element.id) {
    const selector = `[id="${element.id}"]`
    if (isSelectorUnique(selector)) {
      return selector
    }
  }
  
  // 4. 使用标签名和类名的组合
  if (element.className) {
    const tagName = element.tagName.toLowerCase()
    const classes = element.className.trim().split(/\s+/).join('.')
    const selector = `${tagName}.${classes}`
    if (isSelectorUnique(selector)) {
      return selector
    }
  }
  
  // 5. 构建完整的路径选择器
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
      if (siblings.length > 1) {
        selector += `:nth-child(${index + 1})`
      }
    }
    
    path.unshift(selector)
    current = current.parentElement as HTMLElement
  }
  
  return path.join(' > ')
}

// 获取多种选择器格式
function getElementSelectors(element: HTMLElement) {
  return {
    css: getElementSelector(element),
    xpath: getElementXPath(element),
    // 添加其他选择器格式
    tagClass: element.className ? `${element.tagName.toLowerCase()}.${element.className.trim().split(/\s+/).join('.')}` : null,
    attribute: element.id ? `[id="${element.id}"]` : null
  }
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
      
      const selectors = getElementSelectors(target)
      console.log("🚀 ~ startPicking ~ selectors:", selectors)
      const elementInfo = {
        tagName: target.tagName.toLowerCase(),
        id: target.id || null,
        className: target.className || null,
        textContent: target.textContent?.trim().substring(0, 100) || null,
        selectors, // 包含多种选择器格式
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
