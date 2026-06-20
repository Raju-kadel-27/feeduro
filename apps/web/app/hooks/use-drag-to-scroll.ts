import { useRef } from "react";

export function useDragToScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 });

  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[role="button"]')) return;
    drag.current = { active: true, startX: e.clientX, scrollLeft: ref.current?.scrollLeft ?? 0 };
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!drag.current.active || !ref.current) return;
    e.preventDefault();
    ref.current.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.startX);
  }

  function onMouseUp() {
    drag.current.active = false;
  }

  return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp };
}
