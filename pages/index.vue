<script setup lang="ts">
definePageMeta({ guest: true });
</script>
<template>
  <div class="w-full h-full flex flex-col items-center justify-center gap-4">
    <span class="font-display text-5xl">Webhook Proxy</span>
    <span class="text-xl">
      A project by <span class="font-display">UnInbox</span> and
      <span class="font-display">u22n</span></span
    >
    <UCard
      class="bg-white/75 dark:bg-white/5 backdrop-blur p-4 rounded-xl shadow-lg dark:shadow-none"
    >
      <div class="justify-center items-center flex flex-col gap-4">
        <UButton
          color="black"
          icon="i-simple-icons-github"
          label="Sign in with GitHub"
          size="xl"
          target="_self"
          trailing-icon="i-heroicons-arrow-right-20-solid"
          @click="navigateTo('/api/auth/github', { external: true })"
        />
        <UButton
          color="black"
          icon="i-simple-icons-github"
          label="Check the project on Github"
          size="xl"
          to="https://github.com/un/webhook-proxy"
          trailing-icon="i-heroicons-arrow-right-20-solid"
        />
      </div>
    </UCard>
  </div>
</template>
