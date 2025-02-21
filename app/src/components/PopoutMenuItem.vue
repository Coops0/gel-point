<template>
  <Transition
      :css="false"
      appear
      @enter="onEnter"
      @leave="onLeave"
      @before-enter="onBeforeEnter"
  >
    <div
        v-show="active"
        :style="{ top: `${y}px`, left: `${x}px` }"
        class="flex items-center justify-between fixed z-9 rounded-full backdrop-blur-md"
    >
      <GhostButton
          :ref="uniqueId"
          :active="hovered"
          :data-popup-key="popupKey"
          :variant
          class="text-nowrap mix-blend-multiply"
      >
        {{ label }}
      </GhostButton>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
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
  delay: number;
}>();

const uniqueId = useId();
const buttonElement = useTemplateRef<InstanceType<typeof GhostButton>>(uniqueId);

defineExpose({ buttonElement });

let isLeaving = false;

function onBeforeEnter(el: Element) {
  if (!isLeaving) {
    gsap.set(el, { x: 50 });
  }
}

function onEnter(el: Element, done: () => void) {
  // const distance = (gsap.getProperty(el, 'x') as number) / 50;
  // const delay = (distance ** 4) * props.delay;

  gsap.to(el, {
    x: 0,
    duration: 0.20,
    delay: props.index * props.delay,
    onComplete: done,
    ease: 'power3.out',
    overwrite: true
  });
}

function onLeave(el: Element, done: () => void) {
  isLeaving = true;
  gsap.to(el, {
    x: 50,
    duration: 0.25,
    onComplete: function () {
      done();
      isLeaving = false;
    },
    ease: 'power3.in'
  });
}
</script>