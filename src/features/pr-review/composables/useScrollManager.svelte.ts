/**
 * Composable for managing scroll behavior and file navigation in PR review
 */
export function useScrollManager() {
  let mainContentElement = $state<HTMLDivElement | undefined>(undefined);
  let isScrollingFromNavigation = $state(false);
  let scrollTimeout: NodeJS.Timeout | null = null;

  // Function to scroll to a specific file and line
  function scrollToFileAndLine(filename: string, lineNumber: number, onToggleFile: (filename: string) => void) {
    if (!mainContentElement) return;

    isScrollingFromNavigation = true;

    // First scroll to the file
    const fileElement = mainContentElement.querySelector(`[data-filename="${filename}"]`);

    if (fileElement) {
      // Check if file needs to be expanded (you'd pass expanded state)
      scrollToSpecificLine(filename, lineNumber);
    }

    // Reset the navigation flag
    setTimeout(() => {
      isScrollingFromNavigation = false;
    }, 1000);
  }

  // Function to scroll to a specific file (without a specific line)
  function scrollToFile(filename: string) {
    if (!mainContentElement) return;

    isScrollingFromNavigation = true;

    // Find the file element and scroll to it
    const fileElement = mainContentElement.querySelector(`[data-filename="${filename}"]`);

    if (fileElement) {
      fileElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }

    // Reset the navigation flag
    setTimeout(() => {
      isScrollingFromNavigation = false;
    }, 500);
  }

  // Function to scroll to a specific line within a file
  function scrollToSpecificLine(filename: string, lineNumber: number) {
    if (!mainContentElement) return;

    // Look for the line number in the file's diff table using data attributes
    const fileElement = mainContentElement.querySelector(`[data-filename="${filename}"]`);
    if (!fileElement) return;

    // Look for a row with the matching line number in either old or new line data attributes
    const targetRow = fileElement.querySelector(`tr[data-line-new="${lineNumber}"], tr[data-line-old="${lineNumber}"]`);

    if (targetRow) {
      // Scroll to the line with some offset for better visibility
      targetRow.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });

      // Add a highlight effect
      targetRow.classList.add('bg-yellow-200', 'ring-2', 'ring-yellow-400', 'transition-all', 'duration-300');
      setTimeout(() => {
        targetRow.classList.remove('bg-yellow-200', 'ring-2', 'ring-yellow-400');
        // Keep transition classes for smooth removal
        setTimeout(() => {
          targetRow.classList.remove('transition-all', 'duration-300');
        }, 300);
      }, 2000);
    } else {
      // Fallback: just scroll to the file if specific line not found
      fileElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  }

  // Handle scroll with file auto-selection
  function handleScroll(onFileSelect: (filename: string) => void, selectedFile: string | null) {
    if (!mainContentElement || isScrollingFromNavigation) return;

    const scrollTop = mainContentElement.scrollTop;
    const containerHeight = mainContentElement.clientHeight;
    const viewportCenter = scrollTop + containerHeight / 2;

    const fileSections = mainContentElement.querySelectorAll('[data-filename]');
    let currentFile: string | null = null;
    let minDistance = Infinity;

    fileSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const containerRect = mainContentElement!.getBoundingClientRect();
      const sectionTop = rect.top - containerRect.top + scrollTop;
      const sectionHeight = rect.height;

      const distance = Math.abs(viewportCenter - sectionTop);

      if (distance < minDistance && sectionTop <= viewportCenter && sectionTop + sectionHeight >= viewportCenter - containerHeight / 3) {
        minDistance = distance;
        currentFile = section.getAttribute('data-filename');
      }
    });

    if (currentFile && currentFile !== selectedFile) {
      console.log('Scroll-based selection:', currentFile);
      onFileSelect(currentFile);
    }
  }

  // Throttled scroll handler
  function handleScrollThrottled(onFileSelect: (filename: string) => void, selectedFile: string | null) {
    if (scrollTimeout) return;

    scrollTimeout = setTimeout(() => {
      handleScroll(onFileSelect, selectedFile);
      scrollTimeout = null;
    }, 100); // Throttle to every 100ms
  }

  // Setup intersection observer for automatic file selection
  function setupIntersectionObserver(onFileSelect: (filename: string) => void, selectedFile: string | null) {
    if (!mainContentElement) return;

    const setupObserver = () => {
      const fileSections = mainContentElement!.querySelectorAll('[data-filename]');
      if (fileSections.length === 0) {
        // Files not rendered yet, try again after a short delay
        setTimeout(setupObserver, 100);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (isScrollingFromNavigation) {
            console.log('Skipping intersection update - scrolling from navigation');
            return;
          }

          // Filter to only entries that are intersecting
          const intersectingEntries = entries.filter((entry) => entry.isIntersecting);
          if (intersectingEntries.length === 0) return;

          // Find the entry with the highest intersection ratio
          let mostVisibleEntry = intersectingEntries[0];
          let maxIntersectionRatio = 0;

          for (const entry of intersectingEntries) {
            if (entry.intersectionRatio > maxIntersectionRatio) {
              maxIntersectionRatio = entry.intersectionRatio;
              mostVisibleEntry = entry;
            }
          }

          const filename = mostVisibleEntry.target.getAttribute('data-filename');
          if (filename && filename !== selectedFile) {
            console.log('Auto-selecting file:', filename, 'with ratio:', maxIntersectionRatio);
            onFileSelect(filename);
          }
        },
        {
          root: mainContentElement,
          rootMargin: '-10% 0px -80% 0px', // More permissive top margin
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], // More granular thresholds
        }
      );

      // Observe all file sections
      fileSections.forEach((section) => {
        observer.observe(section);
      });

      return observer;
    };

    return setupObserver();
  }

  return {
    mainContentElement: () => mainContentElement,
    setMainContentElement: (element: HTMLDivElement | undefined) => {
      mainContentElement = element;
    },
    scrollToFile,
    scrollToFileAndLine,
    handleScrollThrottled,
    setupIntersectionObserver,
    isScrollingFromNavigation: () => isScrollingFromNavigation
  };
}

export type ScrollManager = ReturnType<typeof useScrollManager>;