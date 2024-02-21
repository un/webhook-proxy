<script setup lang="ts">
await useFetch("/api/auth/user", {
  onResponse({ response }) {
    if (response._data.username) {
      navigateTo(`/o/${response._data.username.toLowerCase()}`);
    }
    navigateTo("/");
  },
});
</script>

<template>
  <div class="w-full h-full flex flex-col justify-center items-center">
    <h1 class="font-display text-5xl">Redirecting...</h1>
  </div>
</template>
