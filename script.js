const taskElement = document.getElementById('task-element');
const greetingButton = document.getElementById('greetingButton');

greetingButton.addEventListener('click', () => {
  const isGreeting = taskElement.textContent === 'Привет, мир!';
  taskElement.textContent = isGreeting ? 'Исходный текст' : 'Привет, мир!';
  greetingButton.textContent = isGreeting ? 'Изменить текст' : 'Вернуть исходный текст';
});

const newElementButton = document.getElementById('newElementButton');
const newDiv = document.createElement('div');
newDiv.className = 'new-div';
newDiv.textContent = 'Я новый элемент';

newElementButton.addEventListener('click', () => {
  if (newDiv.isConnected) {
    newDiv.remove();
    newElementButton.textContent = 'Добавить элемент';
  } else {
    document.body.appendChild(newDiv);
    newElementButton.textContent = 'Убрать элемент';
  }
});

const toggleParagraph = document.getElementById('toggleParagraph');
function toggleParagraphStyle() {
  const isChanged = toggleParagraph.classList.toggle('changed');
  toggleParagraph.setAttribute('aria-pressed', String(isChanged));
}

toggleParagraph.addEventListener('click', toggleParagraphStyle);
toggleParagraph.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  toggleParagraphStyle();
});

const classTarget = document.getElementById('classTarget');
const classToggleButton = document.getElementById('classToggleButton');
const classListOutput = document.getElementById('classListOutput');

function showElementClasses() {
  const classes = Array.from(classTarget.classList);
  console.log('Классы элемента:', classes);
  classListOutput.textContent = `Классы элемента: ${classes.join(', ')}`;
}

classToggleButton.addEventListener('click', () => {
  const isActive = classTarget.classList.toggle('active');
  classToggleButton.textContent = isActive ? 'Убрать active' : 'Добавить active';
  showElementClasses();
});

showElementClasses();

const tableForm = document.getElementById('tableForm');
const rowCountInput = document.getElementById('rowCount');
const columnCountInput = document.getElementById('columnCount');
const cellColorInput = document.getElementById('cellColor');
const tableContainer = document.getElementById('tableContainer');
const tableError = document.getElementById('tableError');
const coloredCellCount = document.getElementById('coloredCellCount');
const paintedCellCount = document.getElementById('paintedCellCount');
const usedColorCount = document.getElementById('usedColorCount');
const usedColorList = document.getElementById('usedColorList');

function countCellsByColor(color) {
  const cells = tableContainer.querySelectorAll('td');
  return Array.from(cells).filter((cell) => cell.dataset.color === color.toLowerCase()).length;
}

function updateColorStats() {
  const paintedCells = Array.from(tableContainer.querySelectorAll('td[data-color]'));
  const colorCounts = new Map();

  for (const cell of paintedCells) {
    const color = cell.dataset.color;
    colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
  }

  coloredCellCount.textContent = `Количество ячеек выбранного цвета: ${countCellsByColor(cellColorInput.value)}`;
  paintedCellCount.textContent = `Всего окрашенных ячеек: ${paintedCells.length}`;
  usedColorCount.textContent = `Количество использованных цветов: ${colorCounts.size}`;

  if (colorCounts.size === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.textContent = 'Пока нет окрашенных ячеек.';
    usedColorList.replaceChildren(emptyItem);
    return;
  }

  const items = Array.from(colorCounts, ([color, count]) => {
    const item = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color;
    swatch.setAttribute('aria-hidden', 'true');
    item.append(swatch, `${color.toUpperCase()} — ${count} яч.`);
    return item;
  });

  usedColorList.replaceChildren(...items);
}

