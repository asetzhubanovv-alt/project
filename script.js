const mainTabs = document.querySelectorAll('.main-tab');
const mainPanels = document.querySelectorAll('.main-panel');

const resumeTabs = document.querySelectorAll('.tab');
const resumePanels = document.querySelectorAll('.tab-panel');

function activateMainTab(targetTab) {
  mainTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.main === targetTab);
  });

  mainPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetTab);
  });
}

function activateResumeTab(targetTab) {
  resumeTabs.forEach((tab) => {
    const isActive = tab.dataset.tab === targetTab;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  resumePanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetTab);
  });
}

mainTabs.forEach((tab) => {
  tab.addEventListener('click', () => activateMainTab(tab.dataset.main));
});

resumeTabs.forEach((tab) => {
  tab.addEventListener('click', () => activateResumeTab(tab.dataset.tab));
});

const rowsInput = document.getElementById('rowsInput');
const colsInput = document.getElementById('colsInput');
const tableWrapper = document.getElementById('tableWrapper');
const countOutput = document.getElementById('countOutput');
const buildTableBtn = document.getElementById('buildTableBtn');
const colorPalette = document.getElementById('colorPalette');
const colorUsageList = document.getElementById('colorUsageList');

const paletteColors = [
  { name: 'Красный', value: 'red', hex: '#ef4444' },
  { name: 'Красно-оранжевый', value: 'redOrange', hex: '#f97316' },
  { name: 'Оранжевый', value: 'orange', hex: '#f59e0b' },
  { name: 'Янтарный', value: 'amber', hex: '#fbbf24' },
  { name: 'Жёлтый', value: 'yellow', hex: '#facc15' },
  { name: 'Лайм', value: 'lime', hex: '#a3e635' },
  { name: 'Зелёный', value: 'green', hex: '#22c55e' },
  { name: 'Мятный', value: 'mint', hex: '#34d399' },
  { name: 'Бирюзовый', value: 'teal', hex: '#2dd4bf' },
  { name: 'Циан', value: 'cyan', hex: '#22d3ee' },
  { name: 'Небесный', value: 'sky', hex: '#38bdf8' },
  { name: 'Голубой', value: 'blue', hex: '#3b82f6' },
  { name: 'Индиго', value: 'indigo', hex: '#6366f1' },
  { name: 'Фиолетовый', value: 'purple', hex: '#8b5cf6' },
  { name: 'Лаванда', value: 'lavender', hex: '#a78bfa' },
  { name: 'Розовый', value: 'pink', hex: '#ec4899' },
  { name: 'Фуксия', value: 'fuchsia', hex: '#d946ef' },
  { name: 'Розово-красный', value: 'rose', hex: '#fb7185' },
  { name: 'Коричневый', value: 'brown', hex: '#a16207' },
  { name: 'Чёрный', value: 'black', hex: '#111827' },
  { name: 'Серый', value: 'gray', hex: '#94a3b8' },
  { name: 'Белый', value: 'white', hex: '#ffffff' },
  { name: 'Серебристый', value: 'silver', hex: '#cbd5e1' },
  { name: 'Пурпурный', value: 'magenta', hex: '#e879f9' },
  { name: 'Темно-синий', value: 'navy', hex: '#1d4ed8' },
  { name: 'Темно-зелёный', value: 'darkGreen', hex: '#15803d' },
  { name: 'Тёмно-фиолетовый', value: 'darkPurple', hex: '#6d28d9' },
  { name: 'Бежевый', value: 'beige', hex: '#f5d0a9' },
  { name: 'Оливковый', value: 'olive', hex: '#a3a000' },
  { name: 'Графит', value: 'graphite', hex: '#374151' },
  { name: 'Горчичный', value: 'mustard', hex: '#ca8a04' },
  { name: 'Аметист', value: 'amethyst', hex: '#8b5cf6' },
  { name: 'Светло-голубой', value: 'lightBlue', hex: '#93c5fd' },
  { name: 'Светло-розовый', value: 'lightPink', hex: '#f9a8d4' },
  { name: 'Лаймовый', value: 'limeGreen', hex: '#84cc16' },
  { name: 'Светло-зелёный', value: 'lightGreen', hex: '#86efac' },
  { name: 'Песочный', value: 'sand', hex: '#e7d7a6' },
  { name: 'Кармин', value: 'crimson', hex: '#dc2626' },
  { name: 'Черничный', value: 'blueberry', hex: '#312e81' },
  { name: 'Сапфировый', value: 'sapphire', hex: '#2563eb' },
  { name: 'Тёмно-оранжевый', value: 'darkOrange', hex: '#c2410c' },
  { name: 'Золотой', value: 'gold', hex: '#fbbf24' },
  { name: 'Светло-серый', value: 'lightGray', hex: '#e5e7eb' },
  { name: 'Тёмно-серый', value: 'darkGray', hex: '#4b5563' },
  { name: 'Смородиновый', value: 'currant', hex: '#7c2d12' },
  { name: 'Мандариновый', value: 'mandarin', hex: '#fb923c' },
  { name: 'Винный', value: 'wine', hex: '#7f1d1d' },
  { name: 'Лимонный', value: 'lemon', hex: '#fde047' },
  { name: 'Коралловый', value: 'coral', hex: '#ff7f50' },
  { name: 'Земляничный', value: 'strawberry', hex: '#be123c' },
  { name: 'Натуральный', value: 'natural', hex: '#d6d3d1' },
  { name: 'Брусничный', value: 'cranberry', hex: '#9d174d' },
  { name: 'Сине-фиолетовый', value: 'blueViolet', hex: '#4f46e5' },
  { name: 'Салатовый', value: 'salad', hex: '#a3e635' },
  { name: 'Ледяной', value: 'ice', hex: '#dbeafe' },
  { name: 'Гранатовый', value: 'garnet', hex: '#7f1d1d' },
  { name: 'Пепельный', value: 'ash', hex: '#9ca3af' },
  { name: 'Пастельно-зелёный', value: 'pastelGreen', hex: '#bbf7d0' },
  { name: 'Пастельно-голубой', value: 'pastelBlue', hex: '#bfdbfe' },
  { name: 'Пастельно-розовый', value: 'pastelPink', hex: '#fbcfe8' },
  { name: 'Пастельно-жёлтый', value: 'pastelYellow', hex: '#fef3c7' },
  { name: 'Пастельно-фиолетовый', value: 'pastelPurple', hex: '#ddd6fe' },
  { name: 'Пастельно-оранжевый', value: 'pastelOrange', hex: '#fed7aa' },
  { name: 'Травяной', value: 'grass', hex: '#65a30d' },
  { name: 'Пихтовый', value: 'pine', hex: '#166534' },
  { name: 'Морской', value: 'deepSea', hex: '#0f766e' }
];

