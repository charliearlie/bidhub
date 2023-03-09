import { useActionData, useTransition } from "@remix-run/react";
import { ActionArgs, ActionFunction, json, LoaderArgs } from "@remix-run/node";
import Alert, { AlertType } from "~/components/alert";
import Form from "~/components/form/form";
import FormField from "~/components/form/form-field";
import Spinner from "~/components/spinner";
import { formValidationRegexes } from "~/services/form-validation-regexes";
import { getUser, getUserId } from "~/session.server";
import {
  redirect,
  typedjson,
  useTypedActionData,
  useTypedLoaderData,
} from "remix-typedjson";
import { editUser } from "~/services/user.server";
import { EditUserForm } from "~/services/types.server";

// todo: Move this into own file or make more generic and just look for a key value pair of strings
type ActionData = {
  username: null | string;
  avatarImage: null | string;
  firstName: null | string;
  lastName: null | string;
};

export const action = async ({ request }: ActionArgs) => {
  let image = null;
  const formData = await request.formData();

  const avatarImage = formData.get("avatarImage") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const username = formData.get("username") as string;

  const errors: ActionData = {
    firstName: null, // todo: Do some validation to ensure this is a valid first name
    lastName: null, // Same as above but we must ensure that the user can save without adding their name
    avatarImage: null, // Same
    username: null, // again same
  };

  const hasErrors = Object.values(errors).some((errorMessage) => errorMessage);
  if (hasErrors) {
    return typedjson({
      user: null,
      error: "Got some validation tings you need to fix lad",
    });
  }

  if (avatarImage) {
    const data = new FormData();
    data.append("file", avatarImage);
    data.append("upload_preset", "bidhub_user_avatar");
    const res = await fetch(process.env.CLOUDINARY_URL, {
      method: "POST",
      body: data,
    });
    image = await res.json();
  }

  const editedUserDetails = {
    avatarUrl: image?.secure_url ?? null,
    firstName,
    lastName,
    username,
  };

  const userId = await getUserId(request);

  return await editUser(userId!, editedUserDetails);
};

export const loader = async ({ request }: LoaderArgs) => {
  const user = await getUser(request);

  if (!user) {
    return redirect("/");
  }
  user.password = "";
  return typedjson({ user });
};

export default function ManageUserRoute() {
  const { user } = useTypedLoaderData<typeof loader>();
  const actionData = useTypedActionData<typeof action>();

  const initialFormState = {
    username: user.username,
    firstName: user.personalDetails?.firstName || "",
    lastName: user.personalDetails?.lastName || "",
  };
  const transition = useTransition();
  if (user) {
    return (
      <main>
        <div className="flex flex-col flex-wrap content-center">
          <h1 className="text-center text-3xl font-bold">Edit user</h1>
          <p className="text-center">Edit the things about you</p>
          {/* We should add a link to go back to requesting a reset link */}
          {actionData?.error && (
            <Alert type={AlertType.ERROR} message={actionData.error} />
          )}
          <Form
            className="mb-4 w-full rounded bg-white px-8 pt-6 pb-8 sm:shadow-md"
            encType="multipart/form-data"
            initialFormValues={initialFormState}
            method="post"
          >
            <FormField label="Username" labelLeft name="username" type="text" />
            <FormField
              label="First name"
              labelLeft
              name="firstName"
              type="text"
              validateFunc={(string) => {
                return formValidationRegexes.textOnly.test(string);
              }}
              errorMessage=""
            />
            <FormField
              label="Last name"
              labelLeft
              name="lastName"
              type="text"
            />
            <input type="file" name="avatarImage" />
            <div className="flex justify-center">
              <button className="w-25 rounded bg-violet-700 px-3 py-2 text-lg font-semibold text-white hover:bg-violet-900">
                {transition.state !== "idle" ? <Spinner /> : "Update"}
              </button>
            </div>
          </Form>
        </div>
      </main>
    );
  }
}