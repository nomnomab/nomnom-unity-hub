import React from "react";

export default function ViewBody(props: React.PropsWithChildren) {
  return (
    <div className="w-full max-w-7xl self-center overflow-hidden h-full">
      {props.children}
    </div>
  );
}

// export function ViewBodyInner(props: React.PropsWithChildren) {
//   return (
//     <div className="px-6 py-4 overflow-hidden h-full">{props.children}</div>
//   );
// }
