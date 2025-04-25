export const downloadFiles = (urls: string[]) => {
  if (urls.length === 0) {
    return;
  }

  if (urls.length === 1) {
    // Single file - download directly
    const link = document.createElement('a');
    link.href = urls[0];
    // Extract filename from URL if possible
    const filename = urls[0].split('/').pop() || 'download';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Multiple files - use iframe
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  // Download each file in sequence
  const downloadNext = (index: number) => {
    if (index >= urls.length) {
      // All downloads complete, remove iframe
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
      return;
    }

    const link = document.createElement('a');
    link.href = urls[index];
    // Extract filename from URL if possible
    const filename = urls[index].split('/').pop() || 'download';
    link.download = filename;
    iframe.contentDocument?.body.appendChild(link);
    link.click();
    iframe.contentDocument?.body.removeChild(link);

    // Wait a bit before next download
    setTimeout(() => {
      downloadNext(index + 1);
    }, 500);
  };

  downloadNext(0);
}; 