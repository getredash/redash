import * as React from "react";

export default function Cross(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={10} height={10} fill="none" {...props}>
      <path d="M.47 9.53a.79.79 0 0 0 .53.22.75.75 0 0 0 .53-.22L5 6.06l3.47 3.47a.79.79 0 0 0 .53.22.75.75 0 0 0 .53-.22.74.74 0 0 0 0-1.06L6.06 5l3.47-3.47a.74.74 0 0 0 0-1.06.74.74 0 0 0-1.06 0L5 3.94 1.53.47a.74.74 0 0 0-1.06 0 .75.75 0 0 0 0 1.06L3.94 5 .47 8.47a.75.75 0 0 0 0 1.06Z" />
    </svg>
  );
}
