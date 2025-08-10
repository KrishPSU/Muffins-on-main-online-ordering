
document.querySelector('.order-number').innerText = `Order #${atob(window.location.pathname.split('/order_confirmed/').join('').replace('/', ''))}`;


(function() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  function isInStandaloneMode() {
    return (window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone === true);
  }

  // Only show if user is on iOS Safari or Android Chrome and not already installed
  if ((isIos && isSafari && !isInStandaloneMode()) || (isAndroid && !isInStandaloneMode())) {
    const popup = document.getElementById('MoM-pwa-popup');
    popup.style.display = 'block';
    setTimeout(() => popup.classList.add('active'), 100);

    document.getElementById('MoM-pwa-close').onclick = closeMoMPwaPopup;
  }
})();


function closeMoMPwaPopup() {
  const popup = document.getElementById('MoM-pwa-popup');
  popup.classList.remove('active');
  localStorage.setItem('hideMoMPwaPopup', '1');
  setTimeout(() => popup.style.display = 'none', 350);
}