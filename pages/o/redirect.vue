<script setup lang="ts">
if (!import.meta.server) {
  const user = await $fetch("/api/auth/user");
  if (user?.username) {
    console.log("user redirect");
    //@ts-expect-error - posgres typings are not working
    await navigateTo(`/o/${user.username.toLowerCase()}`);
  }
  useUser().value = null;
  await navigateTo("/");
}
</script>

<template>
  <div class="w-full h-full flex flex-col justify-center items-center">
    <h1 class="font-display text-5xl">Redirecting...</h1>
  </div>
</template>