function createTable(rows, columns) {
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || rows > 50 || columns < 1 || columns > 50) {
    tableError.textContent = 'Количество строк и столбцов должно быть целым числом в диапазоне 1–50.';
    return;
  }

  tableError.textContent = '';
  const table = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = `${rows} строк × ${columns} столбцов`;
  table.appendChild(caption);
  const tbody = document.createElement('tbody');

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = document.createElement('tr');
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const cell = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${rowIndex + 1}:${columnIndex + 1}`;
      button.setAttribute('aria-label', `${rowIndex + 1}-строка, ${columnIndex + 1}-столбец: раскрасить`);
      button.setAttribute('aria-pressed', 'false');
      cell.appendChild(button);
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  tableContainer.replaceChildren(table);
  updateColorStats();
  return table;
}

tableForm.addEventListener('submit', (event) => {
  event.preventDefault();
  createTable(Number(rowCountInput.value), Number(columnCountInput.value));
});

tableContainer.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || !tableContainer.contains(button)) return;

  const cell = button.closest('td');
  const color = cellColorInput.value.toLowerCase();

  if (cell.dataset.color === color) {
    delete cell.dataset.color;
    cell.style.backgroundColor = '';
  } else {
    cell.dataset.color = color;
    cell.style.backgroundColor = color;
  }

  button.setAttribute('aria-pressed', String(Boolean(cell.dataset.color)));
  updateColorStats();
});

cellColorInput.addEventListener('input', updateColorStats);

const themeToggle = document.getElementById('themeToggle');
const taskThemeToggle = document.getElementById('taskThemeToggle');
const tabButtons = Array.from(document.querySelectorAll('[role="tab"]'));
const tabPanels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
const profileName = document.getElementById('profileName');
const profileRole = document.getElementById('profileRole');
const profilePhoto = document.getElementById('profilePhoto');

const profilePhotos = {
  frontend: ['#1e3a8a', '#60a5fa', 'Ж'],
  backend: ['#0f766e', '#34d399', 'Е'],
  devops: ['#4c1d95', '#a78bfa', 'Д'],
  qa: ['#92400e', '#fbbf24', 'З']
};

function applyColorMode(mode) {
  const isDark = mode === 'dark';
  document.body.dataset.colorMode = isDark ? 'dark' : 'light';

  if (themeToggle) {
    themeToggle.setAttribute('aria-checked', String(isDark));
  }

  if (taskThemeToggle) {
    taskThemeToggle.setAttribute('aria-checked', String(isDark));
  }

  try {
    localStorage.setItem('color-mode', document.body.dataset.colorMode);
  } catch {}
}

let savedColorMode = 'light';
try {
  savedColorMode = localStorage.getItem('color-mode') === 'dark' ? 'dark' : 'light';
} catch {}

applyColorMode(savedColorMode);

const toggleThemeMode = () => {
  const nextMode = document.body.dataset.colorMode === 'dark' ? 'light' : 'dark';
  applyColorMode(nextMode);
};

if (themeToggle) {
  themeToggle.addEventListener('click', toggleThemeMode);
}

if (taskThemeToggle) {
  taskThemeToggle.addEventListener('click', toggleThemeMode);
}

function updateProfileHeader(targetId) {
  const activePanel = document.getElementById(targetId);
  if (!activePanel) return;

  const theme = activePanel.dataset.theme || 'frontend';
  document.body.dataset.theme = theme;

  const isTasksPanel = targetId.startsWith('task-');
  document.body.classList.toggle('tasks-active', isTasksPanel);

  if (isTasksPanel) return;

  profileName.textContent = activePanel.dataset.name;
  profileRole.textContent = activePanel.dataset.role;

  const palette = profilePhotos[targetId] || ['#2563eb', '#93c5fd', 'A'];
  profilePhoto.style.background = `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`;
  profilePhoto.textContent = palette[2];
}

function activateTab(selectedButton, moveFocus = false) {
  const targetId = selectedButton.dataset.target;

  for (const button of tabButtons) {
    const isSelected = button === selectedButton;
    button.classList.toggle('active', isSelected);
    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  }

  for (const panel of tabPanels) {
    const isSelected = panel.id === targetId;
    panel.classList.toggle('active', isSelected);
    panel.hidden = !isSelected;
  }

  updateProfileHeader(targetId);
  if (moveFocus) selectedButton.focus();
}

for (const button of tabButtons) {
  button.addEventListener('click', () => activateTab(button));
  button.addEventListener('keydown', (event) => {
    const currentIndex = tabButtons.indexOf(button);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabButtons.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabButtons.length - 1;
    if (nextIndex === currentIndex) return;

    event.preventDefault();
    activateTab(tabButtons[nextIndex], true);
  });
}

activateTab(tabButtons[0]);
updateProfileHeader('frontend');
createTable(3, 3);
