import LoadingSpinner from "../../components/svg/loading-spinner";
import ViewHeader from "../../components/view-header";
import useDelayedFlag from "../../hooks/useDelayedFlag";
import { TauriRouter } from "../../utils/tauri-router";

export default function EditorsHeader() {
  const isOpeningHub = useDelayedFlag(2400);

  async function openHub() {
    if (isOpeningHub.waiting) return;

    isOpeningHub.trigger();
    await TauriRouter.open_unity_hub();
  }

  return (
    <ViewHeader title="Editors">
      {/* <div className="ml-auto" />
      {isOpeningHub.waiting && <LoadingSpinner />}
      {!isOpeningHub.waiting && (
        <button
          className="rounded-md text-stone-50 bg-sky-600 px-3 py-1 ml-3 select-none"
          onClick={openHub}
          disabled={isOpeningHub.waiting}
        >
          Install From Hub
        </button>
      )} */}
    </ViewHeader>
  );
}
