document.getElementById('excelFile').addEventListener('change', handleFile, false);

const productInput = document.querySelector('.search-bar input[placeholder="제품명을 입력하세요"]');
const dateInput = document.querySelector('.search-bar input[type="date"]');

productInput.addEventListener('input', filterData);
dateInput.addEventListener('input', filterData);

let originalData = [];
let chartTensile = null;
let chartElongation = null;
let chartModulus = null;

function handleFile(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    originalData = json;
    renderTable(json);
    renderCharts(json);
  };

  reader.readAsArrayBuffer(file);
}

function filterData() {
  const keyword = productInput.value.trim();
  const selectedDate = dateInput.value;

  if (originalData.length === 0) return;

  const header = originalData[0];
  const dataRows = originalData.slice(1);

  const productIndex = header.findIndex(col => col.includes("제품"));
  const dateIndex = header.findIndex(col => col.includes("날짜"));

  const filtered = dataRows.filter(row => {
    const productMatch = !keyword || (row[productIndex] && row[productIndex].toString().includes(keyword));
    let dateMatch = true;
    if (selectedDate) {
      const inputDate = selectedDate.slice(2).replace(/-/g, '.'); // 예: 25.07.22
      dateMatch = row[dateIndex] && row[dateIndex].toString().startsWith(inputDate);
    }
    return productMatch && dateMatch;
  });

  const filteredData = [header, ...filtered];
  renderTable(filteredData);
  renderCharts(filteredData);
}

function renderTable(data) {
  const container = document.getElementById('excelTable');
  container.innerHTML = '';

  const table = document.createElement('table');
  data.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement(rowIndex === 0 ? 'th' : 'td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  container.appendChild(table);
}

function renderCharts(data) {
  const header = data[0];
  const rows = data.slice(1);

  const dateIdx = header.findIndex(col => col.includes("날짜"));
  const tensileIdx = header.findIndex(col => col.includes("인장강도"));
  const elongationIdx = header.findIndex(col => col.includes("연신") || col.includes("연실"));
  const modulusIdx = header.findIndex(col => col.includes("모듈러스"));

  if ([dateIdx, tensileIdx, elongationIdx, modulusIdx].includes(-1)) {
    console.warn("헤더 이름을 찾을 수 없습니다. 그래프를 건너뜁니다.");
    return;
  }

  const tensileData = [], elongationData = [], modulusData = [];

  rows.forEach(row => {
    const x = row[dateIdx];
    if (x) {
      tensileData.push({ x, y: parseFloat(row[tensileIdx]) || 0 });
      elongationData.push({ x, y: parseFloat(row[elongationIdx]) || 0 });
      modulusData.push({ x, y: parseFloat(row[modulusIdx]) || 0 });
    }
  });

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#fff' } }
    },
    scales: {
      x: {
        type: 'category',
        title: { display: true, text: '날짜', color: '#fff' },
        ticks: { color: '#fff' }
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: '값', color: '#fff' },
        ticks: { color: '#fff' }
      }
    }
  };

  const chartColor = '#00e0ff';

  const createChart = (id, label, dataset, chartRef) => {
    const ctx = document.getElementById(id)?.getContext('2d');
    if (!ctx) return;
    if (chartRef) chartRef.destroy?.();

    return new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{ label, data: dataset, backgroundColor: chartColor, pointRadius: 3 }]
      },
      options
    });
  };

  chartTensile = createChart("chartTensile", "인장강도", tensileData, chartTensile);
  chartElongation = createChart("chartElongation", "연신율 (%)", elongationData, chartElongation);
  chartModulus = createChart("chartModulus", "모듈러스", modulusData, chartModulus);
}

