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
       :ref="uniqueId"
  >
    {{ letter }}
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, useTemplateRef } from 'vue';
import { lerp } from '@/util';

const props = defineProps<{
  x: number;
  y: number;
  letter: string;
  animating: boolean;
  active: boolean;
}>();

const dragOffset = ref([0, 0]);
const transform = computed(() => `translate(${props.x + dragOffset.value[0]}px, ${props.y + dragOffset.value[1]}px)`);

const emit = defineEmits<{
  'start-touch': [event: PointerEvent];
  hover: [event: PointerEvent];
}>();

const uniqueId = useId();
const element = useTemplateRef<HTMLElement>(uniqueId);

const onPointerMove = (event: MouseEvent) => {
  const el = element.value;
  if (!el || !props.active) {
    dragOffset.value = [0, 0];
    return;
  }

  let [x, y] = [event.clientX - el.offsetWidth, event.clientY - el.offsetHeight];

  x = lerp(x, props.x, 0.1) / 100;
  y = lerp(y, props.y, 0.1) / 100;

  dragOffset.value = [x, y];
};

const onPointerUp = () => {
  const interval = setInterval(() => {
    const [x, y] = dragOffset.value;
    if (x === 0 && y === 0) {
      clearInterval(interval);
    } else {
      dragOffset.value = [x * 0.9, y * 0.9];
    }
  }, 15);
};

onMounted(() => {
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerup', onPointerUp, { passive: true });
});

onUnmounted(() => {
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
});
</script>