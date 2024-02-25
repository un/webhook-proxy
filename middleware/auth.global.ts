export default defineNuxtRouteMiddleware(async (to) => {
  const user = useUser();
  const isToGuest = to.meta.guest;
  const guestRedirect = "/";
  const authedRedirect = "/o/redirect";

  // skip for the endpoint post messages
  if (to.path.startsWith("/endpoint")) return;
  if (to.path.startsWith(authedRedirect)) return;

  if (!user.value) {
    const data = await useRequestFetch()("/api/auth/user");
    if (data) {
      // @ts-expect-error - typings not working properly
      user.value = data || null;
    }
  }

  if (isToGuest) {
    // if the user is logged in, redirect to the user's page
    if (user.value) {
      return navigateTo(authedRedirect);
    }
    // if the user is not logged in, redirect to the guest page
    if (to.path !== "/") {
      return navigateTo(guestRedirect);
    }
    return;
  }

  if (!isToGuest && !user.value) {
    return navigateTo(guestRedirect);
  }

  return;
});
