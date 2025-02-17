let t = localStorage.getItem('theme');
try {
    if (t) t = JSON.parse(t);
} catch {
    t = null;
}

if (typeof t !== 'object' || t === null || !('name' in t)) {
    t = { name: 'grapefruit', dark: 'never' };
}

const setDark = t.dark === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : t.dark === 'always';

const currentBody = document.body;
const s = (b) => {
    b.classList.toggle('dark', setDark);
    b.dataset.theme = t.name;
};

if (currentBody) {
    s(currentBody);
} else {
    document.addEventListener('DOMContentLoaded', () => s(document.body));
}