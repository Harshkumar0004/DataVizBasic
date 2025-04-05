let parsedData = [];
let originalData = [];
let chartInstance;
const chartCanvas = document.getElementById('chartCanvas');

// Event listeners
document.getElementById('fileInput').addEventListener('change', handleFileUpload);
document.getElementById('plotBtn').addEventListener('click', plotChart);
document.getElementById('suggestBtn').addEventListener('click', suggestChartType);
document.getElementById('applyFilterBtn').addEventListener('click', applyFilter);
document.getElementById('resetFilterBtn').addEventListener('click', resetFilter);

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const content = e.target.result;
    parsedData = file.name.endsWith('.csv') ? parseCSV(content) : JSON.parse(content);
    originalData = [...parsedData];

    displayTable(parsedData);
    populateDropdowns(parsedData);
    populateFilterDropdown();
  };
  reader.readAsText(file);
}

function parseCSV(data) {
  const lines = data.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim();
    });
    return obj;
  });
}

function displayTable(data) {
  const container = document.getElementById('tableContainer');
  container.innerHTML = '';

  if (!data.length) return;

  const table = document.createElement('table');
  const headers = Object.keys(data[0]);
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach(row => {
    const tr = document.createElement('tr');
    headers.forEach(h => {
      const td = document.createElement('td');
      td.textContent = row[h];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function populateDropdowns(data) {
  const headers = Object.keys(data[0]);
  const xSelect = document.getElementById('xSelect');
  const ySelect = document.getElementById('ySelect');

  xSelect.innerHTML = '<option value="">Select</option>';
  ySelect.innerHTML = '<option value="">Select</option>';

  headers.forEach(h => {
    const xOpt = document.createElement('option');
    xOpt.value = h;
    xOpt.textContent = h;
    xSelect.appendChild(xOpt);

    const yOpt = document.createElement('option');
    yOpt.value = h;
    yOpt.textContent = h;
    ySelect.appendChild(yOpt);
  });
}

function populateFilterDropdown() {
  const filterColSelect = document.getElementById('filterColumn');
  filterColSelect.innerHTML = '';
  if (!parsedData.length) return;

  const columns = Object.keys(parsedData[0]);
  columns.forEach(col => {
    const option = document.createElement('option');
    option.value = col;
    option.textContent = col;
    filterColSelect.appendChild(option);
  });
}

function applyFilter() {
    const filterCol = document.getElementById('filterColumn').value;
    const filterVal = document.getElementById('filterValue').value.trim().toLowerCase();
    if (!filterCol || !filterVal) return;
  
    const filteredData = originalData.filter(row =>
      String(row[filterCol]).toLowerCase().includes(filterVal)
    );
  
    if (filteredData.length === 0) {
      alert('No matching data found for this filter.');
      return;
    }
  
    // ✅ Preserve current selections
    const prevX = document.getElementById('xSelect').value;
    const prevY = document.getElementById('ySelect').value;
  
    parsedData = filteredData;
    document.getElementById('filteredTitle').style.display = 'block';
  
    // ✅ Re-render dropdowns
    populateDropdowns(parsedData);
    populateFilterDropdown();
  
    // ✅ Wait for DOM to update before setting values and updating chart
    setTimeout(() => {
      const xSelect = document.getElementById('xSelect');
      const ySelect = document.getElementById('ySelect');
  
      if ([...xSelect.options].some(opt => opt.value === prevX)) {
        xSelect.value = prevX;
      }
      if ([...ySelect.options].some(opt => opt.value === prevY)) {
        ySelect.value = prevY;
      }
  
      displayTable(parsedData);
      updateChartWithData(parsedData); // ✅ Now works correctly!
    }, 0);
  }
  

function resetFilter() {
  parsedData = [...originalData];

  // Preserve selected X and Y axis values
  const currentX = document.getElementById('xSelect').value;
  const currentY = document.getElementById('ySelect').value;

  displayTable(parsedData);
  populateFilterDropdown(); // only refresh filter dropdown

  // Restore selections if still valid
  const xSelect = document.getElementById('xSelect');
  const ySelect = document.getElementById('ySelect');
  if (currentX) xSelect.value = currentX;
  if (currentY) ySelect.value = currentY;

  document.getElementById('filterValue').value = '';
  document.getElementById('filteredTitle').style.display = 'none';

  plotChart(); // update chart with full data
}

function plotChart() {
  updateChartWithData(parsedData);
}

function updateChartWithData(data) {
  const xCol = document.getElementById('xSelect').value;
  const yCol = document.getElementById('ySelect').value;
  if (!xCol || !yCol) return;

  const xIsNumeric = !isNaN(parseFloat(data[0][xCol]));
  const yIsNumeric = !isNaN(parseFloat(data[0][yCol]));

  let config;
  if (!xIsNumeric && yIsNumeric) {
    const xData = data.map(row => row[xCol]);
    const yData = data.map(row => parseFloat(row[yCol]));
    config = {
      type: 'bar',
      data: {
        labels: xData,
        datasets: [{
          label: `${yCol} vs ${xCol}`,
          data: yData,
          backgroundColor: 'rgba(75, 192, 192, 0.7)'
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    };
  } else if (xIsNumeric && yIsNumeric) {
    config = {
      type: 'scatter',
      data: {
        datasets: [{
          label: `${yCol} vs ${xCol}`,
          data: data.map(row => ({ x: parseFloat(row[xCol]), y: parseFloat(row[yCol]) })),
          backgroundColor: 'rgba(255, 99, 132, 0.7)'
        }]
      },
      options: { responsive: true, scales: { x: { type: 'linear' }, y: { beginAtZero: true } } }
    };
  } else {
    const freqMap = {};
    const xCategories = new Set();
    const yCategories = new Set();
    data.forEach(row => {
      const xVal = row[xCol];
      const yVal = row[yCol];
      if (!xVal || !yVal) return;
      xCategories.add(xVal);
      yCategories.add(yVal);
      const key = `${xVal}__${yVal}`;
      freqMap[key] = (freqMap[key] || 0) + 1;
    });

    const datasets = Array.from(yCategories).map(yVal => {
      return {
        label: yVal,
        data: Array.from(xCategories).map(xVal => freqMap[`${xVal}__${yVal}`] || 0),
        backgroundColor: getRandomColor()
      };
    });

    config = {
      type: 'bar',
      data: { labels: Array.from(xCategories), datasets: datasets },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: `${yCol} distribution across ${xCol}` } },
        scales: { y: { beginAtZero: true } }
      }
    };
  }

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(chartCanvas, config);
}

function suggestChartType() {
  const xCol = document.getElementById('xSelect').value;
  const yCol = document.getElementById('ySelect').value;
  if (!xCol || !yCol) return;

  const xIsNumeric = !isNaN(parseFloat(parsedData[0][xCol]));
  const yIsNumeric = !isNaN(parseFloat(parsedData[0][yCol]));

  let suggestion = '';
  if (!xIsNumeric && !yIsNumeric) {
    suggestion = '📊 Recommended: Grouped Bar Chart (Categorical vs Categorical)';
  } else if (!xIsNumeric && yIsNumeric) {
    suggestion = '📊 Recommended: Bar Chart (Categorical vs Numeric)';
  } else if (xIsNumeric && yIsNumeric) {
    suggestion = '📈 Recommended: Scatter Plot or Line Chart (Numeric vs Numeric)';
  } else if (xIsNumeric && !yIsNumeric) {
    suggestion = '📊 Recommended: Bar Chart (switch X and Y for better results)';
  } else {
    suggestion = '🤔 Recommended: Custom Exploration';
  }

  document.getElementById('suggestionText').textContent = suggestion;
}

function getRandomColor() {
  const r = () => Math.floor(Math.random() * 200);
  return `rgba(${r()}, ${r()}, ${r()}, 0.7)`;
}