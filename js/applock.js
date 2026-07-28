/**
 * AppLock - Security PIN Lock Module for AetherTalk.
 * Default PIN: '0000'. Persisted in localStorage.
 */
class AppLock {
  constructor() {
    this.pin = localStorage.getItem('aethertalk_pin') || '0000';
    this.isLocked = localStorage.getItem('aethertalk_is_locked') === 'true';
    this.inputPin = '';
  }

  // Check if app should start locked
  init() {
    if (this.isLocked) {
      this.showLockScreen();
    }
  }

  lock() {
    this.isLocked = true;
    this.inputPin = '';
    localStorage.setItem('aethertalk_is_locked', 'true');
    this.showLockScreen();
  }

  unlock() {
    this.isLocked = false;
    this.inputPin = '';
    localStorage.setItem('aethertalk_is_locked', 'false');
    this.hideLockScreen();
  }

  showLockScreen() {
    const lockEl = document.getElementById('app-lock-screen');
    if (lockEl) {
      lockEl.classList.remove('hidden');
      this.updatePinDots();
    }
  }

  hideLockScreen() {
    const lockEl = document.getElementById('app-lock-screen');
    if (lockEl) {
      lockEl.classList.add('hidden');
    }
  }

  // Keypad button press (0-9)
  pressKey(digit) {
    if (this.inputPin.length < 4) {
      this.inputPin += digit;
      this.updatePinDots();

      if (this.inputPin.length === 4) {
        setTimeout(() => this.verifyPin(), 150);
      }
    }
  }

  clearKey() {
    this.inputPin = this.inputPin.slice(0, -1);
    this.updatePinDots();
  }

  updatePinDots() {
    for (let i = 1; i <= 4; i++) {
      const dot = document.getElementById(`pin-dot-${i}`);
      if (dot) {
        if (i <= this.inputPin.length) {
          dot.className = 'w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] scale-110 transition-all';
        } else {
          dot.className = 'w-4 h-4 rounded-full bg-slate-800 border border-slate-700 transition-all';
        }
      }
    }
  }

  verifyPin() {
    if (this.inputPin === this.pin) {
      if (window.uiController && window.uiController.showToast) {
        window.uiController.showToast('Security PIN verified', 'success', 2000);
      }
      this.unlock();
    } else {
      const lockBox = document.getElementById('pin-keypad-box');
      if (lockBox) {
        lockBox.classList.add('animate-shake');
        setTimeout(() => lockBox.classList.remove('animate-shake'), 500);
      }
      if (window.uiController && window.uiController.showToast) {
        window.uiController.showToast('Incorrect PIN (Default: 0000)', 'error', 2500);
      }
      this.inputPin = '';
      this.updatePinDots();
    }
  }

  // Change PIN in settings
  changePin(currentPin, newPin) {
    if (currentPin !== this.pin) {
      return { success: false, message: 'Current PIN is incorrect.' };
    }
    if (!/^\d{4}$/.test(newPin)) {
      return { success: false, message: 'New PIN must be exactly 4 digits.' };
    }
    this.pin = newPin;
    localStorage.setItem('aethertalk_pin', newPin);
    return { success: true, message: 'PIN updated successfully!' };
  }
}

window.appLock = new AppLock();
