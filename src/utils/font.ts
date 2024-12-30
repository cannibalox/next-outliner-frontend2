export const checkFontAvailability = (formNames: string[]) => {
  const el = document.createElement("span");
  el.innerHTML = Array(100).join("wi");
  el.style.cssText = [
    "position: absolute",
    "width: auto",
    "font-size: 128px",
    "left: -9999px",
  ].join(" !important;");

  const getWidth = (fontFamily: string) => {
    el.style.fontFamily = fontFamily;
    const width = el.clientWidth;
    return width;
  };

  document.body.appendChild(el);

  const monoWidth = getWidth("monospace");
  const sansWidth = getWidth("sans-serif");
  const serifWidth = getWidth("serif");

  const result = formNames.map((fontName) => {
    return (
      monoWidth !== getWidth(fontName + " ,monospace") ||
      sansWidth !== getWidth(fontName + " ,sans-serif") ||
      serifWidth !== getWidth(fontName + " ,serif")
    );
  });

  document.body.removeChild(el);

  return result;
};
