import { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiValidationError } from "../../api/errors/api-error";

export function applyServerErrors<T extends FieldValues>(
  error: ApiValidationError,
  setError: UseFormSetError<T>,
) {
  if (!error.errors) return;

  Object.entries(error.errors).forEach(([field, messages]) => {
    setError(field as Path<T>, {
      type: "server",
      message: messages[0],
    });
  });
}
