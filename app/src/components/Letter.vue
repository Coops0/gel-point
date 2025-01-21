<template>
  <div :style="{ transform }"
       class="absolute flex items-center justify-center text-xl font-bold size-16
               transition-colors duration-200 rounded-full select-none cursor-pointer
               bg-colors-accent-400 text-colors-background-50 active:bg-colors-accent-500 shadow-lg"
       :class="[
          active && '!bg-colors-accent-600 ring-colors-primary-400 ring-4',
          animating && 'animate-bonus'
        ]"
       @pointerdown.prevent="event => emit('start-touch', event)"
       @pointerenter.prevent="event => emit('hover', event)"
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
}>();

const transform = computed(() => `translate(${props.x}px, ${props.y}px)`);

const emit = defineEmits<{
  'start-touch': [event: PointerEvent];
  hover: [event: PointerEvent];
}>();
</script>