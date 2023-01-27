import { redirect } from "@remix-run/node";
import { GraphQLClient } from "graphql-request";
import { getSession, getUserIdFromSession, jwtCookie } from "~/session.server";
export * from "graphql-request";
export const requestClient = new GraphQLClient(process.env.BACKEND_ENDPOINT, {
  credentials: "include",
});

export const requestWithCredentials = async (
  queryOrMutation: string,
  request: Request,
  variables?: unknown
) => {
  const cookieHeader = request.headers.get("Cookie");
  console.log(cookieHeader);
  const userId = await getUserIdFromSession(request);
  const session = await getSession(request);

  const jwt = session.get("jwt");

  console.log("JWT COOKS FUCK BALLS", jwt);

  if (!userId) {
    return redirect("/login");
  }

  return await requestClient.request(queryOrMutation, variables, {
    ...(cookieHeader && { Cookie: `jwt=${jwt}` }),
  });
};
