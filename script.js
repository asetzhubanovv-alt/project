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
const colorSelect = document.getElementById('colorSelect');
const tableWrapper = document.getElementById('tableWrapper');
const countOutput = document.getElementById('countOutput');
const buildTableBtn = document.getElementById('buildTableBtn');

function getColorNameByValue(value) {
  return {
    red: 'red',
    yellow: 'yellow',
    green: 'green',
    blue: 'blue',
  }[value] || 'white';
}

function countCellsByColor(color) {
  return [...document.querySelectorAll('.table-cell')].filter(
    (cell) => cell.dataset.color === color
  ).length;
}

function updateCount() {
  const selectedColor = getColorNameByValue(colorSelect.value);
  countOutput.textContent = countCellsByColor(selectedColor);
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
        const selectedColor = getColorNameByValue(colorSelect.value);
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
colorSelect.addEventListener('change', updateCount);

buildTable();

const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-mode');
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.classList.toggle('active', isDark);
});
