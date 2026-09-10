// ===== Fingerprint Authentication Demo =====

const steps = [
  document.getElementById('step1'),
  document.getElementById('step2'),
  document.getElementById('step3'),
  document.getElementById('step4')
];

const scanner = document.getElementById('scanner');
const scannerHint = document.getElementById('scannerHint');
const demoContainer = document.querySelector('.demo-container');
const tokenDemo = document.querySelector('.token-demo');
const statusPanel = document.querySelector('.status-panel');

let isProcessing = false;

function resetSteps() {
  steps.forEach(s => {
    s.classList.remove('active', 'done');
    s.querySelector('.step-text').style.color = '';
  });
}

function setActiveStep(index) {
  steps.forEach((s, i) => {
    if (i < index) {
      s.classList.add('done');
      s.classList.remove('active');
    } else if (i === index) {
      s.classList.add('active');
      s.classList.remove('done');
    } else {
      s.classList.remove('active', 'done');
    }
  });
}

function scanFingerprint() {
  if (isProcessing) return;
  isProcessing = true;

  resetSteps();
  tokenDemo.parentElement.classList.remove('error', 'success');
  tokenDemo.parentElement.classList.add('scanning');

  // Step 1: Waiting for fingerprint
  setActiveStep(0);
  scannerHint.textContent = 'Сканирование отпечатка...';

  setTimeout(() => {
    // Step 2: Verifying biometric data
    setActiveStep(1);
    scannerHint.textContent = 'Проверка биометрии...';

    setTimeout(() => {
      // Step 3: Unlocking private key
      setActiveStep(2);
      scannerHint.textContent = 'Разблокировка ключа...';

      setTimeout(() => {
        // Step 4: Authentication successful
        setActiveStep(3);
        tokenDemo.parentElement.classList.remove('scanning');
        tokenDemo.parentElement.classList.add('success');
        scannerHint.textContent = '✅ Доступ разрешён!';
        isProcessing = false;

        // Auto reset after 5 seconds
        setTimeout(() => {
          resetSteps();
          scannerHint.textContent = 'Нажмите на сенсор';
          tokenDemo.parentElement.classList.remove('success');
        }, 5000);
      }, 800);
    }, 800);
  }, 800);
}

// ===== Smooth scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== Console greeting =====
console.log('%c🔬 Рутокен Био', 'font-size: 20px; font-weight: bold; color: #00d4ff;');
console.log('%cДемонстрационная страница биометрического USB-токена', 'color: #94a3b8;');
