document.addEventListener('DOMContentLoaded', function() {
  const uploadForm = document.getElementById('uploadForm');
  const uploadStatus = document.getElementById('uploadStatus');
  const progressBar = document.getElementById('progressBar');
  const progressContainer = document.getElementById('progressContainer');
  const progressText = document.getElementById('progressText');
  const duplicateWarning = document.getElementById('duplicateWarning');

  if (uploadForm) {
      uploadForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const fileInput = document.getElementById('fileInput');
          const file = fileInput.files[0];
          
          if (!file) {
              showStatus('Please select a file', 'error');
              return;
          }

          const checksum = await calculateChecksum(file);
          
          try {
              const checkResponse = await fetch(`/check-duplicate/${checksum}`);
              const checkData = await checkResponse.json();

              if (checkData.exists) {
                  showDuplicateWarning(checkData.url);
                  return;
              }
          } catch (error) {
              console.error('Error checking for duplicates:', error);
          }
          
          const formData = new FormData();
          formData.append('file', file);
          formData.append('checksum', checksum);
          
          try {
              progressContainer.style.display = 'block';
              
              const xhr = new XMLHttpRequest();
              
              xhr.upload.addEventListener('progress', function(e) {
                  if (e.lengthComputable) {
                      const percentComplete = (e.loaded / e.total) * 100;
                      updateProgress(percentComplete);
                  }
              });

              xhr.onload = function() {
                  if (xhr.status === 200) {
                      const response = JSON.parse(xhr.responseText);
                      showStatus(`File uploaded successfully! URL: ${response.url}`, 'success');
                      fileInput.value = '';
                  } else {
                      showStatus('Upload failed', 'error');
                  }
                  resetProgress();
              };

              xhr.onerror = function() {
                  showStatus('Upload failed', 'error');
                  resetProgress();
              };

              xhr.open('POST', '/upload', true);
              xhr.send(formData);

          } catch (error) {
              showStatus('An error occurred during upload', 'error');
              resetProgress();
          }
      });
  }

  async function calculateChecksum(file) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async function(e) {
              const buffer = e.target.result;
              const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
              resolve(hashHex);
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
      });
  }
  
  function updateProgress(percent) {
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${Math.round(percent)}%`;
  }
  
  function resetProgress() {
      setTimeout(() => {
          progressContainer.style.display = 'none';
          progressBar.style.width = '0%';
          progressText.textContent = '0%';
      }, 1000);
  }
  
  function showStatus(message, type) {
      uploadStatus.textContent = message;
      uploadStatus.className = type;
      
      setTimeout(() => {
          uploadStatus.textContent = '';
          uploadStatus.className = '';
      }, 5000);
  }

  function showDuplicateWarning(existingUrl) {
      duplicateWarning.innerHTML = `
          <div class="warning-content">
              <p>This file already exists in the CDN!</p>
              <p>Existing URL: <a href="${existingUrl}" target="_blank">${existingUrl}</a></p>
              <button onclick="document.getElementById('duplicateWarning').style.display='none'">Close</button>
          </div>
      `;
      duplicateWarning.style.display = 'block';
  }
});