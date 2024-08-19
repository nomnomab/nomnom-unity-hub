import toast from "react-hot-toast";

export function routeErrorToToast(
  error: Error | string | null | undefined | unknown
) {
  if (error === undefined || error === null) {
    return;
  }

  if (typeof error === "string") {
    error = new Error(error);
  }

  if (error instanceof Error) {
    error = new Error(`Error: ${error.message}`);
  }

  if (error instanceof Error) {
    console.error(error);
    toast.error(error.message);
    return;
  }

  console.error(error);
  // @ts-ignore
  toast.error(error);
}
