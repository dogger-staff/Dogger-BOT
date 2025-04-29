Element.prototype._attachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function() {
  return this._attachShadow({ mode: 'open' });
};

document.querySelectorAll('*').forEach(element => {
  if (element.shadowRoot && element.shadowRoot.mode === 'closed') {
    const shadowRoot = element._attachShadow({ mode: 'open' });
    Array.from(element.shadowRoot.children).forEach(child => {
      shadowRoot.appendChild(child.cloneNode(true));
    });
  }
});