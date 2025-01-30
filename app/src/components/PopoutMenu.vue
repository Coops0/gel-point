<template>
  <div>
    <div
        :class="isHolding ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        class="fixed z-40 transition-opacity ease-in-out"
    >
      <div>
        <div
            v-for="item in alignedItems"
            :key="item.key"
            class="flex items-center justify-between fixed"
            :style="{ top: `${item.y}px`, left: `${item.x}px` }"
        >
          <GhostButton :variant="item.variant" :class="item.key === hoveredItem && 'bg-primary-500/25'" :data-popup-key="item.key">
            {{ item.label }}
          </GhostButton>
        </div>
      </div>

    </div>

    <GhostButton
        :variant
        class="px-4 py-2 rounded-md transition-all ease-out duration-150"
        @pointerdown.prevent="event => beginHold(event)"
        ref="popoutElement"
    >
      <slot/>
    </GhostButton>
  </div>
</template>

<script lang="ts" setup>
import GhostButton, { type GhostVariant } from '@/components/GhostButton.vue';
import { computed, ref } from 'vue';
import { useEventListener } from '@/composables/event-listener.composable.ts';

const VERTICAL_PADDING = 8;

export interface PopoutItem {
  label: string;
  variant: GhostVariant;
  key: string;
  below?: boolean;
}

type Key = typeof props.items[number]['key'];

const props = defineProps<{
  variant: GhostVariant;
  items: PopoutItem[];
}>();

const emit = defineEmits<{
  select: [key: Key];
  start: [];
}>();

const popoutElement = ref<typeof GhostButton | null>(null);

const elementPosition = computed(() => {
  const rect = popoutElement.value?.$el?.getBoundingClientRect();
  if (!rect) return null;

  return ({ x: rect.x, y: rect.y, height: rect.height });
});

const alignedItems = computed(() => {
  const pos = elementPosition.value;
  if (!pos) return [];

  let below = 0;
  let above = 0;

  return props.items.map((item, i) => {
    const y = item.below ?
        VERTICAL_PADDING + pos.y + (pos.height * ++below) :
        pos.y - VERTICAL_PADDING - (pos.height * ++above);

    return ({
      ...item,
      x: pos.x,
      y
    });
  });
});

const isHolding = ref(false);
const hoveredItem = ref<Key | null>(null);

function beginHold(event: PointerEvent) {
  emit('start');
  isHolding.value = true;
  (<Element>event.target)?.releasePointerCapture(event.pointerId);
}

useEventListener('pointerup', event => {
  if (!isHolding.value) return;
  isHolding.value = false;

  const key = (event.target as HTMLElement)?.dataset['popupKey'];
  if (key) {
    emit('select', key as Key);
  }
});

useEventListener('pointermove', event => {
  hoveredItem.value = null;
  if (!isHolding.value) return;

  const key = (event.target as HTMLElement)?.dataset['popupKey'];
  hoveredItem.value = key as Key;
});
</script>