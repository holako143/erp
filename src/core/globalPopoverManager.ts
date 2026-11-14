/**
 * Global Popover, Dropdown & Modal State Management Engine
 * Ensures mutually exclusive popover states in the navigation bar (opening one automatically closes any other)
 * and provides deterministic click-outside and Escape dismissal evaluation across the application.
 */

export type GlobalPopoverId =
  | 'NONE'
  | 'NOTIFICATIONS'
  | 'PROFILE_SETTINGS'
  | 'COMMAND_PALETTE'
  | 'LAN_PORTAL'
  | 'QUICK_SEND'
  | 'CLOSE_SHIFT'
  | 'STANDALONE_KEYGEN';

export interface GlobalPopoverStateSnapshot {
  activePopover: GlobalPopoverId;
  isNotificationsOpen: boolean;
  isProfileMenuOpen: boolean;
  isCommandPaletteOpen: boolean;
  isLanPortalOpen: boolean;
  isQuickSendOpen: boolean;
  isCloseShiftOpen: boolean;
  isStandaloneKeygenOpen: boolean;
}

/**
 * Computes derived boolean flags for all popovers/modals from the single authoritative activePopover ID.
 * Guarantees that at most ONE popover/modal is open at any time.
 */
export function derivePopoverFlags(activePopover: GlobalPopoverId): GlobalPopoverStateSnapshot {
  return {
    activePopover,
    isNotificationsOpen: activePopover === 'NOTIFICATIONS',
    isProfileMenuOpen: activePopover === 'PROFILE_SETTINGS',
    isCommandPaletteOpen: activePopover === 'COMMAND_PALETTE',
    isLanPortalOpen: activePopover === 'LAN_PORTAL',
    isQuickSendOpen: activePopover === 'QUICK_SEND',
    isCloseShiftOpen: activePopover === 'CLOSE_SHIFT',
    isStandaloneKeygenOpen: activePopover === 'STANDALONE_KEYGEN',
  };
}

/**
 * Opens a specific popover/modal and automatically closes any other open popover/modal.
 */
export function openExclusivePopover(
  _current: GlobalPopoverId,
  target: Exclude<GlobalPopoverId, 'NONE'>
): GlobalPopoverId {
  return target;
}

/**
 * Toggles a specific popover/modal: closes it if already open, or opens it while closing any other open popover.
 */
export function toggleExclusivePopover(
  current: GlobalPopoverId,
  target: Exclude<GlobalPopoverId, 'NONE'>
): GlobalPopoverId {
  return current === target ? 'NONE' : target;
}

/**
 * Closes all open popovers/modals.
 */
export function closeAllPopovers(): GlobalPopoverId {
  return 'NONE';
}

export interface GlobalOutsideClickEvaluationInput {
  activePopover: GlobalPopoverId;
  clickedInsidePopoverContent: boolean;
  clickedTriggerPopoverId?: Exclude<GlobalPopoverId, 'NONE'> | null;
}

/**
 * Evaluates what the next GlobalPopoverId should be when a pointer/click event occurs anywhere in the app.
 * - If the click was on a popover trigger button, toggle/switch to that popover exclusively.
 * - If the click was inside the currently active popover's content container, keep it open.
 * - If the click was anywhere else (any empty area or outside the active popover), close it ('NONE').
 */
export function evaluateGlobalClickOutside(
  input: GlobalOutsideClickEvaluationInput
): {
  nextPopover: GlobalPopoverId;
  didClose: boolean;
  didSwitch: boolean;
} {
  const { activePopover, clickedInsidePopoverContent, clickedTriggerPopoverId } = input;

  if (clickedTriggerPopoverId) {
    const nextPopover = toggleExclusivePopover(activePopover, clickedTriggerPopoverId);
    return {
      nextPopover,
      didClose: nextPopover === 'NONE' && activePopover !== 'NONE',
      didSwitch: nextPopover !== 'NONE' && nextPopover !== activePopover,
    };
  }

  if (activePopover === 'NONE') {
    return { nextPopover: 'NONE', didClose: false, didSwitch: false };
  }

  if (clickedInsidePopoverContent) {
    return { nextPopover: activePopover, didClose: false, didSwitch: false };
  }

  return {
    nextPopover: 'NONE',
    didClose: true,
    didSwitch: false,
  };
}
