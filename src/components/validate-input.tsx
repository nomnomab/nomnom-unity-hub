import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
} from "react";

type ValidateInputContextType = {
  state: ValidateInputState;
  dispatch: React.Dispatch<Action>;
};

type ValidateInputState = {
  hasError: { [key: string]: boolean };
};

type Action = {
  type: "set_error";
  key: string;
  value: boolean;
};

const reducer = (state: ValidateInputState, action: Action) => {
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

const Context = createContext<ValidateInputContextType>(
  {} as ValidateInputContextType
);

type ContextProps = {
  onErrorChanged: (value: boolean) => void;
} & PropsWithChildren;
export function ValidateInputContext(props: ContextProps) {
  const [state, dispatch] = useReducer(reducer, {
    hasError: {},
  });

  useEffect(() => {
    const hasError = Object.values(state.hasError).some((value) => value);
    props.onErrorChanged(hasError);
  }, [state.hasError]);

  return (
    <Context.Provider value={{ state, dispatch }}>
      {props.children}
    </Context.Provider>
  );
}

type InputProps = {
  label?: string;
  subtitle?: string;
  value: string;
  errorMessage: () => string;
  hasError: () => boolean;
  divProps?: React.HTMLAttributes<HTMLDivElement>;
} & React.InputHTMLAttributes<HTMLInputElement>;
export function ValidateInput({
  label,
  subtitle,
  value,
  errorMessage,
  hasError,
  divProps,
  ...props
}: InputProps) {
  const { state, dispatch } = useContext(Context);

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
  }, [value, hasError]);

  // const hasErrorCheck = state.hasError[props.name ?? ""] ?? false;
  const hasErrorCheck = React.useMemo(() => {
    return (!state.hasError || state.hasError[props.name ?? ""]) ?? false;
  }, [state.hasError, props.name]);

  return (
    <div {...divProps} className={`flex flex-col ${divProps?.className ?? ""}`}>
      {label && <label className="select-none">{label}</label>}
      {subtitle && <p className="text-stone-400">{subtitle}</p>}
      <input {...props} autoComplete="off" value={value} />
      {hasErrorCheck && <p className="text-red-500">{errorMessage()}</p>}
    </div>
  );
}

type InputWithButtonProps = {
  label?: string;
  subtitle?: string;
  value: string;
  errorMessage: () => string;
  hasError: () => boolean;
  divProps?: React.HTMLAttributes<HTMLDivElement>;
  children: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;
export function ValidateInputWithButton({
  label,
  subtitle,
  value,
  errorMessage,
  hasError,
  divProps,
  children,
  ...props
}: InputWithButtonProps) {
  const { state, dispatch } = useContext(Context);

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
  }, [value, hasError]);

  // const hasErrorCheck = state.hasError[props.name ?? ""] ?? false;
  const hasErrorCheck = React.useMemo(() => {
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
      {hasErrorCheck && <p className="text-red-500">{errorMessage()}</p>}
    </div>
  );
}

type TextAreaProps = {
  label?: string;
  value: string;
  errorMessage: () => string;
  hasError: () => boolean;
  divProps?: React.HTMLAttributes<HTMLDivElement>;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export function ValidateTextArea({
  label,
  value,
  errorMessage,
  hasError,
  divProps,
  ...props
}: TextAreaProps) {
  const { state, dispatch } = useContext(Context);
  useEffect(() => {
    dispatch({
      type: "set_error",
      key: props.name ?? "",
      value: hasError && hasError(),
    });
  }, [value, hasError]);

  // const hasErrorCheck = state.hasError[props.name ?? ""] ?? false;
  const hasErrorCheck = React.useMemo(() => {
    return (!state.hasError || state.hasError[props.name ?? ""]) ?? false;
  }, [state.hasError, props.name]);

  return (
    <div {...divProps} className={`flex flex-col ${divProps?.className ?? ""}`}>
      {label && <label className="select-none pb-1">{label}</label>}
      <textarea
        {...(props as React.InputHTMLAttributes<HTMLTextAreaElement>)}
        value={value}
      />
      {hasErrorCheck && <p className="text-red-500">{errorMessage()}</p>}
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
