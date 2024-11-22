// Display loader with progress
function showLoader(total) {
  const loader = document.getElementById("loader");
  const progressText = document.getElementById("progressText");
  const inputFile = document.getElementById("fileInput");
  const processBtn = document.getElementById("processBtn");

  if (!loader || !progressText) {
      console.warn("Loader or progress text element not found.");
      return;
  }

  loader.style.display = "flex";
  inputFile.style.display = "none";
  processBtn.style.display = "none";
  progressText.textContent = `Processed: 0 / ${total}`;
}

// Update loader with progress
function updateLoader(processed, total) {
  const progressText = document.getElementById("progressText");
  if (!progressText) {
      console.warn("Progress text element not found.");
      return;
  }
  progressText.textContent = `Processed: ${processed} / ${total}`;
}

// Hide loader
function hideLoader() {
  const loader = document.getElementById("loader");
  const inputFile = document.getElementById("fileInput");
  const processBtn = document.getElementById("processBtn");
  if (!loader) {
      console.warn("Loader element not found.");
      return;
  }
  inputFile.style.display = "block";
  processBtn.style.display = "block";
  loader.style.display = "none";
}

// Process addresses with dynamic progress tracking
async function processAddresses(dataRows) {
  let currentIndex = 0;
  const total = dataRows.length;

  function processNext() {
      if (currentIndex >= total) {
          console.log("Address processing completed.");
          const csvData = convertToCSV(dataRows);
          downloadCSV(csvData);
          hideLoader();
          return;
      }

      const row = dataRows[currentIndex];
      const address = row[1]; // Assume address is in the second column

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length === 0) {
              console.error("No active tabs found.");
              row.push("Error: No active tab");
              currentIndex++;
              updateLoader(currentIndex, total);
              processNext();
              return;
          }

          const tabId = tabs[0].id;

          chrome.tabs.sendMessage(
              tabId,
              { action: "searchAddress", address },
              (response) => {
                  if (chrome.runtime.lastError) {
                      console.error("Error sending request:", chrome.runtime.lastError.message);
                      row.push("Error: Request failed");
                  } else if (response && response.result) {
                      row.push(response.result);
                  } else {
                      row.push("No result found");
                  }

                  currentIndex++;
                  updateLoader(currentIndex, total);
                  processNext();
              }
          );
      });
  }

  processNext();
}

// Convert data to CSV
function convertToCSV(data) {
  if (!data || !data.length) {
      return "";
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
      headers
          .map((header) => `"${(row[header] || "").toString().replace(/"/g, '""')}"`)
          .join(",")
  );

  const csvContent = [headers.join(","), ...rows].join("\n");
  const bom = "\uFEFF"; // Add BOM for UTF-8
  return bom + csvContent;
}

// Download CSV file
function downloadCSV(data) {
  const csvBlob = new Blob([data], { type: "text/csv;charset=utf-8;" });
  const csvUrl = URL.createObjectURL(csvBlob);
  const csvLink = document.createElement("a");
  csvLink.href = csvUrl;
  csvLink.download = "ProcessedAddresses.csv";
  document.body.appendChild(csvLink);
  csvLink.click();
  document.body.removeChild(csvLink);
  URL.revokeObjectURL(csvUrl);
}

// Event listener for process button
document.getElementById("processBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files.length) {
      alert("Please select a file.");
      return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async (event) => {
      const csvText = event.target.result;
      const rows = csvText
          .split("\n")
          .map((row) => row.split(";")) // Assume ";" as the delimiter
          .filter((row) => row.length > 1 && row.some((cell) => cell.trim() !== ""));

      if (rows.length < 2) {
          alert("CSV file is empty or contains only headers.");
          return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      console.log("Extracted rows:", dataRows);

      if (dataRows.length === 0) {
          alert("No data to process.");
          return;
      }

      showLoader(dataRows.length);
      await processAddresses(dataRows);
  };

  reader.readAsText(file, "UTF-8");
});
