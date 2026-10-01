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
  { name: 'Красный', value: 'red', hex: '#f87171' },
  { name: 'Жёлтый', value: 'yellow', hex: '#facc15' },
  { name: 'Зелёный', value: 'green', hex: '#4ade80' },
  { name: 'Синий', value: 'blue', hex: '#60a5fa' },
  { name: 'Фиолетовый', value: 'purple', hex: '#a78bfa' },
  { name: 'Оранжевый', value: 'orange', hex: '#fb923c' },
  { name: 'Розовый', value: 'pink', hex: '#f472b6' },
  { name: 'Бирюзовый', value: 'teal', hex: '#2dd4bf' },
  { name: 'Чёрный', value: 'black', hex: '#111827' },
  { name: 'Белый', value: 'white', hex: '#ffffff' },
  { name: 'Серый', value: 'gray', hex: '#94a3b8' },
  { name: 'Голубой', value: 'cyan', hex: '#22d3ee' },
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
