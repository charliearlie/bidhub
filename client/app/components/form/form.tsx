import React, { ChangeEvent, FormEvent, ReactNode, useState } from "react";
import {
  Form as RemixForm,
  FormProps as RemixFormProps,
} from "@remix-run/react";
import FormField, { FormFieldProps } from "./form-field";

export type FormData = Record<string, string | number>;

type Props = {
  children: ReactNode;
  css?: string;
  initialFormValues: FormData;
  handleSubmit?: (values: FormData) => void;
  overrideStyles?: boolean;
};

type FormProps = RemixFormProps & Props;

export default function Form({
  css,
  children,
  initialFormValues,
  overrideStyles,
  handleSubmit,
  ...props
}: FormProps) {
  type FormKeys = keyof FormData;
  type FormState = Record<FormKeys, FormData[FormKeys]>;
  const [formState, setFormState] = useState<FormState>(initialFormValues);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setFormState({
      ...formState,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <RemixForm
      className="mb-4 w-full max-w-sm rounded bg-white px-8 pt-6 pb-8 sm:shadow-md"
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === FormField) {
          const props: Partial<FormFieldProps> = {
            handleChange,
          };
          return React.cloneElement(child, props);
        }
        return child;
      })}
    </RemixForm>
  );
}
