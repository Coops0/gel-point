<template>
  <div>
    <Teleport to="body">
      <FadeTransition appear>
        <div
            v-if="showHelper && elementPosition"
            :style="{ top: `${elementPosition.y}px`, left: `${elementPosition.x - 115}px` }"
            class="fixed z-9 bg-primary-900/85 text-white p-2 rounded-md font-shippori"
            @click="() => showHelper = false"
        >
          hold me 👉
        </div>
      </FadeTransition>
    </Teleport>

    <div
        class="fixed"
    >
      <PopoutMenuItem
          v-for="(item, index) in alignedItems"
          :key="item.key"
          :ref="itemRefIds"
          :active="isHolding"
          :delay="delay"
          :hovered="item.key === hoveredItem"
          :index="index"
          :label="item.label"
          :popup-key="item.key"
          :variant="item.variant"
          :x="item.x"
          :y="item.y"
      />
    </div>

    <GhostButton
        :ref="popoutId"
        :data-popup-key="popoutId"
        :variant
        class="px-4 py-2 rounded-md transition-all ease-out duration-150"
        @pointerdown.prevent="event => beginHold(event)"
    >
      <span :class="(emojiMode && !isHolding) ? 'grayscale' : ''" class="transition-all duration-150"><slot/></span>
    </GhostButton>
  </div>
</template>

<script lang="ts" setup>
import GhostButton, { type GhostVariant } from '@/components/GhostButton.vue';
import { computed, onMounted, ref, useId, useTemplateRef, watch } from 'vue';
import { useEventListener } from '@/composables/event-listener.composable.ts';
import { useInterval } from '@/composables/interval.composable.ts';
import PopoutMenuItem from '@/components/PopoutMenuItem.vue';
import { impactFeedback, selectionFeedback } from '@tauri-apps/plugin-haptics';
import FadeTransition from '@/components/FadeTransition.vue';

const VERTICAL_PADDING = 8;

export interface PopoutItem {
  label: string;
  variant: GhostVariant;
  key: string;
}

const props = defineProps<{
  variant: GhostVariant;
  items: PopoutItem[];
  dynamicSized?: boolean;
  emojiMode?: boolean;
}>();

const emit = defineEmits<{
  select: [key: Key];
  start: [];
}>();

type Key = typeof props.items[number]['key'];

const popoutId = useId();
const popoutElement = useTemplateRef<InstanceType<typeof GhostButton>>(popoutId);

const itemRefIds = useId();
const itemRefs = useTemplateRef<InstanceType<typeof PopoutMenuItem>[]>(itemRefIds);

const elementPosition = ref<{ x: number; y: number; height: number; width: number; } | null>(null);

const alignedItems = ref<Array<PopoutItem & { x: number; y: number }>>([]);

function recalculatePositions() {
  const rect = popoutElement.value?.$el?.getBoundingClientRect();
  if (!rect || !rect.height|| !rect.width) return null;

  elementPosition.value = ({ x: rect.x, y: rect.y, height: rect.height, width: rect.width });

  let above = 0;

  alignedItems.value = props.items.map(item => {
    let x = rect.x;
    if (props.dynamicSized) {
      const rect = itemRefs.value
          ?.map(i => i.buttonElement?.$el)
          .filter(el => !!el)
          .find(r => r.dataset['popupKey'] === item.key)
          ?.getBoundingClientRect();

      if (rect) {
        x += (rect.width - rect.width);
      }
    }

    const y = rect.y - VERTICAL_PADDING - (rect.height * ++above);

    return ({
      ...item,
      x,
      y
    });
  });
}

const delay = computed(() => alignedItems.value.length > 4 ? 0.04 : 0.1);

const isHolding = ref(false);
const hoveredItem = ref<Key | null>(null);

// detect if user keeps trying to click, show them a help message
let beganHeldAt = 0;
let lastClick = 0;
let clicks = 0;
let previousHoldTimeout = -1;

const showHelper = ref(false);

function beginHold(event: PointerEvent) {
  event.preventDefault();

  emit('start');

  isHolding.value = true;
  (<Element>event.target)?.releasePointerCapture(event.pointerId);

  beganHeldAt = Date.now();

  selectionFeedback();
}

useEventListener('pointerup', event => {
  event.preventDefault();

  if (!isHolding.value) return;
  isHolding.value = false;

  const key = (event.target as HTMLElement)?.dataset['popupKey'];
  if (key) {
    // Went back to initial button or item not in this menu
    if (key === popoutId || !alignedItems.value.find(i => i.key === key)) return;

    impactFeedback('soft');
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

  if (clicks < 4) return;

  if (previousHoldTimeout !== -1) {
    clearTimeout(previousHoldTimeout);
  }

  clicks = 0;
  showHelper.value = true;

  previousHoldTimeout = setTimeout(() => {
    showHelper.value = false;
    previousHoldTimeout = -1;
  }, 2500);
});

useEventListener('pointermove', event => {
  const item = hoveredItem.value;
  hoveredItem.value = null;

  if (!isHolding.value) return;

  event.preventDefault();

  const key = (event.target as HTMLElement)?.dataset['popupKey'];
  if (key) {
    if (item !== key) {
      selectionFeedback();
    }

    hoveredItem.value = key as Key;
  }
});

onMounted(() => {
  recalculatePositions();
  setTimeout(() => recalculatePositions(), 200);
});
watch(() => props.items, () => recalculatePositions(), { deep: true });
watch(popoutElement, () => recalculatePositions());
watch(itemRefs, () => recalculatePositions());
useEventListener('DOMContentLoaded', () => recalculatePositions());
useEventListener('load', () => recalculatePositions());
useInterval(recalculatePositions, 1500); // I don't know why but it keeps glitching out
</script>