<template>
  <Transition
      :appear="appear"
      :duration="duration"
      :style="{ transitionDuration: `${duration}ms !important`, transitionProperty: 'opacity !important' }"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
  >
    <slot/>
  </Transition>
</template>

<script lang="ts" setup>
withDefaults(
    defineProps<{ duration?: number; appear?: boolean; }>(),
    { duration: 150, appear: false }
);
</script>
