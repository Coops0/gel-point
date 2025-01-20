<template>
  <div :style="{ bottom: `${y}px`, left: `${x}px` }"
       class="absolute flex items-center justify-center text-xl font-bold size-16
               transition-colors duration-200 rounded-full select-none cursor-pointer
               bg-colors-accent-400 text-colors-background-50 hover:bg-colors-accent-500 shadow-lg"
       :class="[
          active && '!bg-colors-accent-600 ring-colors-primary-400 ring-4',
          animating && 'animate-bonus'
        ]"
       @pointerdown="() => emit('start-touch')"
       @pointerenter="() => emit('hover')"
       @touchstart.passive="() => emit('start-touch')"
  >
    {{ letter }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  x: number;
  y: number;
  letter: string;
  animating: boolean;
  active: boolean;
}>();

// const transform = computed(() => `translate(${props.x}px, ${props.y}px)`);

const emit = defineEmits<{
  'start-touch': [];
  hover: [];
}>();
</script>