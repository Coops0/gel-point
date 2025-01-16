<template>
  <div :style="{ transform, width: `${size}px`, height: `${size}px` }"
       class="absolute flex items-center justify-center text-xl font-bold
               transition-colors duration-200 rounded-full select-none cursor-pointer
               bg-colors-accent-400 text-colors-background-50 hover:bg-colors-accent-500 shadow-lg"
       :class="[
          active && '!bg-colors-accent-600 ring-colors-primary-400 ring-4',
          animating && 'animate-bonus'
        ]"
       @pointerdown="() => emit('start-touch')"
       @pointerenter="() => emit('hover')"
       @touchstart.prevent.passive="() => emit('start-touch')"
  >
    {{ letter }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  x: number;
  y: number;
  letter: string;
  animating: boolean;
  active: boolean;
  size: number;
}>();

const transform = computed(() => `translate(${props.x}px, ${props.y}px)`);

const emit = defineEmits<{
  'start-touch': [];
  hover: [];
}>();
</script>