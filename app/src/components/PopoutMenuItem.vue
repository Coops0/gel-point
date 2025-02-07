<template>
  <Transition
      :css="false"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
  >
    <div
        v-if="active"
        class="flex items-center justify-between fixed z-9 bg-background-50 rounded-2xl"
        :style="{ top: `${y}px`, left: `${x}px` }"
    >
      <GhostButton
          class="text-nowrap"
          :variant
          :class="hovered && 'bg-primary-500/25'"
          :data-popup-key="popupKey"
          :ref="uniqueId"
      >
        {{ label }}
      </GhostButton>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import GhostButton, { type GhostVariant } from '@/components/GhostButton.vue';
import { useId, useTemplateRef } from 'vue';
import gsap from 'gsap';

const props = defineProps<{
  x: number;
  y: number;
  popupKey: string;
  label: string;
  hovered: boolean;
  index: number;
  variant: GhostVariant;
  active: boolean;
}>();

const uniqueId = useId();
const buttonElement = useTemplateRef<InstanceType<typeof GhostButton>>(uniqueId);

defineExpose({ buttonElement });

function onBeforeEnter(el: Element) {
  gsap.set(el, {
    x: 50
  });
}

function onEnter(el: Element, done: () => void) {
  gsap.to(el, {
    x: 0,
    duration: 0.25,
    delay: props.index * 0.1,
    onComplete: done,
    ease: 'power3.out'
  });
}

function onLeave(el: Element, done: () => void) {
  gsap.to(el, {
    x: 50,
    duration: 0.25,
    onComplete: done,
    ease: 'power3.in'
  });
}
</script>