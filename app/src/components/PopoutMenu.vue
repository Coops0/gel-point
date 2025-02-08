<template>
  <div>
    <Teleport to="body">
      <div
          v-if="showHelper && elementPosition"
          class="fixed z-9 bg-primary-900 text-white p-2 rounded-md font-shippori"
          :style="{ top: `${elementPosition.y}px`, left: `${elementPosition.x - 100}px` }"
      >
        hold me ->
      </div>
    </Teleport>

    <div
        class="fixed"
    >
      <PopoutMenuItem v-for="(item, index) in alignedItems"
                      :key="item.key"
                      :x="item.x"
                      :y="item.y"
                      :label="item.label"
                      :variant="item.variant"
                      :popup-key="item.key"
                      :hovered="item.key === hoveredItem"
                      :index="index"
                      :active="isHolding"
                      :ref="itemRefIds"
      />
    </div>

    <GhostButton
        :variant
        class="px-4 py-2 rounded-md transition-all ease-out duration-150"
        @pointerdown.prevent="event => beginHold(event)"
        :ref="popoutId"
    >
      <span class="transition-all duration-150" :class="(emojiMode && !isHolding) ? 'grayscale' : ''"><slot/></span>
    </GhostButton>
  </div>
</template>

<script lang="ts" setup>
import GhostButton, { type GhostVariant } from '@/components/GhostButton.vue';
import { onMounted, ref, useId, useTemplateRef, watch } from 'vue';
import { useEventListener } from '@/composables/event-listener.composable.ts';
import { useInterval } from '@/composables/interval.composable.ts';
import PopoutMenuItem from '@/components/PopoutMenuItem.vue';
import { impactFeedback, selectionFeedback } from '@tauri-apps/plugin-haptics';

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
  if (!rect) return null;

  elementPosition.value = ({ x: rect.x, y: rect.y, height: rect.height, width: rect.width });

  let above = 0;

  alignedItems.value = props.items.map(item => {
    let x = rect.x;
    if (props.dynamicSized) {
      const rect = itemRefs.value
          ?.map(i => i.buttonElement?.$el)
          ?.filter(el => !!el)
          ?.find(r => r.dataset['popupKey'] === item.key)
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
    if (hoveredItem.value !== key) {
      selectionFeedback();
    }

    hoveredItem.value = key as Key;
  }
});

onMounted(() => recalculatePositions());
watch(() => props.items, () => recalculatePositions(), { deep: true });
watch(popoutElement, () => recalculatePositions());
watch(itemRefs, () => recalculatePositions());
useInterval(recalculatePositions, 1500); // I don't know why but it keeps glitching out
</script>