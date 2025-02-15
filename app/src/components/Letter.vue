<template>
  <div
      :ref="uniqueId"
      :style="{ transform }"
      class="absolute flex items-center justify-center size-18 rounded-full group"
      @pointerdown.prevent="event => emit('start-touch', event)"
      @pointerenter.prevent="event => emit('hover', event)"
  >
    <div
        :class="[
          active && '!bg-accent-600 ring-primary-400 ring-4',
          animating && 'animate-bonus'
        ]"
        class="absolute flex items-center justify-center text-xl font-bold size-16
               transition-colors duration-100 rounded-full select-none cursor-pointer
               bg-accent-400 text-background-50 group-active:bg-accent-500 shadow-lg pointer-events-none uppercase"
    >
      {{ letter }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useId, useTemplateRef, watch } from 'vue';
import { lerp } from '@/util';
import { useEventListener } from '@/composables/event-listener.composable.ts';
import { useInterval } from '@/composables/interval.composable.ts';

const props = defineProps<{
  x: number;
  y: number;
  letter: string;
  animating: boolean;
  active: boolean;
  lastSelected: boolean;
}>();

const emit = defineEmits<{
  'start-touch': [event: PointerEvent];
  hover: [event: PointerEvent];
  move: [x: number, y: number];
}>();

const localPos = ref([props.x, props.y]);

let shuffleInterval = -1;

watch(() => [props.x, props.y], ([newX, newY]) => {
  if (shuffleInterval !== -1) {
    clearInterval(shuffleInterval);
  }

  shuffleInterval = setInterval(() => {
    if (localPos.value[0] === newX && localPos.value[1] === newY) {
      clearInterval(shuffleInterval!);
      localPos.value = [newX, newY];
    } else {
      localPos.value[0] = lerp(localPos.value[0], newX, 0.1);
      localPos.value[1] = lerp(localPos.value[1], newY, 0.1);
    }
  }, 15);
}, { deep: true });

const dragOffset = ref([0, 0]);
const moveToOffsetTarget = ref([0, 0]);

const activePosition = computed(() => [localPos.value[0] + dragOffset.value[0], localPos.value[1] + dragOffset.value[1]]);
const transform = computed(() => `translate(${activePosition.value[0]}px, ${activePosition.value[1]}px)`);

watch(activePosition, ([x, y]) => emit('move', x, y), { deep: true });

const uniqueId = useId();
const element = useTemplateRef<HTMLElement>(uniqueId);

useEventListener(
    'pointermove',
    (event: MouseEvent) => {
      const el = element.value;
      if (!el || !props.active) {
        moveToOffsetTarget.value = [0, 0];
        return;
      }

      const rect = el.getBoundingClientRect();
      let [x, y] = [event.clientX - rect.x, event.clientY - rect.y];

      const modifier = props.lastSelected ? 30 : 60;

      x = lerp(x, localPos.value[0], 0.1) / modifier;
      y = lerp(y, localPos.value[1], 0.1) / modifier;

      moveToOffsetTarget.value = [x, y];
    },
    { passive: true }
);

useEventListener(
    'pointerup',
    () => {
      moveToOffsetTarget.value = [0, 0];
    },
    { passive: true }
);

useInterval(() => {
  const [targetX, targetY] = moveToOffsetTarget.value;
  const [x, y] = dragOffset.value;

  dragOffset.value = [lerp(x, targetX, 0.1), lerp(y, targetY, 0.1)];
}, 15);
</script>

<style scoped>
.animate-bonus {
  animation: bonus-animation 1.4s ease forwards;
}

@keyframes bonus-animation {
  0% {
    filter: brightness(1) blur(0);
    box-shadow: 0 0 0 0 var(--color-primary-400);
  }

  15% {
    filter: brightness(1.4) blur(1px);
    box-shadow: 0 0 7px 4px var(--color-primary-600);
  }

  30% {
    filter: brightness(1.1) blur(0);
    box-shadow: 0 0 3px 2px var(--color-primary-500);
  }

  50% {
    filter: brightness(1.05) blur(0);
    box-shadow: 0 0 2px 1px var(--color-primary-300);
  }

  100% {
    filter: brightness(1) blur(0);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }
}
</style>