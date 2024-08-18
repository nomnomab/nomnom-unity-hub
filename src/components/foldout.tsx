import ChevronDown from "./svg/chevron-down";
import ChevronUp from "./svg/chevron-up";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  header: React.ReactNode;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export default function Foldout(props: Props) {
  return (
    <div
      className="flex flex-col w-full"
      {...props}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="flex items-center gap-1 select-none"
        onClick={() => props.setOpen(!props.open)}
      >
        <span>{props.open ? <ChevronDown /> : <ChevronUp />}</span>
        {props.header}
      </button>
      {props.open && props.children}
    </div>
  );
}
