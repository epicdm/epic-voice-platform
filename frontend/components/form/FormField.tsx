import { ReactNode } from "react";

interface FormFieldProps {
  name?: string;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode | ((fieldProps: any) => ReactNode);
}

export function FormField({ name, label, description, error, required, children }: FormFieldProps) {
  const fieldProps = {
    name,
    "aria-label": label,
    "aria-required": required,
    "aria-invalid": !!error,
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {typeof children === "function" ? children(fieldProps) : children}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