let selectedColor = 'blue';

function getColorNameByValue(value) {
  const found = paletteColors.find((color) => color.value === value);
  return found ? found.value : 'white';
}

function getColorLabel(value) {
  const found = paletteColors.find((color) => color.value === value);
  return found ? found.name : 'Белый';
}

function renderPalette() {
  colorPalette.innerHTML = '';

  paletteColors.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-swatch';
    button.dataset.color = color.value;
    button.title = color.name;
    button.style.background = color.hex;
    button.setAttribute('aria-label', color.name);

    if (selectedColor === color.value) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      selectedColor = color.value;
      renderPalette();
      updateCount();
    });

    colorPalette.appendChild(button);
  });
}

function countCellsByColor(color) {
  return [...document.querySelectorAll('.table-cell')].filter(
    (cell) => cell.dataset.color === color
  ).length;
}

function updateUsageList() {
  const usageEntries = paletteColors.map((color) => ({
    ...color,
    count: countCellsByColor(color.value),
  }));

  const usedColors = usageEntries.filter((item) => item.count > 0);

  colorUsageList.innerHTML = '';

  if (usedColors.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'Цвета ещё не использованы';
    colorUsageList.appendChild(item);
    return;
  }

  usedColors.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'usage-item';
    li.innerHTML = `
      <span class="usage-swatch" style="background:${item.hex}"></span>
      <span>${item.name}</span>
      <strong>${item.count}</strong>
    `;
    colorUsageList.appendChild(li);
  });
}

function updateCount() {
  countOutput.textContent = countCellsByColor(selectedColor);
  const selectedLabel = getColorLabel(selectedColor);
  document.title = `${selectedLabel}: ${countCellsByColor(selectedColor)}`;
  updateUsageList();
}

function buildTable() {
  const rows = Number(rowsInput.value) || 1;
  const cols = Number(colsInput.value) || 1;

  tableWrapper.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'task-table';

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = document.createElement('tr');

    for (let colIndex = 0; colIndex < cols; colIndex += 1) {
      const cell = document.createElement('td');
      cell.className = 'table-cell';
      cell.dataset.color = 'white';
      cell.title = `Ряд ${rowIndex + 1}, Баған ${colIndex + 1}`;
      cell.addEventListener('click', () => {
        cell.dataset.color = selectedColor;
        updateCount();
      });
      row.appendChild(cell);
    }

    table.appendChild(row);
  }

  tableWrapper.appendChild(table);
  updateCount();
}

buildTableBtn.addEventListener('click', buildTable);

renderPalette();
buildTable();

const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-mode');
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.classList.toggle('active', isDark);
});
