document.getElementById('processFile').addEventListener('click', async () => {
    const fileInput = document.getElementById('uploadFile');
    if (fileInput.files.length === 0) {
      alert('Please upload a file!');
      return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
  
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      const mammoth = await import('https://unpkg.com/mammoth/mammoth.browser.min.js');
      const result = await mammoth.extractRawText({ arrayBuffer });
      const addresses = result.value.trim().split('\n');
      
      chrome.storage.local.set({ addresses }, () => {
        alert('Addresses processed and stored! Open the target site and click to start.');
      });
    };
  
    reader.readAsArrayBuffer(file);
  });
  