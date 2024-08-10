import { Nav } from "./first-boot";

export default function StageIntro(props: { nav: Nav }) {
  return (
    <div className="px-8 py-6 flex flex-col items-center justify-center bg-stone-900 border border-stone-600 rounded-md gap-4 select-none max-h-[80%]">
      <p className="text-center">Hello 👋</p>
      <span className="flex flex-col gap-4 max-w-xl overflow-y-auto">
        <p>
          Thanks for trying out my custom unity hub. This tool is meant to be a
          sort of "companion" app to the regular Unity Hub.
        </p>
        <p>
          Things such as editor installs, editor removals, official template
          downloads, user account handling, and the rest of that jazz will still
          have to be done via the Unity Hub.
        </p>
        <p>
          However, other things can be done via this app. Such as creating
          projects with templates (official or custom), removing the packages
          you don't want, making entirely custom templates, viewing editor
          metadata information, having a faster interface and much more.
        </p>
        <p>
          If you have any suggestions or issues, please let me know in the{" "}
          <span
            className="cursor-pointer text-sky-600 hover:text-sky-400 hover:underline underline-offset-4"
            onClick={() => {
              open("https://github.com/nomnomab/nomnom-unity-hub/issues");
            }}
          >
            github issues!
          </span>
        </p>
      </span>
      <button
        className="rounded-md bg-sky-600 text-stone-50 px-4 py-2 mt-2"
        onClick={props.nav.advance}
      >
        Sounds Good
      </button>
    </div>
  );
}
