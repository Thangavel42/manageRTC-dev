// Utility functions for handling Bootstrap modals with fallbacks

export const showModal = (modalId: string) => {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`Modal with ID '${modalId}' not found`);
    return;
  }

  try {
    // Method 1: Try Bootstrap 5 with getOrCreateInstance (recommended approach)
    const bootstrap = (window as any).bootstrap;
    if (bootstrap && bootstrap.Modal) {
      // Use getOrCreateInstance with proper configuration to prevent errors
      const modalInstance = bootstrap.Modal.getOrCreateInstance(modal, {
        backdrop: true,
        keyboard: true,
        focus: true
      });
      modalInstance.show();
      return;
    }
    
    // Method 2: Try jQuery Bootstrap (if available)
    if ((window as any).$ && (window as any).$.fn.modal) {
      (window as any).$(modal).modal('show');
      return;
    }
    
    // Method 3: Fallback - show modal manually
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'modal-backdrop';
    document.body.appendChild(backdrop);
    
  } catch (error) {
    console.error('Error showing modal:', error);
    // Fallback - just show the modal element
    modal.style.display = 'block';
    modal.classList.add('show');
  }
};

export const hideModal = (modalId: string) => {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`Modal with ID '${modalId}' not found`);
    cleanupModalBackdrops(); // Still cleanup even if modal not found
    return;
  }

  try {
    // Method 1: Try Bootstrap 5
    const bootstrap = (window as any).bootstrap;
    if (bootstrap && bootstrap.Modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }
      // Force cleanup immediately and again after animation
      setTimeout(() => cleanupModalBackdrops(), 100);
      setTimeout(() => cleanupModalBackdrops(), 400);
      return;
    }
    
    // Method 2: Try jQuery Bootstrap (if available)
    if ((window as any).$ && (window as any).$.fn.modal) {
      (window as any).$(modal).modal('hide');
      setTimeout(() => cleanupModalBackdrops(), 100);
      setTimeout(() => cleanupModalBackdrops(), 400);
      return;
    }
    
    // Method 3: Fallback - hide modal manually
    modal.style.display = 'none';
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    modal.removeAttribute('aria-modal');
    modal.removeAttribute('role');
    
    // Remove all backdrops immediately for manual close
    cleanupModalBackdrops();
    
  } catch (error) {
    console.error('Error hiding modal:', error);
    // Fallback - just hide the modal element and cleanup
    modal.style.display = 'none';
    modal.classList.remove('show');
    cleanupModalBackdrops();
  }
};

// Helper function to remove all modal backdrops
const cleanupModalBackdrops = () => {
  try {
    // Remove all modal-backdrop elements
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
      backdrop.remove();
    });
    
    // Also check for any backdrop by ID
    const backdropById = document.getElementById('modal-backdrop');
    if (backdropById) {
      backdropById.remove();
    }
    
    // Check for any lingering backdrops with different class combinations
    const fadeBackdrops = document.querySelectorAll('.fade.show[class*="backdrop"]');
    fadeBackdrops.forEach(backdrop => {
      backdrop.remove();
    });
    
    // Ensure body styles are cleaned up
    const openModals = document.querySelectorAll('.modal.show');
    if (openModals.length === 0) {
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  } catch (error) {
    console.error('Error cleaning up modal backdrops:', error);
  }
};

// Export cleanup function for manual use if needed
export { cleanupModalBackdrops };
