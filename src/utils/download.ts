export const navigate = (url: string) => {
  window.location.href = url;
};

export const downloadFiles = async (urls: string[], nav: (url: string) => void = navigate) => {
  if (urls.length === 0) return;
  
  if (urls.length === 1) {
    nav(urls[0]);
    return;
  }

  // For multiple files, download sequentially with delay
  const downloadWithDelay = async (url: string, index: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        // Remove iframe after a delay to ensure download starts
        setTimeout(() => {
          document.body.removeChild(iframe);
          resolve();
        }, 1000);
      }, index * 1000); // 1 second delay between downloads
    });
  };

  // Download files sequentially
  for (let i = 0; i < urls.length; i++) {
    await downloadWithDelay(urls[i], i);
  }
}; 