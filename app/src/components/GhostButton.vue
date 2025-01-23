<template>
  <button
      class="px-4 py-2 rounded-md transition-all ease-out duration-150 active:bg-opacity-25"
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
      return 'text-colors-primary-500 active:bg-colors-primary-500';
    case 'secondary':
      return 'text-colors-secondary-500 active:bg-colors-secondary-500';
    case 'accent':
      return 'text-colors-accent-500 active:bg-colors-accent-500';
  }
});</script>