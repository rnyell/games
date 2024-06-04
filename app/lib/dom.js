export const { log, dir } = console;

export function queryDOMElement(selector) {
  return document.querySelector(selector);
}

export function getDOMElementById(id) {
  return document.getElementById(id);
}

export function createDOMElement(tag) {
  return document.createElement(tag);
}

export function addEventListener(element, eventType, callback) {
  element.addEventListener(eventType, callback)
}
