import { useState, useEffect } from 'react';

export const useTimer = (isRunning: boolean) => {
  const [time, setTime] = useState(0);
  
  useEffect(() => {
    let interval: number;
    if (isRunning) {
      interval = window.setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      setTime(0);
    }
    return () => clearInterval(interval);
  }, [isRunning]);
  
  return time;
};

export const formatTimestamp = (date: Date): string => {
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};
