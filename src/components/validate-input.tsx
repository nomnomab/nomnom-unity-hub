import React, { createContext, useContext, useEffect, useReducer } from "react";
import { TauriRouter } from "../utils/tauri-router";

export namespace ValidateInputContext {
  type Type = {
    state: State;
    dispatch: React.Dispatch<Action>;
  };

  export type ErrorMap = {
    [key: string]: Error | null;
  };

  type State = {
    hasError: ErrorMap;
  };

  type Action = {
    type: "set_error";
    key: string;
    value: Error | null;
  };

  const reducer = (state: State, action: Action) => {
    switch (action.type) {
      case "set_error":
        return {
          ...state,
          hasError: {
            ...state.hasError,
            [action.key]: action.value,
          },
        };
    }
  };

  export const Context = createContext<Type>({} as Type);

  export function User(props: React.PropsWithChildren) {
    const [state, dispatch] = useReducer(reducer, {
      hasError: {},
    });

    return (
      <Context.Provider value={{ state, dispatch }}>
        {props.children}
      </Context.Provider>
    );
  }

  export function isEmptyString(
    value: string | null | undefined
  ): Error | null {
    if (
      value === undefined ||
      value === null ||
      value.trim() === "" ||
      value.trim().length === 0
    ) {
      return new Error("Value cannot be empty");
    }

    return null;
  }

  export async function isBadPath(
    value: string | null | undefined
  ): Promise<Error | null> {
    if (value === undefined || value === null || value.trim() === "") {
      return new Error("Value cannot be empty");
    }

    if (!(await TauriRouter.is_valid_path(value))) {
      return new Error("Value is not a valid path");
    }

    return null;
  }
}

type ErrorProps = {
  hasError: () => Error | null;
};

type InputProps = {
  label?: string;
  subtitle?: string;
  value: string;
  divProps?: React.HTMLAttributes<HTMLDivElement>;
} & React.InputHTMLAttributes<HTMLInputElement> &
  ErrorProps;
export function ValidateInput({
  label,
  subtitle,
  value,
  hasError,
  divProps,
  ...props
}: InputProps) {
  const { state, dispatch } = useContext(ValidateInputContext.Context);

  useEffect(() => {
    dispatch({
      type: "set_error",
      key: props.name ?? "",
      value: hasError && hasError(),
    });
  }, []);

  useEffect(() => {
    dispatch({
      type: "set_error",
      key: props.name ?? "",
      value: hasError && hasError(),
    });
  }, [value]);

  // const hasErrorCheck = state.hasError[props.name ?? ""] ?? false;
  const error = React.useMemo(() => {
    return (!state.hasError || state.hasError[props.name ?? ""]) ?? false;
  }, [state.hasError, props.name]);

  return (
    <div {...divProps} className={`flex flex-col ${divProps?.className ?? ""}`}>
      {label && <label className="select-none">{label}</label>}
      {subtitle && <p className="text-stone-400">{subtitle}</p>}
      <input {...props} autoComplete="off" value={value} />
      {error && <p className="text-red-500">{error.message}</p>}
    </div>
  );
}

type InputWithButtonProps = {
  label?: string;
  subtitle?: string;
  value: string;
  divProps?: React.HTMLAttributes<HTMLDivElement>;
  children: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement> &
  ErrorProps;
export function ValidateInputWithButton({
  label,
  subtitle,
  value,
  hasError,
  divProps,
  children,
  ...props
}: InputWithButtonProps) {
  const { state, dispatch } = useContext(ValidateInputContext.Context);

  useEffect(() => {
    dispatch({
      type: "set_error",
      key: props.name ?? "",
      value: hasError && hasError(),
    });
  }, []);

  useEffect(() => {
    dispatch({
      type: "set_error",
      key: props.name ?? "",
      value: hasError && hasError(),
    });
  }, [value]);

  // const hasErrorCheck = state.hasError[props.name ?? ""] ?? false;
  const error = React.useMemo(() => {
    return (!state.hasError || state.hasError[props.name ?? ""]) ?? false;
  }, [state.hasError, props.name]);

  return (
    <div {...divProps} className={`flex flex-col ${divProps?.className ?? ""}`}>
      {label && <label className="select-none">{label}</label>}
      {subtitle && <p className="text-stone-400">{subtitle}</p>}
      <div className="pb-1" />
      <div className="flex">
        <input {...props} autoComplete="off" value={value} />
        {children}
      </div>
      {error && <p className="text-red-500">{error.message}</p>}
    </div>
  );
}

type TextAreaProps = {
  label?: string;
  value: string;
  divProps?: React.HTMLAttributes<HTMLDivElement>;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  ErrorProps;
export function ValidateTextArea({
  label,
  value,
  hasError,
  divProps,
  ...props
}: TextAreaProps) {
  const { state, dispatch } = useContext(ValidateInputContext.Context);
  useEffect(() => {
    dispatch({
      type: "set_error",
      key: props.name ?? "",
      value: hasError && hasError(),
    });
  }, []);

  useEffect(() => {
    dispatch({
      type: "set_error",
      key: props.name ?? "",
      value: hasError && hasError(),
    });
  }, [value]);

  // const hasErrorCheck = state.hasError[props.name ?? ""] ?? false;
  const error = React.useMemo(() => {
    return (!state.hasError || state.hasError[props.name ?? ""]) ?? false;
  }, [state.hasError, props.name]);

  return (
    <div {...divProps} className={`flex flex-col ${divProps?.className ?? ""}`}>
      {label && <label className="select-none pb-1">{label}</label>}
      <textarea
        {...(props as React.InputHTMLAttributes<HTMLTextAreaElement>)}
        value={value}
      />
      {error && <p className="text-red-500">{error.message}</p>}
    </div>
  );
}

// type PathInputProps = {
// 	label?: string;
// 	value: string;
// 	errorMessage: () => string;
// 	hasError: () => boolean;
// 	isDirectory?: boolean;
// } & React.InputHTMLAttributes<HTMLInputElement>;
// export function ValidatePathInput({
// 	label,
// 	value,
// 	errorMessage,
// 	hasError,
// 	isDirectory,
// 	...props
// }: PathInputProps) {
// 	const { state, dispatch } = useContext(Context);
// 	useEffect(() => {
// 		dispatch({
// 			type: "set_error",
// 			key: props.name ?? "",
// 			value: hasError && hasError(),
// 		});
// 	}, [value]);

// 	// const hasErrorCheck = state.hasError[props.name ?? ""] ?? false;
// 	const hasErrorCheck = React.useMemo(() => {
// 		return (!state.hasError || state.hasError[props.name ?? ""]) ?? false;
// 	}, [state.hasError, props.name]);

// 	return (
// 		<div className="flex flex-col">
// 			{label && <label className="select-none pb-1">{label}</label>}
// 			<div className="flex">
// 				<input {...props} type="text" value={value} />
// 				<button className="ml-3">
// 					<Delete />
// 				</button>
// 			</div>
// 			{hasErrorCheck && <p className="text-red-500">{errorMessage()}</p>}
// 		</div>
// 	);
// }
