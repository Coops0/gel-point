<template>
  <div>
    <div
        v-if="showHelper && elementPosition"
        class="fixed z-100 bg-primary-900 text-white p-2 rounded-md"
        :style="{ top: `${elementPosition.y}px`, left: `${elementPosition.x - 100}px` }"
    >
      hold me ->
    </div>

    <div
        :class="isHolding ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        class="fixed transition-opacity ease-in-out"
    >
      <div>
        <div
            v-for="item in alignedItems"
            :key="item.key"
            class="flex items-center justify-between fixed z-40"
            :style="{ top: `${item.y}px`, left: `${item.x}px` }"
        >
          <GhostButton
              class="text-nowrap"
              :variant="item.variant"
              :class="item.key === hoveredItem && 'bg-primary-500/25'"
              :data-popup-key="item.key"
              ref="item-refs"
          >
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
import { computed, ref, useTemplateRef } from 'vue';
import { useEventListener } from '@/composables/event-listener.composable.ts';

const VERTICAL_PADDING = 8;

export interface PopoutItem {
  label: string;
  variant: GhostVariant;
  key: string;
  below?: boolean;
}

const props = defineProps<{
  variant: GhostVariant;
  items: PopoutItem[];
  dynamicSized?: boolean;
}>();

const emit = defineEmits<{
  select: [key: Key];
  start: [];
}>();

type Key = typeof props.items[number]['key'];

const popoutElement = ref<typeof GhostButton | null>(null);
const itemRefs = useTemplateRef<(typeof GhostButton)[]>('item-refs');

const elementPosition = computed<{ x: number; y: number; height: number; width: number; } | null>(() => {
  const rect = popoutElement.value?.$el?.getBoundingClientRect();
  if (!rect) return null;

  return ({ x: rect.x, y: rect.y, height: rect.height, width: rect.width });
});

const alignedItems = computed(() => {
  const pos = elementPosition.value;
  if (!pos) return [];

  let below = 0;
  let above = 0;

  return props.items.map(item => {
    let x = pos.x;
    if (props.dynamicSized) {
      const rect = itemRefs.value
          ?.map(i => i.$el)
          ?.find(r => r.dataset['popupKey'] === item.key)
          ?.getBoundingClientRect();

      if (rect) {
        x += (pos.width - rect.width);
      }
    }

    const y = item.below ?
        VERTICAL_PADDING + pos.y + (pos.height * ++below) :
        pos.y - VERTICAL_PADDING - (pos.height * ++above);

    return ({
      ...item,
      x,
      y
    });
  });
});

const isHolding = ref(false);
const hoveredItem = ref<Key | null>(null);

// detect if user keeps trying to click, show them a help message
let beganHeldAt = 0;
let lastClick = 0;
let clicks = 0;
let previousHoldTimeout = -1;

const showHelper = ref(false);

function beginHold(event: PointerEvent) {
  emit('start');
  isHolding.value = true;
  (<Element>event.target)?.releasePointerCapture(event.pointerId);

  beganHeldAt = Date.now();
}

useEventListener('pointerup', event => {
  if (!isHolding.value) return;
  isHolding.value = false;

  const key = (event.target as HTMLElement)?.dataset['popupKey'];
  if (key) {
    emit('select', key as Key);
    return;
  }

  if (Date.now() - lastClick >= 1000) {
    clicks = 0;
  }

  if (Date.now() - beganHeldAt <= 500) {
    clicks++;
    lastClick = Date.now();
  } else {
    clicks = 0;
    return;
  }

  if (clicks < 2) return;

  if (previousHoldTimeout !== -1) {
    clearTimeout(previousHoldTimeout);
  }

  clicks = 0;
  showHelper.value = true;

  setTimeout(() => {
    showHelper.value = false;
    previousHoldTimeout = -1;
  }, 5000);
});

useEventListener('pointermove', event => {
  hoveredItem.value = null;
  if (!isHolding.value) return;

  const key = (event.target as HTMLElement)?.dataset['popupKey'];
  if (key) {
    hoveredItem.value = key as Key;
  }
});
</script>