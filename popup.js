document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const processBtn = document.getElementById("processBtn");

  processBtn.addEventListener("click", () => {
    if (!fileInput.files.length) {
      alert("Пожалуйста, выберите CSV файл.");
      return;
    }

    const file = fileInput.files[0];
    if (!file.name.endsWith(".csv")) {
      alert("Пожалуйста, выберите файл в формате CSV.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const csvData = event.target.result;
      chrome.runtime.sendMessage(
        { action: "processCSV", data: csvData },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Ошибка при отправке данных в background.js:", chrome.runtime.lastError.message);
            alert("Ошибка при отправке данных в background.js");
            return;
          }

          if (response.status === "success") {
            alert("CSV файл успешно обработан. Начинается обработка адресов.");
          } else {
            alert(`Ошибка: ${response.message}`);
          }
        }
      );
    };

    reader.readAsText(file);
  });
});
