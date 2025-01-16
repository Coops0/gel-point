<template>
  <div :style="{ transform }"
       class="absolute flex items-center justify-center w-20 h-20 text-xl font-bold
               transition-colors duration-200 rounded-full select-none cursor-pointer"
       :class="[
          'bg-indigo-400 text-white hover:bg-indigo-500',
          active && '!bg-indigo-600 ring-indigo-400 ring-4',
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
}>();

const transform = computed(() => `translate(${props.x}px, ${props.y}px)`);

const emit = defineEmits<{
  'start-touch': [];
  hover: [];
}>();
</script>