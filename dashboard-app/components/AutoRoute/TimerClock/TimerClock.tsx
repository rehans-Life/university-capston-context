import { useEffect, useState } from 'react';

interface TimerClockProps {
  isRunning: boolean;
}

export function TimerClock({ isRunning }: TimerClockProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isRunning) {
      // Only set startTime if not already set
      if (!startTime) {
        setStartTime(Date.now());
      }

      interval = setInterval(() => {
        if (startTime) {
          const diff = Date.now() - startTime;
          const minutes = Math.floor(diff / 60000)
            .toString()
            .padStart(2, '0');
          const seconds = Math.floor((diff % 60000) / 1000)
            .toString()
            .padStart(2, '0');

          setElapsed(`${minutes}:${seconds}`);
        }
      }, 1000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isRunning, startTime]);

  return <span>{elapsed}</span>;
}
