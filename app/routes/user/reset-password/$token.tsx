import { useActionData, useTransition } from "@remix-run/react";
import { ActionArgs, ActionFunction, json } from "@remix-run/node";
import Alert, { AlertType } from "~/components/alert";
import Form from "~/components/form/form";
import FormField from "~/components/form/form-field";
import Spinner from "~/components/spinner";
import Button from "~/components/button";
import { resetPassword } from "~/services/user.server";

type ActionData =
  | { password: null | string; confirmPassword: null | string }
  | undefined;

export const action: ActionFunction = async ({
  params,
  request,
}: ActionArgs) => {
  const formData = await request.formData();

  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof password !== "string" || typeof params.token !== "string") {
    return json({ success: false });
  }

  const errors: ActionData = {
    password: password ? null : "Password is required",
    confirmPassword: confirmPassword ? null : "Please confirm your password",
  };

  const hasErrors = Object.values(errors).some((errorMessage) => errorMessage);
  if (hasErrors) {
    return json<ActionData>(errors);
  }

  return resetPassword(password, params.token);
};

export default function ForgotPasswordRoute() {
  const actionData = useActionData();
  const transition = useTransition();

  return (
    <main>
      <div className="flex flex-col flex-wrap content-center">
        <h1 className="text-center text-3xl font-bold">Reset password</h1>
        <p className="text-center">Enter your new password</p>
        {/* We should add a link to go back to requesting a reset link */}
        {actionData?.success && (
          <Alert type={AlertType.ERROR} message="Something went wrong" />
        )}
        <Form
          className="mb-4 w-full max-w-sm rounded bg-white px-8 pt-6 pb-8 sm:shadow-md"
          initialFormValues={{
            password: "",
            confirmPassword: "",
          }}
          method="post"
        >
          <FormField label="Password" name="password" type="text" />
          <FormField
            label="Confirm Password"
            name="confirmPassword"
            type="text"
          />
          <div className="flex justify-center">
            <Button className="w-25">
              {transition.state !== "idle" ? <Spinner /> : "Reset password"}
            </Button>
          </div>
        </Form>
      </div>
    </main>
  );
}