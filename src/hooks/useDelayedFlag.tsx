import { useEffect, useState } from "react";

export default function useDelayedFlag(delay: number) {
  const [waiting, setWaiting] = useState(false);
  const [wantsWait, setWantsWait] = useState(false);

  useEffect(() => {
    if (!wantsWait) {
      return;
    }

    setWaiting(true);

    const timer = setTimeout(() => {
      setWaiting(false);
      setWantsWait(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [wantsWait]);

  function trigger() {
    setWantsWait(true);
  }

  return { waiting, trigger };
}
