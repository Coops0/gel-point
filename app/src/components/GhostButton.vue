<template>
  <button
      :class="variantClasses"
      class="px-4 py-2 rounded-md !transition-all !ease-out !duration-150"
  >
    <slot/>
  </button>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

export type GhostVariant = 'primary' | 'secondary' | 'accent';

const props = defineProps<{
  variant: GhostVariant;
  active?: boolean;
}>();

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return `text-primary-500 active:bg-primary-500/25 ${props.active ? '!bg-primary-500/25' : ''}`;
    case 'secondary':
      return `text-secondary-500 active:bg-secondary-500/25 ${props.active ? '!bg-secondary-500/25' : ''}`;
    case 'accent':
      return `text-accent-500 active:bg-accent-500/25 ${props.active ? '!bg-accent-500/25' : ''}`;
  }
});
</script>