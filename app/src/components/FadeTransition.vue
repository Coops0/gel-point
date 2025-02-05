<template>
  <Transition
      class="transition-all"
      :style="{ transitionDuration: `${duration}ms` }"
      :duration="duration"
      enter-from-class="opacity-0 "
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
    <slot/>
  </Transition>
</template>

<script setup lang="ts">

withDefaults(
    defineProps<{ duration?: number }>(),
    { duration: 150 }
);
</script>
