'use client';

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
} from 'react';

/* ------------------------------------------------------------------ */
/* Dialog (root)                                                       */
/* ------------------------------------------------------------------ */

interface DialogProps extends HTMLAttributes<HTMLDialogElement> {
  open: boolean;
  onClose: () => void;
}

const Dialog = forwardRef<HTMLDialogElement, DialogProps>(
  ({ open, onClose, className = '', children, ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLDialogElement>(null);
    const dialogRef =
      (forwardedRef as React.RefObject<HTMLDialogElement>) ?? internalRef;

    useEffect(() => {
      const el = dialogRef.current;
      if (!el) return;

      if (open && !el.open) {
        el.showModal();
      } else if (!open && el.open) {
        el.close();
      }
    }, [open, dialogRef]);

    // Close on backdrop click
    const handleClick = useCallback(
      (e: MouseEvent<HTMLDialogElement>) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      },
      [onClose, dialogRef]
    );

    return (
      <dialog
        ref={dialogRef}
        onClose={onClose}
        onClick={handleClick}
        className={`backdrop:bg-black/60 backdrop:backdrop-blur-sm
          bg-transparent p-0 m-auto max-w-lg w-full
          open:animate-in open:fade-in-0 open:zoom-in-95
          ${className}`}
        {...props}
      >
        {children}
      </dialog>
    );
  }
);
Dialog.displayName = 'Dialog';

/* ------------------------------------------------------------------ */
/* DialogContent                                                       */
/* ------------------------------------------------------------------ */

const DialogContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`glass rounded-xl shadow-xl ${className}`}
    {...props}
  />
));
DialogContent.displayName = 'DialogContent';

/* ------------------------------------------------------------------ */
/* DialogHeader                                                        */
/* ------------------------------------------------------------------ */

const DialogHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center justify-between px-6 py-4 border-b border-white/10 ${className}`}
    {...props}
  />
));
DialogHeader.displayName = 'DialogHeader';

/* ------------------------------------------------------------------ */
/* DialogTitle                                                         */
/* ------------------------------------------------------------------ */

const DialogTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className = '', ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-base font-semibold text-text-primary ${className}`}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

/* ------------------------------------------------------------------ */
/* DialogClose                                                         */
/* ------------------------------------------------------------------ */

interface DialogCloseProps extends HTMLAttributes<HTMLButtonElement> {
  onClose: () => void;
}

function DialogClose({ onClose, className = '', ...props }: DialogCloseProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close dialog"
      className={`text-text-muted hover:text-text-primary transition-colors cursor-pointer ${className}`}
      {...props}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M5 5l10 10M15 5L5 15" />
      </svg>
    </button>
  );
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose };
export type { DialogProps };
