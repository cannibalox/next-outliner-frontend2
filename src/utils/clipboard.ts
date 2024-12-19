export function copyAsHtml(html: string) {
  // var container = document.createElement("div");
  // container.innerHTML = html;

  // container.style.position = "fixed";
  // container.style.pointerEvents = "none";
  // container.style.opacity = "0%";

  // var activeSheets = Array.prototype.slice.call(document.styleSheets).filter(function (sheet) {
  //   return !sheet.disabled;
  // });

  // document.body.appendChild(container);
  // window.getSelection()?.removeAllRanges();
  // var range = document.createRange();
  // range.selectNode(container);
  // window.getSelection()?.addRange(range);
  // document.execCommand("copy");
  // for (var i = 0; i < activeSheets.length; i++) activeSheets[i].disabled = true;
  // document.execCommand("copy");
  // for (var i = 0; i < activeSheets.length; i++) activeSheets[i].disabled = false;
  // document.body.removeChild(container);
  const content = new Blob([html], { type: "text/html" });
  const data = [new ClipboardItem({ [content.type]: content })];
  navigator.clipboard.write(data);
}

export function copyAsPlainText(text: string) {
  navigator.clipboard.writeText(text);
}
