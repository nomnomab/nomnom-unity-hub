type Props = {} & React.SVGProps<SVGSVGElement>;
export default function Checkmark(props: Props) {
	return (
		<svg
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="lucide lucide-check"
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}
