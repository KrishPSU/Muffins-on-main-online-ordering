const orderListWrapper = document.getElementById('orderListWrapper');
const topShadow = document.querySelector('.top-shadow');
const bottomShadow = document.querySelector('.bottom-shadow');

function updateShadows() {
  const { scrollTop, scrollHeight, clientHeight } = orderListWrapper;

  // Show top shadow if scrolled down even 1px
  topShadow.style.opacity = scrollTop > 0 ? '1' : '0';

  // Show bottom shadow if not at the bottom (with rounding fix)
  const atBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;
  bottomShadow.style.opacity = !atBottom ? '1' : '0';
}

orderListWrapper.addEventListener('scroll', updateShadows);
window.addEventListener('resize', updateShadows);
document.addEventListener('DOMContentLoaded', updateShadows);






const itemsList = document.querySelector('#cart-items');
const orderDetails = document.querySelector('#order-details');
const drawer_content = document.querySelector('.order_drawer_content');
const backToItemsList = document.querySelector('#back-to-items-list');


goToOrderDetailsBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    showCustomAlert('Your cart is empty. Please add items to your cart before proceeding.', "error");
    return;
  }

  drawer_content.style.transform = 'translateX(-340px)'; // slide to 2nd element
});


backToItemsList.addEventListener('click', (e) => {
  e.preventDefault();
  drawer_content.style.transform = 'translateX(0)'; // slide back to 1st element
});




// const termsOfServiceLink = document.getElementById('terms-of-service');
// const privacyPolicyLink = document.getElementById('privacy-policy');
// const acceptTermsCheckbox = document.getElementById('accept-terms-and-conditions');

// termsOfServiceLink.addEventListener('click', (e) => {
//   e.preventDefault();
//   window.open(`${window.location.origin}/terms-of-service.html`, '_blank');
// });
// privacyPolicyLink.addEventListener('click', (e) => {  
//   e.preventDefault();
//   window.open(`${window.location.origin}/privacy-policy.html`, '_blank');
// });

// acceptTermsCheckbox.addEventListener('change', () => {
//   submitOrderBtn.disabled = !acceptTermsCheckbox.checked;
// });
// submitOrderBtn.disabled = !acceptTermsCheckbox.checked; // Disable initially if not checked