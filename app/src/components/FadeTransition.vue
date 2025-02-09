<template>
  <Transition
      :duration="duration"
      :style="{ transitionDuration: `${duration}ms` }"
      class="transition-all"
      enter-from-class="opacity-0 "
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
    <slot/>
  </Transition>
</template>

<script lang="ts" setup>

withDefaults(
    defineProps<{ duration?: number }>(),
    { duration: 150 }
);
</script>
