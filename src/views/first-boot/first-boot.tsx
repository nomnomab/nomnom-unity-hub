import Popup from "reactjs-popup";
import useBetterState from "../../hooks/useBetterState";
import StageIntro from "./stage-intro";
import StagePaths from "./stage-settings";
import { useEffect } from "react";

export type Nav = {
  back: () => void;
  advance: () => void;
};

export default function FirstBoot() {
  const stage = useBetterState(0);

  function back() {
    stage.set((s) => s - 1);
  }

  function advance() {
    stage.set((s) => s + 1);
  }

  return (
    <Popup position="center center" modal open>
      <div className="bg-[#0c0a09b4] fixed left-0 right-0 top-0 bottom-0 flex justify-center items-center overflow-hidden">
        {stage.value === 0 && <StageIntro nav={{ back, advance }} />}
        {stage.value === 1 && <StagePaths nav={{ back, advance }} />}
        {stage.value === 2 && <LastStage />}
      </div>
    </Popup>
  );
}

function LastStage() {
  useEffect(() => {
    window.localStorage.setItem("pastFirstBoot", "true");
    window.location.reload();
  }, []);
  return null;
}
