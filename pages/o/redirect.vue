<script setup lang="ts">
if (!import.meta.server) {
  const user = await $fetch("/api/auth/user");
  if (!user) {
    useUser().value = null;
    await navigateTo("/");
  }
  if (user?.username) {
    //@ts-expect-error - posgres typings are not working
    const newPath = `/o/${user.username.toLowerCase()}`;
    await navigateTo(newPath);
  }
}
</script>

<template>
  <div class="w-full h-full flex flex-col justify-center items-center">
    <h1 class="font-display text-5xl">Redirecting...</h1>
  </div>
</template>
