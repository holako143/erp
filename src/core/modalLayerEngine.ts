import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ModalLayerEntry {
  id: string;
  zIndex: number;
  baseZ: number;
}

export interface ModalStackController {
  push: (id: string, minBaseZ?: number, silent?: boolean) => number;
  pop: (id: string, silent?: boolean) => void;
  getZIndex: (id: string) => number | undefined;
  getTopId: () => string | null;
  isTop: (id: string) => boolean;
  getStack: () => ModalLayerEntry[];
  subscribe: (listener: () => void) => () => void;
}

/**
 * Pure headless modal z-index stack controller.
 * Guarantees every newly opened modal/dialog always receives a strictly higher
 * z-index than any currently active modal, regardless of DOM declaration order.
 */
export function createModalStackController(defaultBaseZ = 60): ModalStackController {
  let stack: ModalLayerEntry[] = [];
  let peakZ = defaultBaseZ;
  let hasPendingNotify = false;
  const listeners = new Set<() => void>();

  const notify = () => {
    hasPendingNotify = false;
    listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore listener errors
      }
    });
  };

  const push = (id: string, minBaseZ = defaultBaseZ, silent = false): number => {
    const existing = stack.find((entry) => entry.id === id);
    const currentTop = stack[stack.length - 1];
    if (existing && currentTop?.id === id) {
      if (!silent && hasPendingNotify) {
        notify();
      }
      return existing.zIndex;
    }

    // Remove older position if re-promoting
    if (existing) {
      stack = stack.filter((entry) => entry.id !== id);
    }

    const highestActive = stack.reduce((max, item) => Math.max(max, item.zIndex), defaultBaseZ - 1);
    const nextZ = Math.max(minBaseZ, highestActive + 1, peakZ + 1);
    peakZ = nextZ;
    stack = [...stack, { id, zIndex: nextZ, baseZ: minBaseZ }];
    if (silent) {
      hasPendingNotify = true;
    } else {
      notify();
    }
    return nextZ;
  };

  const pop = (id: string, silent = false): void => {
    const hadEntry = stack.some((entry) => entry.id === id);
    if (!hadEntry) {
      if (!silent && hasPendingNotify) {
        notify();
      }
      return;
    }
    stack = stack.filter((entry) => entry.id !== id);
    if (stack.length === 0) {
      peakZ = defaultBaseZ;
    } else {
      peakZ = stack.reduce((max, item) => Math.max(max, item.zIndex), defaultBaseZ);
    }
    if (silent) {
      hasPendingNotify = true;
    } else {
      notify();
    }
  };

  const getZIndex = (id: string): number | undefined => {
    return stack.find((entry) => entry.id === id)?.zIndex;
  };

  const getTopId = (): string | null => {
    return stack.length > 0 ? stack[stack.length - 1].id : null;
  };

  const isTop = (id: string): boolean => {
    return getTopId() === id;
  };

  const getStack = (): ModalLayerEntry[] => [...stack];

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    push,
    pop,
    getZIndex,
    getTopId,
    isTop,
    getStack,
    subscribe,
  };
}

export const globalModalStack = createModalStackController(60);

/**
 * React hook for modals & dialogs.
 * Automatically assigns a dynamic zIndex strictly higher than all previously open modals
 * on the first frame `isOpen` is true, and releases it when closed or unmounted.
 */
export function useModalLayer(
  isOpen: boolean,
  minBaseZ = 60
): { zIndex: number; isTopLayer: boolean; layerId: string } {
  const layerId = useId();
  const [, setVersion] = useState(0);
  const wasOpenRef = useRef(false);

  // Allocate silently on open transition so the very first render already has the top z-index
  // without triggering cross-component setState during render.
  if (isOpen && !wasOpenRef.current) {
    globalModalStack.push(layerId, minBaseZ, true);
    wasOpenRef.current = true;
  } else if (!isOpen && wasOpenRef.current) {
    globalModalStack.pop(layerId, true);
    wasOpenRef.current = false;
  }

  useEffect(() => {
    if (isOpen) {
      globalModalStack.push(layerId, minBaseZ, false);
      wasOpenRef.current = true;
    } else {
      globalModalStack.pop(layerId, false);
      wasOpenRef.current = false;
    }
    const unsub = globalModalStack.subscribe(() => {
      setVersion((v) => v + 1);
    });
    return () => {
      unsub();
      globalModalStack.pop(layerId, false);
      wasOpenRef.current = false;
    };
  }, [isOpen, layerId, minBaseZ]);

  const zIndex = globalModalStack.getZIndex(layerId) ?? minBaseZ;
  const isTopLayer = isOpen ? globalModalStack.isTop(layerId) : false;

  return { zIndex, isTopLayer, layerId };
}

/**
 * Safely renders modal markup into document.body via React Portal
 * so parent overflow-hidden / backdrop-blur / transform containers never trap the modal underneath.
 */
export function renderModalPortal(children: React.ReactNode): React.ReactNode {
  if (typeof document === 'undefined' || !document.body) {
    return children;
  }
  return createPortal(children, document.body);
}
