import { Link, useActionData, useTransition } from "@remix-run/react";
import {
  ActionArgs,
  ActionFunction,
  json,
  LoaderFunction,
  redirect,
} from "@remix-run/node";
import Alert, { AlertType } from "~/components/alert";
import Form from "~/components/form/form";
import FormField from "~/components/form/form-field";
import { getUser } from "~/session.server";
import Spinner from "~/components/spinner";
import Button from "~/components/button";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "~/services/validators.server";
import { register } from "~/services/user.server";

export const loader: LoaderFunction = async ({ request }) => {
  // If there's already a user in the session, redirect to the home page
  return (await getUser(request)) ? redirect("/") : null;
};

export const action: ActionFunction = async ({ request }: ActionArgs) => {
  const formData = await request.formData();

  const email = formData.get("email");
  const password = formData.get("password");
  const username = formData.get("username");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof username !== "string"
  ) {
    return json(
      { success: false, error: `Invalid Form Data`, form: action },
      { status: 400 }
    );
  }

  const errors = {
    email: validateEmail(email),
    password: validatePassword(password),
    username: validateUsername(username),
  };

  if (Object.values(errors).some(Boolean))
    return json(
      {
        success: false,
        errors,
        fields: { email, password, username },
        form: action,
      },
      { status: 400 }
    );

  return await register({ email, password, username });
};

export default function RegisterRoute() {
  const actionData = useActionData();
  console.log(actionData);
  const transition = useTransition();
  return (
    <main>
      <div className="flex flex-col flex-wrap content-center">
        <h1 className="text-center text-3xl font-bold">Join Bidhub</h1>
        <Form
          className="mb-4 w-full max-w-sm rounded bg-white px-8 pt-6 pb-8 sm:shadow-md"
          initialFormValues={{
            email: "",
            password: "",
            username: "",
          }}
          method="post"
        >
          {actionData?.success === false && (
            <Alert message="All fields are required" type={AlertType.ERROR} />
          )}
          <FormField
            label="Username"
            name="username"
            type="text"
            errorMessage={actionData?.errors?.username}
          />
          <FormField
            label="Email"
            name="email"
            type="text"
            errorMessage={actionData?.errors?.email}
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            errorMessage={actionData?.errors?.password}
          />
          <div className="flex justify-between">
            <Button className="w-25" variant="primary">
              {transition.state !== "idle" ? <Spinner /> : "Sign up"}
            </Button>
            <Link
              className="px-0 py-2 font-semibold text-blue-700 hover:text-slate-500"
              to="/login"
            >
              Already registered?
            </Link>
          </div>
        </Form>
      </div>
    </main>
  );
}