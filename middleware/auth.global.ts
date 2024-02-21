export default defineNuxtRouteMiddleware(async (to) => {
  const user = useUser();
  const isToGuest = to.meta.guest;
  const guestRedirect = "/";
  if (isToGuest) {
    if (user.value) {
      const authedRedirect = `/o/${user.value.username.toLowerCase()}` || "/";
      return navigateTo(authedRedirect);
    }
    if (to.path !== "/") {
      return navigateTo(guestRedirect);
    }
    return;
  }

  if (!user.value) {
    const data = await useRequestFetch()("/api/auth/user");
    if (data) {
      user.value = data;
    } else {
      return navigateTo(guestRedirect);
    }
  }

  return;
});
