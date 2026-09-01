"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Check,
  Timer,
  Pause,
  Play,
  Plus,
  BellRing,
} from "lucide-react";
import type { Step } from "@/lib/types";
import { cx } from "@/lib/format";
import { formatDuration, formatClock } from "@/lib/units";
import { useStepTimers } from "@/hooks/useStepTimers";

/**
 * One step at a time, at a size you can read from across the kitchen.
 *
 * Asks the browser to keep the screen awake while it is open. Support is
 * uneven, so the promise is only made once the request has actually been
 * granted — a claim that the screen will stay on is worse than no claim if
 * the phone locks halfway through browning the onions.
 */
export function CookingMode({
  steps,
  recipeName,
  onClose,
}: {
  steps: Step[];
  recipeName: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false));
  const [wakeLockHeld, setWakeLockHeld] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const timers = useStepTimers();

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const timer = timers.view(index);

  /* Timers from other steps, so the sauce is still visible from step six. */
  const elsewhere = timers.all.filter((t) => t.stepIndex !== index);
  const ended = timers.all.filter((t) => t.finished);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Keep the screen awake, and re-acquire the lock if the tab is backgrounded.
  useEffect(() => {
    // Not in every browser, so it is feature-detected rather than assumed.
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await lock.release();
          return;
        }
        sentinel = lock;
        setWakeLockHeld(true);
      } catch {
        setWakeLockHeld(false);
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") acquire();
    }

    acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, steps.length]);

  // Keep focus inside the dialog.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const focusable = node!.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!step) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Cooking mode: ${recipeName}`}
      className="fixed inset-0 z-100 flex flex-col bg-forest-deep text-cream"
    >
      <header className="flex items-center justify-between gap-4 border-b border-cream/12 px-5 py-4">
        <div className="min-w-0">
          <p className="u-data text-cream/50">Cooking mode</p>
          <p className="truncate font-display text-lg">{recipeName}</p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-cream/10 px-5 text-[0.9375rem] font-semibold transition-colors hover:bg-cream/20"
        >
          <X aria-hidden="true" className="size-4" />
          Exit
        </button>
      </header>

      {/*
        A timer finishing is the one thing here worth interrupting for. The
        chime carries it for most people; this carries it for everyone else.
      */}
      <p role="alert" className="sr-only">
        {ended.length
          ? `${ended.map((t) => `Step ${t.stepIndex + 1}`).join(", ")} timer finished`
          : ""}
      </p>

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-8">
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-between gap-4">
            <p className="u-data text-saffron">
              Step {index + 1} of {steps.length}
            </p>
            {step.minutes ? (
              <p className="u-data text-cream/50">{formatDuration(step.minutes)}</p>
            ) : null}
          </div>

          <p className="mt-6 font-display text-[clamp(1.75rem,1.1rem+2.4vw,2.75rem)] leading-[1.2]">
            {step.body}
          </p>

          {step.tip ? (
            <div className="mt-8 flex gap-3 rounded-2xl bg-cream/8 p-5">
              <Lightbulb aria-hidden="true" className="size-5 shrink-0 text-saffron" />
              <p className="text-[1.0625rem] leading-relaxed text-cream/80">{step.tip}</p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setDone((current) => current.map((value, i) => (i === index ? !value : value)))
              }
              aria-pressed={done[index]}
              className={cx(
                "inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold transition-colors",
                done[index]
                  ? "bg-saffron text-forest-deep"
                  : "bg-cream/10 text-cream hover:bg-cream/20",
              )}
            >
              <Check aria-hidden="true" className="size-4" />
              {done[index] ? "Step done" : "Mark step done"}
            </button>

            {step.minutes && !timer ? (
              <button
                type="button"
                onClick={() => timers.start(index, step.minutes!)}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-cream/10 px-6 font-semibold transition-colors hover:bg-cream/20"
              >
                <Timer aria-hidden="true" className="size-4" />
                Start {formatDuration(step.minutes)} timer
              </button>
            ) : null}

            {timer ? (
              <div
                className={cx(
                  "inline-flex h-12 items-center gap-1 rounded-full pr-1 pl-5",
                  timer.finished ? "bg-tomato text-cream" : "bg-cream/10 text-cream",
                )}
              >
                <span
                  className="u-data mr-2 text-[1.125rem] tabular-nums"
                  // Announcing every tick would make the page unusable with a
                  // screen reader; the alert below covers the moment it matters.
                  aria-live="off"
                >
                  {timer.finished ? "Time is up" : formatClock(timer.remaining)}
                </span>

                {!timer.finished ? (
                  <button
                    type="button"
                    onClick={() =>
                      timer.paused ? timers.resume(index) : timers.pause(index)
                    }
                    aria-label={timer.paused ? "Resume timer" : "Pause timer"}
                    className="inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-cream/15"
                  >
                    {timer.paused ? (
                      <Play aria-hidden="true" className="size-4" />
                    ) : (
                      <Pause aria-hidden="true" className="size-4" />
                    )}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => timers.extend(index)}
                  aria-label="Add a minute to the timer"
                  className={cx(
                    "inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold transition-colors",
                    timer.finished ? "hover:bg-cream/20" : "hover:bg-cream/15",
                  )}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  1 min
                </button>

                <button
                  type="button"
                  onClick={() => timers.clear(index)}
                  aria-label={timer.finished ? "Dismiss timer" : "Cancel timer"}
                  className="inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-cream/15"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            ) : null}
          </div>

          {/*
            Sound needs a user gesture to start, and may be refused outright.
            The promise is only made once a timer has actually been able to
            build its audio, in the same spirit as the wake lock note below.
          */}
          {timer && !timer.finished && !timers.canSound ? (
            <p className="u-data-sm mt-3 text-cream/40">
              Sound is unavailable — this timer will show, not ring.
            </p>
          ) : null}
        </div>
      </div>

      <footer className="border-t border-cream/12 px-5 py-4">
        {/*
          Timers you started on other steps. Without this you have to remember
          which step the rice was on and page back to find out how long is
          left, which is exactly when rice boils over.
        */}
        {elsewhere.length ? (
          <ul className="mx-auto mb-3 flex max-w-3xl flex-wrap gap-2">
            {elsewhere.map((other) => (
              <li key={other.stepIndex}>
                <button
                  type="button"
                  onClick={() => setIndex(other.stepIndex)}
                  className={cx(
                    "inline-flex h-9 items-center gap-2 rounded-full px-4 transition-colors",
                    other.finished
                      ? "bg-tomato text-cream hover:bg-tomato/85"
                      : "bg-cream/10 text-cream/80 hover:bg-cream/20",
                  )}
                >
                  {other.finished ? (
                    <BellRing aria-hidden="true" className="size-3.5" />
                  ) : (
                    <Timer aria-hidden="true" className="size-3.5" />
                  )}
                  <span className="u-data-sm tabular-nums">
                    Step {other.stepIndex + 1} ·{" "}
                    {other.finished
                      ? "done"
                      : `${formatClock(other.remaining)}${other.paused ? " paused" : ""}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div
          className="mx-auto flex max-w-3xl items-center gap-4"
          role="group"
          aria-label="Step navigation"
        >
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-cream/10 px-5 font-semibold transition-colors hover:bg-cream/20 disabled:opacity-35 disabled:hover:bg-cream/10"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Back
          </button>

          <div
            aria-hidden="true"
            className="flex flex-1 items-center gap-1.5"
            title={`Step ${index + 1} of ${steps.length}`}
          >
            {steps.map((_, i) => (
              <span
                key={i}
                className={cx(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= index ? "bg-saffron" : "bg-cream/20",
                )}
              />
            ))}
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-saffron px-6 font-semibold text-forest-deep transition-colors hover:bg-cream"
            >
              Finish
              <Check aria-hidden="true" className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(i + 1, steps.length - 1))}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-cream px-6 font-semibold text-forest-deep transition-colors hover:bg-saffron"
            >
              Next
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>

        <p className="mx-auto mt-3 max-w-3xl text-center u-data-sm text-cream/40">
          {wakeLockHeld
            ? "Your screen will stay awake / use ← and → to move between steps"
            : "Use ← and → to move between steps"}
        </p>
      </footer>
    </div>
  );
}
