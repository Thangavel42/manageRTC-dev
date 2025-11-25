// Utility functions for handling Bootstrap modals with fallbacks

export const showModal = (modalId: string) => {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`Modal with ID '${modalId}' not found`);
    return;
  }

  try {
    // Method 1: Try Bootstrap 5
    const bootstrap = (window as any).bootstrap;
    if (bootstrap && bootstrap.Modal) {
      const modalInstance = new bootstrap.Modal(modal);
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
    return;
  }

  try {
    // Method 1: Try Bootstrap 5
    const bootstrap = (window as any).bootstrap;
    if (bootstrap && bootstrap.Modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
        return;
      }
    }
    
    // Method 2: Try jQuery Bootstrap (if available)
    if ((window as any).$ && (window as any).$.fn.modal) {
      (window as any).$(modal).modal('hide');
      return;
    }
    
    // Method 3: Fallback - hide modal manually
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    // Remove backdrop
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
    
  } catch (error) {
    console.error('Error hiding modal:', error);
    // Fallback - just hide the modal element
    modal.style.display = 'none';
    modal.classList.remove('show');
  }
};
