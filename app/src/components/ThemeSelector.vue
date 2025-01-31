<template>
  <div class="flex flex-col gap-2">
    <PopoutMenu
        v-if="themeItems.length !== 0"
        variant="accent"
        :items="themeItems"
        @select="t => changeTheme(t as unknown as Theme['name'])"
        @start="() => emit('clear-unread')"
    >
      <div
          :class="showUnread ? 'animate-ping opacity-100' : 'opacity-0'"
          class="transition-opacity fixed w-2 h-2 bg-primary-500 rounded-full" />

      {{ THEME_EMOJIS[currentTheme.name] }}
    </PopoutMenu>

    <PopoutMenu
        variant="accent"
        :items="darkModeItems[0]"
        @select="k => changeDarkMode(k as unknown as Theme['dark'])"
    >
      {{ darkModeItems[1].label }}
    </PopoutMenu>
  </div>
</template>

<script setup lang="ts">
import { type Theme, THEME_EMOJIS, THEMES } from '@/composables/theme.composable.ts';
import PopoutMenu, { type PopoutItem } from '@/components/PopoutMenu.vue';
import { computed } from 'vue';

const props = defineProps<{
  showUnread: boolean;
  earned: (typeof THEMES[number])[];
  currentTheme: Theme;
}>();

const emit = defineEmits<{
  'change-theme': [theme: Theme];
  'clear-unread': [];
}>();

const darkModeItems = computed<[PopoutItem[], PopoutItem]>(() => {
  const items: PopoutItem[] = [
    { label: '🤖', key: 'system', variant: 'primary' },
    { label: '☀️', key: 'never', variant: 'primary' },
    { label: '🌑', key: 'always', variant: 'primary' },
  ];

  const current = items.findIndex(i => i.key === props.currentTheme.dark);
  const item = items.splice(current, 1)[0];

  return [items, item];
});

function changeDarkMode(key: Theme['dark']) {
  emit('change-theme', { name: props.currentTheme.name, dark: key });
}

const themeItems = computed<PopoutItem[]>(() => props.earned
    .filter(t => t !== props.currentTheme.name)
    .map(t => ({
      label: THEME_EMOJIS[t],
      key: t,
      variant: 'primary'
    }))
);

function changeTheme(theme: typeof THEMES[number]) {
  emit('change-theme', { name: theme, dark: props.currentTheme.dark });
}
</script>