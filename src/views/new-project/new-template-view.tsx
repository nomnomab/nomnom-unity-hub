import {
  ValidateInput,
  ValidateInputContext,
  ValidateTextArea,
} from "../../components/validate-input";

export default function NewTemplateView() {
  return (
    <div className="flex h-full py-4">
      {/* name */}
      {/* display name */}
      {/* version */}
      {/* description */}

      <div className="flex flex-col w-full">
        <ValidateInputContext.User>
          <ValidateInput
            label="Name"
            name="name"
            value=""
            hasError={() => null}
            className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
          />
          <ValidateInput
            label="Display Name"
            name="displayName"
            value=""
            hasError={() => null}
            className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
          />
          <ValidateInput
            label="Version"
            name="version"
            value=""
            hasError={() => null}
            className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
          />
          <ValidateTextArea
            label="Description"
            name="description"
            value=""
            hasError={() => null}
            className="w-full p-2 rounded-md border border-stone-600 bg-stone-800 min-h-24 max-h-64"
          />
        </ValidateInputContext.User>
      </div>
    </div>
  );
}
