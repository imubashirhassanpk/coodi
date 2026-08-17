import type { WheelEvent } from "react";

/**
 * Keeps wheel scrolling reliable inside nested Tauri/WebView scrollports.
 * Some Windows WebView2 compositions deliver wheel events without applying the
 * browser's default scroll action when several overflow ancestors are present.
 */
export function handleBoundedWheelScroll(event: WheelEvent<HTMLElement>) {
  if (event.deltaY === 0) return;

  const element = event.currentTarget;
  const maxScrollTop = element.scrollHeight - element.clientHeight;
  if (maxScrollTop <= 0) return;

  const nextScrollTop = Math.max(0, Math.min(maxScrollTop, element.scrollTop + event.deltaY));
  if (nextScrollTop === element.scrollTop) return;

  event.preventDefault();
  element.scrollTop = nextScrollTop;
}
