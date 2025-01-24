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
import { computed, onMounted, onUnmounted, ref, useId, useTemplateRef, watch } from 'vue';
import { lerp } from '@/util';

const props = defineProps<{
  x: number;
  y: number;
  letter: string;
  animating: boolean;
  active: boolean;
  lastSelected: boolean;
}>();

const localPos = ref([props.x, props.y]);

const shuffleInterval = ref<number | null>(null);

watch(() => [props.x, props.y], ([newX, newY]) => {
  if (shuffleInterval.value) {
    clearInterval(shuffleInterval.value);
  }

  shuffleInterval.value = setInterval(() => {
    if (localPos.value[0] === newX && localPos.value[1] === newY) {
      clearInterval(shuffleInterval.value!);
      localPos.value = [newX, newY];
    } else {
      localPos.value[0] = lerp(localPos.value[0], newX, 0.1);
      localPos.value[1] = lerp(localPos.value[1], newY, 0.1);
    }
  }, 15);
}, { deep: true });

const dragOffset = ref([0, 0]);
const moveToOffsetTarget = ref([0, 0]);

const transform = computed(() => `translate(${localPos.value[0] + dragOffset.value[0]}px, ${localPos.value[1] + dragOffset.value[1]}px)`);

const emit = defineEmits<{
  'start-touch': [event: PointerEvent];
  hover: [event: PointerEvent];
}>();

const uniqueId = useId();
const element = useTemplateRef<HTMLElement>(uniqueId);

function onPointerMove(event: MouseEvent) {
  const el = element.value;
  if (!el || !props.active) {
    moveToOffsetTarget.value = [0, 0];
    return;
  }

  const rect = el.getBoundingClientRect();
  let [x, y] = [event.clientX - rect.x, event.clientY - rect.y];

  const modifier = props.lastSelected ? 80 : 300;

  x = lerp(x, localPos.value[0], 0.1) / modifier;
  y = lerp(y, localPos.value[1], 0.1) / modifier;

  moveToOffsetTarget.value = [x, y];
}

function onPointerUp() {
  moveToOffsetTarget.value = [0, 0];
}

function moveToOffset() {
  const [targetX, targetY] = moveToOffsetTarget.value;
  const [x, y] = dragOffset.value;
  dragOffset.value = [lerp(x, targetX, 0.1), lerp(y, targetY, 0.1)];
}

const moveToOffsetInterval = ref<number | null>(null);

onMounted(() => {
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerup', onPointerUp, { passive: true });

  moveToOffsetInterval.value = setInterval(moveToOffset, 15);
});

onUnmounted(() => {
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
  if (moveToOffsetInterval.value) {
    clearInterval(moveToOffsetInterval.value);
  }
});
</script>