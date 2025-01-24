<template>
  <button
      class="px-4 py-2 rounded-md transition-all ease-out duration-150"
      :class="variantClasses"
  >
    <slot/>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  variant: 'primary' | 'secondary' | 'accent';
}>();

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'text-primary-500 active:bg-primary-500/25';
    case 'secondary':
      return 'text-secondary-500 active:bg-secondary-500/25';
    case 'accent':
      return 'text-accent-500 active:bg-accent-500/25';
  }
});</script>