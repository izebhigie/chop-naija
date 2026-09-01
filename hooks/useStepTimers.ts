"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Timers for cooking steps.
 *
 * Every timer stores the wall-clock moment it ends rather than a count that
 * ticks down. Browsers throttle intervals in background tabs — sometimes to
 * once a minute — so a decrementing counter loses minutes while you are
 * elsewhere and comes back confidently wrong. Reading the clock means a late
 * tick only delays the *display*, never the result.
 *
 * Timers are keyed by step, run in parallel, and keep running while you move
 * around the recipe: starting the sauce and then prepping the garnish is the
 * normal way to cook.
 */

export interface StepTimer {
  stepIndex: number;
  totalSeconds: number;
  /** When it ends, in epoch ms. Null while paused. */
  endsAt: number | null;
  /** Seconds frozen on the clock while paused. */
  pausedRemaining: number | null;
}

export interface TimerView extends StepTimer {
  remaining: number;
  running: boolean;
  paused: boolean;
  finished: boolean;
}

function remainingSeconds(timer: StepTimer, now: number): number {
  if (timer.pausedRemaining !== null) return timer.pausedRemaining;
  if (timer.endsAt === null) return 0;
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export function useStepTimers() {
  const [timers, setTimers] = useState<Record<number, StepTimer>>({});
  const [now, setNow] = useState(() => Date.now());
  const [canSound, setCanSound] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const rungRef = useRef<Set<number>>(new Set());
  const timersRef = useRef(timers);

  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  /**
   * Whether a timer has finished is read from the clock, never stored. Storing
   * it would mean writing state from inside the tick, and the answer is
   * already implied by the deadline.
   */
  const ticking = Object.values(timers).some((timer) => timer.pausedRemaining === null);

  /* A tab coming back to the foreground should show the truth immediately. */
  useEffect(() => {
    function sync() {
      if (document.visibilityState === "visible") setNow(Date.now());
    }
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  /**
   * Three rising notes, built from an oscillator rather than an audio file so
   * nothing has to download before the first timer can ring.
   */
  const ring = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);

    const context = audioRef.current;
    if (!context) return;
    if (context.state === "suspended") void context.resume();

    const start = context.currentTime;
    [0, 0.28, 0.56].forEach((offset, i) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 660 + i * 220;
      // Fade each note in and out; a square-edged stop clicks.
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.28, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.24);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.26);
    });
  }, []);

  /*
   * One interval drives every timer. It advances the clock and rings anything
   * that crossed zero on this tick — each step rings once, tracked in a ref so
   * a re-render cannot repeat it.
   */
  useEffect(() => {
    if (!ticking) return;

    const id = window.setInterval(() => {
      const stamp = Date.now();
      setNow(stamp);

      for (const timer of Object.values(timersRef.current)) {
        if (timer.pausedRemaining !== null || timer.endsAt === null) continue;
        if (timer.endsAt <= stamp && !rungRef.current.has(timer.stepIndex)) {
          rungRef.current.add(timer.stepIndex);
          ring();
        }
      }
    }, 500);

    return () => window.clearInterval(id);
  }, [ticking, ring]);

  const start = useCallback((stepIndex: number, minutes: number) => {
    /*
     * The audio context is built inside the click that starts the timer.
     * Mobile browsers only allow audio from a user gesture, so creating it
     * anywhere else leaves a timer that can count but never ring.
     */
    if (!audioRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        try {
          audioRef.current = new Ctor();
          setCanSound(true);
        } catch {
          setCanSound(false);
        }
      }
    }
    void audioRef.current?.resume();

    const totalSeconds = Math.round(minutes * 60);
    const startedAt = Date.now();
    rungRef.current.delete(stepIndex);
    setNow(startedAt);
    setTimers((current) => ({
      ...current,
      [stepIndex]: {
        stepIndex,
        totalSeconds,
        endsAt: startedAt + totalSeconds * 1000,
        pausedRemaining: null,
      },
    }));
  }, []);

  const pause = useCallback((stepIndex: number) => {
    setTimers((current) => {
      const timer = current[stepIndex];
      if (!timer || timer.pausedRemaining !== null) return current;
      return {
        ...current,
        [stepIndex]: {
          ...timer,
          pausedRemaining: remainingSeconds(timer, Date.now()),
          endsAt: null,
        },
      };
    });
  }, []);

  const resume = useCallback((stepIndex: number) => {
    setTimers((current) => {
      const timer = current[stepIndex];
      if (!timer || timer.pausedRemaining === null) return current;
      return {
        ...current,
        [stepIndex]: {
          ...timer,
          endsAt: Date.now() + timer.pausedRemaining * 1000,
          pausedRemaining: null,
        },
      };
    });
    setNow(Date.now());
  }, []);

  /** Another minute — onions are never quite done on schedule. */
  const extend = useCallback((stepIndex: number, seconds = 60) => {
    rungRef.current.delete(stepIndex);
    setTimers((current) => {
      const timer = current[stepIndex];
      if (!timer) return current;
      // A timer that has already run out restarts from now; one still
      // counting just gets longer.
      const stamp = Date.now();
      const base = timer.endsAt === null || timer.endsAt <= stamp ? stamp : timer.endsAt;
      return {
        ...current,
        [stepIndex]: {
          ...timer,
          totalSeconds: timer.totalSeconds + seconds,
          endsAt: timer.pausedRemaining === null ? base + seconds * 1000 : null,
          pausedRemaining:
            timer.pausedRemaining === null ? null : timer.pausedRemaining + seconds,
        },
      };
    });
    setNow(Date.now());
  }, []);

  const clear = useCallback((stepIndex: number) => {
    rungRef.current.delete(stepIndex);
    setTimers((current) => {
      const next = { ...current };
      delete next[stepIndex];
      return next;
    });
  }, []);

  /* Release the audio device when cooking mode closes. */
  useEffect(() => {
    return () => {
      void audioRef.current?.close();
      audioRef.current = null;
    };
  }, []);

  const view = useCallback(
    (stepIndex: number): TimerView | null => {
      const timer = timers[stepIndex];
      if (!timer) return null;
      const finished =
        timer.pausedRemaining === null && timer.endsAt !== null && timer.endsAt <= now;

      return {
        ...timer,
        remaining: remainingSeconds(timer, now),
        running: timer.pausedRemaining === null && !finished,
        paused: timer.pausedRemaining !== null,
        finished,
      };
    },
    [timers, now],
  );

  const all = Object.keys(timers)
    .map(Number)
    .sort((a, b) => a - b)
    .map((index) => view(index))
    .filter((timer): timer is TimerView => timer !== null);

  return { all, view, start, pause, resume, extend, clear, canSound };
}
