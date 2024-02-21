<script setup lang="ts">
const orgSlug = useRoute().params.orgSlug as string;
</script>

<template>
  <div>
    <h1>Organization: {{ orgSlug }}</h1>
  </div>
</template>
